mod config;
mod health;
mod history;

use config::{load_config, save_config, AppConfig};
use health::{check_all, overall_status, ServerStatus};
use history::{open as open_history_db, CheckRecord, DashboardStats, HistoryDb, Incident, LatencyPoint};
use std::collections::HashMap;
use std::sync::Mutex;
use chrono::Timelike;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, State,
};
use tauri_plugin_notification::NotificationExt;

struct AppState {
    db: HistoryDb,
    prev_status: Mutex<HashMap<String, String>>,
    last_notify: Mutex<HashMap<String, i64>>,
}

fn db_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("history.db"))
}

fn in_quiet_hours(settings: &config::AppSettings) -> bool {
    let (Some(start), Some(end)) = (settings.quiet_hours_start, settings.quiet_hours_end) else {
        return false;
    };
    let hour = chrono::Local::now().hour() as u8;
    if start <= end {
        hour >= start && hour < end
    } else {
        hour >= start || hour < end
    }
}

fn send_notification(app: &AppHandle, title: &str, body: &str) {
    let _ = app
        .notification()
        .builder()
        .title(title)
        .body(body)
        .show();
}

fn post_webhook(url: &str, title: &str, body: &str) {
    let payload = serde_json::json!({ "title": title, "body": body });
    std::thread::spawn({
        let url = url.to_string();
        move || {
            let _ = ureq::post(&url).send_json(payload);
        }
    });
}

fn update_tray_title(app: &AppHandle, statuses: &[ServerStatus]) {
    let tray = match app.tray_by_id("main") {
        Some(t) => t,
        None => return,
    };
    let offline = statuses
        .iter()
        .filter(|s| overall_status(s) == "offline" && !s.maintenance_mode)
        .count();
    let degraded = statuses
        .iter()
        .filter(|s| overall_status(s) == "degraded")
        .count();
    let title = if offline > 0 {
        format!("ApparitionLabs — {} down", offline)
    } else if degraded > 0 {
        format!("ApparitionLabs — {} degraded", degraded)
    } else {
        "ApparitionLabs — All online".to_string()
    };
    let _ = tray.set_tooltip(Some(&title));
}

#[tauri::command]
fn get_config(app: AppHandle) -> Result<AppConfig, String> {
    load_config(&app)
}

#[tauri::command]
fn save_app_config(app: AppHandle, config: AppConfig) -> Result<(), String> {
    save_config(&app, &config)
}

#[tauri::command]
fn export_config(app: AppHandle) -> Result<String, String> {
    let config = load_config(&app)?;
    serde_json::to_string_pretty(&config).map_err(|e| e.to_string())
}

#[tauri::command]
fn import_config(app: AppHandle, json: String, merge: bool) -> Result<AppConfig, String> {
    let imported: AppConfig = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    if merge {
        let mut current = load_config(&app)?;
        for server in imported.servers {
            if let Some(idx) = current.servers.iter().position(|s| s.id == server.id) {
                current.servers[idx] = server;
            } else {
                current.servers.push(server);
            }
        }
        for link in imported.access_links {
            if let Some(idx) = current.access_links.iter().position(|l| l.id == link.id) {
                current.access_links[idx] = link;
            } else {
                current.access_links.push(link);
            }
        }
        save_config(&app, &current)?;
        Ok(current)
    } else {
        save_config(&app, &imported)?;
        Ok(imported)
    }
}

#[tauri::command]
async fn check_server_status(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Vec<ServerStatus>, String> {
    let config = load_config(&app)?;
    let settings = config.settings.clone();
    let servers = config.servers.clone();

    let results = tauri::async_runtime::spawn_blocking({
        let servers = servers.clone();
        let tcp = settings.tcp_timeout_secs;
        let warn = settings.latency_warning_ms;
        move || check_all(&servers, tcp, warn)
    })
    .await
    .map_err(|e| e.to_string())?;

    let now = chrono::Utc::now().timestamp();
    let records: Vec<CheckRecord> = results
        .iter()
        .map(|s| CheckRecord {
            server_id: s.id.clone(),
            timestamp: now,
            layer1: s.layer1.clone(),
            layer2: s.layer2.clone(),
            layer3: s.layer3.clone(),
            latency_ms: s.latency,
            overall: overall_status(s).to_string(),
        })
        .collect();

    state.db.record_checks(&records)?;
    let _ = state.db.prune_old(settings.history_retention_days);

    let mut prev = state.prev_status.lock().map_err(|e| e.to_string())?;
    let mut last_notify = state.last_notify.lock().map_err(|e| e.to_string())?;
    let quiet = in_quiet_hours(&settings);

    for s in &results {
        let current = overall_status(s);
        let previous = prev.get(&s.id).map(|s| s.as_str());
        let cause = s.failure_reason.clone().unwrap_or_else(|| "Unknown".into());

        state.db.handle_status_transition(
            &s.id,
            &s.name,
            previous,
            current,
            &cause,
        )?;

        if !s.maintenance_mode && settings.notifications_enabled && !quiet {
            let should_notify = match (previous, current) {
                (Some("online") | Some("degraded"), "offline") => true,
                (Some("offline"), "online" | "degraded") => settings.notify_on_recovery,
                _ => false,
            };

            if should_notify {
                let last = last_notify.get(&s.id).copied().unwrap_or(0);
                if now - last >= settings.notify_cooldown_secs as i64 {
                    let title = format!("{} — {}", s.name, current.to_uppercase());
                    let body = cause.clone();
                    send_notification(&app, &title, &body);
                    if let Some(ref url) = settings.webhook_url {
                        post_webhook(url, &title, &body);
                    }
                    last_notify.insert(s.id.clone(), now);
                }
            }
        }

        prev.insert(s.id.clone(), current.to_string());
    }

    update_tray_title(&app, &results);
    Ok(results)
}

#[tauri::command]
fn get_latency_history(
    state: State<'_, AppState>,
    server_id: String,
    hours: u32,
) -> Result<Vec<LatencyPoint>, String> {
    state.db.get_latency_history(&server_id, hours)
}

#[tauri::command]
fn get_incidents(state: State<'_, AppState>, limit: u32) -> Result<Vec<Incident>, String> {
    state.db.get_incidents(limit)
}

#[tauri::command]
fn get_server_uptime(
    state: State<'_, AppState>,
    server_id: String,
    hours: u32,
) -> Result<f64, String> {
    state.db.get_uptime_percent(&server_id, hours)
}

#[tauri::command]
fn get_dashboard_stats(
    state: State<'_, AppState>,
    statuses: Vec<ServerStatus>,
) -> Result<DashboardStats, String> {
    let mut stats = DashboardStats {
        total: statuses.len() as u32,
        online: 0,
        degraded: 0,
        offline: 0,
        maintenance: 0,
        avg_latency_ms: 0,
        incidents_today: state.db.incidents_today_count()?,
    };

    let mut latency_sum = 0u64;
    for s in &statuses {
        match overall_status(s) {
            "maintenance" => stats.maintenance += 1,
            "offline" => stats.offline += 1,
            "degraded" => stats.degraded += 1,
            _ => stats.online += 1,
        }
        latency_sum += s.latency;
    }
    if !statuses.is_empty() {
        stats.avg_latency_ms = latency_sum / statuses.len() as u64;
    }
    Ok(stats)
}

#[tauri::command]
async fn open_url(app: AppHandle, url: String) -> Result<(), String> {
    use tauri_plugin_shell::ShellExt;
    app.shell().open(url, None).map_err(|e| e.to_string())
}

fn setup_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let show = MenuItem::with_id(app, "show", "Show ApparitionLabs", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &quit])?;

    let _tray = TrayIconBuilder::with_id("main")
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .tooltip("ApparitionLabs — Loading…")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { .. } = event {
                let app = tray.app_handle();
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let db = open_history_db(db_path(&app.handle())?)?;
            app.manage(AppState {
                db,
                prev_status: Mutex::new(HashMap::new()),
                last_notify: Mutex::new(HashMap::new()),
            });
            setup_tray(&app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_config,
            save_app_config,
            export_config,
            import_config,
            check_server_status,
            get_latency_history,
            get_incidents,
            get_server_uptime,
            get_dashboard_stats,
            open_url,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
