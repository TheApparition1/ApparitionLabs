use crate::config::MonitorTarget;
use serde::{Deserialize, Serialize};
use std::net::{TcpStream, ToSocketAddrs};
use std::thread;
use std::time::{Duration, Instant};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerStatus {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub server_type: String,
    pub layer1: String,
    pub layer2: String,
    pub layer3: String,
    pub latency: u64,
    pub layer1_label: String,
    pub failure_reason: Option<String>,
    pub edge: Option<String>,
    pub services: Vec<String>,
    pub public_url: Option<String>,
    pub local_url: Option<String>,
    pub ssh_host: Option<String>,
    pub tags: Vec<String>,
    pub maintenance_mode: bool,
    pub notes: String,
}

pub fn check_all(
    servers: &[MonitorTarget],
    tcp_timeout_secs: u64,
    latency_warning_ms: u64,
) -> Vec<ServerStatus> {
    let timeout = Duration::from_secs(tcp_timeout_secs.max(1));
    let handles: Vec<_> = servers
        .iter()
        .filter(|s| s.enabled)
        .map(|server| {
            let server = server.clone();
            thread::spawn(move || check_one(&server, timeout, latency_warning_ms))
        })
        .collect();

    handles
        .into_iter()
        .filter_map(|h| h.join().ok())
        .collect()
}

fn check_one(
    server: &MonitorTarget,
    timeout: Duration,
    default_latency_warning: u64,
) -> ServerStatus {
    let warn_ms = server.latency_warning_ms.unwrap_or(default_latency_warning);
    let tunnel_port = server.tunnel_port.unwrap_or(443);

    let (layer1, layer1_label, l1_latency) = check_public(&server.public_url, timeout);
    // Only check tunnel/access port when a public URL is configured (tunnel path exists).
    let (layer2, l2_latency) = if server.public_url.is_some() {
        check_tcp(&server.host, tunnel_port, timeout)
    } else {
        ("skipped".to_string(), 0)
    };
    let (layer3, l3_latency) =
        check_service(server, timeout, warn_ms);

    let latency = [l1_latency, l2_latency, l3_latency]
        .into_iter()
        .max()
        .unwrap_or(0);

    let failure_reason = failure_message(&layer1, &layer2, &layer3, &layer1_label);

    ServerStatus {
        id: server.id.clone(),
        name: server.name.clone(),
        server_type: server.server_type.clone(),
        layer1,
        layer2,
        layer3,
        latency,
        layer1_label,
        failure_reason,
        edge: server.edge.clone(),
        services: server.services.clone(),
        public_url: server.public_url.clone(),
        local_url: server.local_url.clone(),
        ssh_host: server.ssh_host.clone(),
        tags: server.tags.clone(),
        maintenance_mode: server.maintenance_mode,
        notes: server.notes.clone(),
    }
}

fn failure_message(
    layer1: &str,
    layer2: &str,
    layer3: &str,
    layer1_label: &str,
) -> Option<String> {
    if layer3 == "down" {
        return Some("Service port unreachable".into());
    }
    if layer3 == "degraded" {
        return Some("Service responding slowly".into());
    }
    if layer2 == "down" {
        return Some("Tunnel / access port unreachable".into());
    }
    if layer2 == "degraded" {
        return Some("Tunnel / access degraded".into());
    }
    if layer1 == "down" {
        return Some(format!("{} unreachable", layer1_label));
    }
    None
}

fn check_public(url: &Option<String>, timeout: Duration) -> (String, String, u64) {
    match url {
        None => ("skipped".into(), "Public URL".into(), 0),
        Some(u) => {
            let (status, ms) = check_http_url(u, timeout);
            (status, "Public Reachability".into(), ms)
        }
    }
}

fn check_service(
    server: &MonitorTarget,
    timeout: Duration,
    warn_ms: u64,
) -> (String, u64) {
    match server.check_type.as_str() {
        "http" | "https" => {
            let url = format!(
                "{}://{}:{}",
                server.check_type,
                server.host,
                server.port
            );
            let (status, ms) = check_http_url(&url, timeout);
            (degrade_if_slow(status, ms, warn_ms), ms)
        }
        _ => {
            let (status, ms) = check_tcp(&server.host, server.port, timeout);
            (degrade_if_slow(status, ms, warn_ms), ms)
        }
    }
}

fn degrade_if_slow(status: String, ms: u64, warn_ms: u64) -> String {
    if status == "ok" && ms > warn_ms {
        "degraded".into()
    } else {
        status
    }
}

fn check_tcp(host: &str, port: u16, timeout: Duration) -> (String, u64) {
    let addr = format!("{}:{}", host, port);
    let start = Instant::now();
    match addr.to_socket_addrs() {
        Ok(mut addrs) => {
            if let Some(addr) = addrs.next() {
                match TcpStream::connect_timeout(&addr, timeout) {
                    Ok(_) => ("ok".into(), start.elapsed().as_millis() as u64),
                    Err(_) => ("down".into(), 0),
                }
            } else {
                ("down".into(), 0)
            }
        }
        Err(_) => ("down".into(), 0),
    }
}

fn check_http_url(url: &str, timeout: Duration) -> (String, u64) {
    let start = Instant::now();
    let agent = ureq::AgentBuilder::new().timeout_connect(timeout).timeout_read(timeout).build();
    match agent.get(url).call() {
        Ok(resp) => {
            let ms = start.elapsed().as_millis() as u64;
            let code = resp.status();
            if code >= 500 {
                ("degraded".into(), ms)
            } else {
                ("ok".into(), ms)
            }
        }
        Err(_) => ("down".into(), 0),
    }
}

pub fn overall_status(s: &ServerStatus) -> &'static str {
    if s.maintenance_mode {
        return "maintenance";
    }
    if s.layer3 == "down" || s.layer1 == "down" {
        return "offline";
    }
    if s.layer2 == "down" {
        return "offline";
    }
    if s.layer2 == "degraded" || s.layer3 == "degraded" || s.layer1 == "degraded" {
        return "degraded";
    }
    "online"
}
