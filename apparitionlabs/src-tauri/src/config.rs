use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitorTarget {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    #[serde(rename = "type")]
    pub server_type: String,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default = "default_true")]
    pub enabled: bool,
    pub public_url: Option<String>,
    pub local_url: Option<String>,
    pub ssh_host: Option<String>,
    pub tunnel_port: Option<u16>,
    pub latency_warning_ms: Option<u64>,
    #[serde(default = "default_check_type")]
    pub check_type: String,
    pub edge: Option<String>,
    #[serde(default)]
    pub services: Vec<String>,
    #[serde(default)]
    pub notes: String,
    #[serde(default)]
    pub maintenance_mode: bool,
    #[serde(default)]
    pub sort_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessLink {
    pub id: String,
    pub name: String,
    pub description: String,
    pub url: String,
    pub icon: String,
    pub category: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    #[serde(default = "default_refresh")]
    pub refresh_interval_ms: u64,
    #[serde(default = "default_tcp_timeout")]
    pub tcp_timeout_secs: u64,
    #[serde(default = "default_latency_warning")]
    pub latency_warning_ms: u64,
    #[serde(default = "default_true")]
    pub notifications_enabled: bool,
    #[serde(default = "default_true")]
    pub notify_on_recovery: bool,
    #[serde(default = "default_notify_cooldown")]
    pub notify_cooldown_secs: u64,
    pub webhook_url: Option<String>,
    #[serde(default = "default_history_days")]
    pub history_retention_days: u32,
    #[serde(default)]
    pub quiet_hours_start: Option<u8>,
    #[serde(default)]
    pub quiet_hours_end: Option<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub version: u32,
    pub servers: Vec<MonitorTarget>,
    pub access_links: Vec<AccessLink>,
    pub settings: AppSettings,
}

fn default_true() -> bool {
    true
}
fn default_check_type() -> String {
    "tcp".to_string()
}
fn default_refresh() -> u64 {
    5000
}
fn default_tcp_timeout() -> u64 {
    2
}
fn default_latency_warning() -> u64 {
    100
}
fn default_notify_cooldown() -> u64 {
    300
}
fn default_history_days() -> u32 {
    30
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            refresh_interval_ms: default_refresh(),
            tcp_timeout_secs: default_tcp_timeout(),
            latency_warning_ms: default_latency_warning(),
            notifications_enabled: true,
            notify_on_recovery: true,
            notify_cooldown_secs: default_notify_cooldown(),
            webhook_url: None,
            history_retention_days: default_history_days(),
            quiet_hours_start: None,
            quiet_hours_end: None,
        }
    }
}

pub fn default_config() -> AppConfig {
    AppConfig {
        version: 1,
        servers: vec![
            MonitorTarget {
                id: "srv-proxmox-1".into(),
                name: "Proxmox 1".into(),
                host: "192.168.8.154".into(),
                port: 8006,
                server_type: "proxmox".into(),
                tags: vec!["homelab".into(), "compute".into()],
                enabled: true,
                public_url: None,
                local_url: Some("https://192.168.8.154:8006".into()),
                ssh_host: Some("192.168.8.154".into()),
                tunnel_port: Some(443),
                latency_warning_ms: None,
                check_type: "tcp".into(),
                edge: Some("SYD".into()),
                services: vec!["API".into(), "SSH".into()],
                notes: String::new(),
                maintenance_mode: false,
                sort_order: 0,
            },
            MonitorTarget {
                id: "srv-proxmox-2".into(),
                name: "Proxmox 2".into(),
                host: "192.168.8.153".into(),
                port: 8006,
                server_type: "proxmox".into(),
                tags: vec!["homelab".into(), "compute".into()],
                enabled: true,
                public_url: None,
                local_url: Some("https://192.168.8.153:8006".into()),
                ssh_host: Some("192.168.8.153".into()),
                tunnel_port: Some(443),
                latency_warning_ms: None,
                check_type: "tcp".into(),
                edge: Some("SYD".into()),
                services: vec!["API".into(), "SSH".into()],
                notes: String::new(),
                maintenance_mode: false,
                sort_order: 1,
            },
            MonitorTarget {
                id: "srv-truenas".into(),
                name: "TrueNAS".into(),
                host: "192.168.8.236".into(),
                port: 443,
                server_type: "nas".into(),
                tags: vec!["homelab".into(), "storage".into()],
                enabled: true,
                public_url: None,
                local_url: Some("https://192.168.8.236".into()),
                ssh_host: Some("192.168.8.236".into()),
                tunnel_port: Some(443),
                latency_warning_ms: None,
                check_type: "https".into(),
                edge: Some("SYD".into()),
                services: vec!["SMB".into(), "API".into()],
                notes: String::new(),
                maintenance_mode: false,
                sort_order: 2,
            },
            MonitorTarget {
                id: "srv-n8n".into(),
                name: "n8n".into(),
                host: "192.168.8.236".into(),
                port: 30109,
                server_type: "service".into(),
                tags: vec!["homelab".into(), "automation".into()],
                enabled: true,
                public_url: None,
                local_url: Some("http://192.168.8.236:30109".into()),
                ssh_host: None,
                tunnel_port: Some(443),
                latency_warning_ms: None,
                check_type: "http".into(),
                edge: Some("SYD".into()),
                services: vec!["Workflows".into(), "API".into()],
                notes: String::new(),
                maintenance_mode: false,
                sort_order: 3,
            },
        ],
        access_links: vec![
            AccessLink {
                id: "acc-cloudflare".into(),
                name: "Cloudflare Dashboard".into(),
                description: "Global DNS & Edge Management".into(),
                url: "https://dash.cloudflare.com".into(),
                icon: "cloud".into(),
                category: "cloudflare".into(),
            },
            AccessLink {
                id: "acc-zero-trust".into(),
                name: "Cloudflare Zero Trust".into(),
                description: "Tunnel & Access Control".into(),
                url: "https://one.dash.cloudflare.com".into(),
                icon: "shield".into(),
                category: "cloudflare".into(),
            },
            AccessLink {
                id: "acc-twingate".into(),
                name: "Twingate".into(),
                description: "Remote Infrastructure Access".into(),
                url: "https://apparitioncreatives.twingate.com".into(),
                icon: "network".into(),
                category: "vpn".into(),
            },
            AccessLink {
                id: "acc-tailscale".into(),
                name: "Tailscale".into(),
                description: "Mesh Network Management".into(),
                url: "https://login.tailscale.com/admin/machines".into(),
                icon: "globe".into(),
                category: "vpn".into(),
            },
        ],
        settings: AppSettings::default(),
    }
}

pub fn config_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("config.json"))
}

pub fn load_config(app: &tauri::AppHandle) -> Result<AppConfig, String> {
    let path = config_path(app)?;
    if !path.exists() {
        let config = default_config();
        save_config_to_path(&path, &config)?;
        return Ok(config);
    }
    let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let mut config: AppConfig = serde_json::from_str(&raw).map_err(|e| e.to_string())?;
    if config.servers.is_empty() {
        config = default_config();
        save_config_to_path(&path, &config)?;
    }
    Ok(config)
}

pub fn save_config(app: &tauri::AppHandle, config: &AppConfig) -> Result<(), String> {
    let path = config_path(app)?;
    save_config_to_path(&path, config)
}

fn save_config_to_path(path: &PathBuf, config: &AppConfig) -> Result<(), String> {
    let raw = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(path, raw).map_err(|e| e.to_string())
}
