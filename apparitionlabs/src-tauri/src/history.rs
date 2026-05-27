use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;

pub struct HistoryDb(pub Mutex<Connection>);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckRecord {
    pub server_id: String,
    pub timestamp: i64,
    pub layer1: String,
    pub layer2: String,
    pub layer3: String,
    pub latency_ms: u64,
    pub overall: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LatencyPoint {
    pub timestamp: i64,
    pub latency_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Incident {
    pub id: i64,
    pub server_id: String,
    pub server_name: String,
    pub started_at: i64,
    pub ended_at: Option<i64>,
    pub cause: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardStats {
    pub total: u32,
    pub online: u32,
    pub degraded: u32,
    pub offline: u32,
    pub maintenance: u32,
    pub avg_latency_ms: u64,
    pub incidents_today: u32,
}

pub fn open(db_path: PathBuf) -> Result<HistoryDb, String> {
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS check_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            server_id TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            layer1 TEXT NOT NULL,
            layer2 TEXT NOT NULL,
            layer3 TEXT NOT NULL,
            latency_ms INTEGER NOT NULL,
            overall TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_check_server_time ON check_results(server_id, timestamp);
        CREATE TABLE IF NOT EXISTS incidents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            server_id TEXT NOT NULL,
            server_name TEXT NOT NULL,
            started_at INTEGER NOT NULL,
            ended_at INTEGER,
            cause TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_incidents_server ON incidents(server_id);
        ",
    )
    .map_err(|e| e.to_string())?;
    Ok(HistoryDb(Mutex::new(conn)))
}

impl HistoryDb {
    pub fn record_checks(&self, records: &[CheckRecord]) -> Result<(), String> {
        let conn = self.0.lock().map_err(|e| e.to_string())?;
        for r in records {
            conn.execute(
                "INSERT INTO check_results (server_id, timestamp, layer1, layer2, layer3, latency_ms, overall)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    r.server_id,
                    r.timestamp,
                    r.layer1,
                    r.layer2,
                    r.layer3,
                    r.latency_ms,
                    r.overall
                ],
            )
            .map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    //noinspection Annotator
    //noinspection Annotator
    pub fn get_latency_history(
        &self,
        server_id: &str,
        hours: u32,
    ) -> Result<Vec<LatencyPoint>, String> {
        let since = chrono::Utc::now().timestamp() - (hours as i64 * 3600);
        let conn = self.0.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                "SELECT timestamp, latency_ms FROM check_results
                 WHERE server_id = ?1 AND timestamp >= ?2
                 ORDER BY timestamp ASC LIMIT 120",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![server_id, since], |row| {
                Ok(LatencyPoint {
                    timestamp: row.get(0)?,
                    latency_ms: row.get(1)?,
                })
            })
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    }

    //noinspection Annotator
    //noinspection Annotator
    pub fn get_incidents(&self, limit: u32) -> Result<Vec<Incident>, String> {
        let conn = self.0.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                "SELECT id, server_id, server_name, started_at, ended_at, cause
                 FROM incidents ORDER BY started_at DESC LIMIT ?1",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![limit], |row| {
                Ok(Incident {
                    id: row.get(0)?,
                    server_id: row.get(1)?,
                    server_name: row.get(2)?,
                    started_at: row.get(3)?,
                    ended_at: row.get(4)?,
                    cause: row.get(5)?,
                })
            })
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    }

    pub fn get_uptime_percent(&self, server_id: &str, hours: u32) -> Result<f64, String> {
        let since = chrono::Utc::now().timestamp() - (hours as i64 * 3600);
        let conn = self.0.lock().map_err(|e| e.to_string())?;
        let total: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM check_results WHERE server_id = ?1 AND timestamp >= ?2",
                params![server_id, since],
                |r| r.get(0),
            )
            .map_err(|e| e.to_string())?;
        if total == 0 {
            return Ok(100.0);
        }
        let good: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM check_results WHERE server_id = ?1 AND timestamp >= ?2 AND overall IN ('online', 'degraded')",
                params![server_id, since],
                |r| r.get(0),
            )
            .map_err(|e| e.to_string())?;
        Ok((good as f64 / total as f64) * 100.0)
    }

    pub fn incidents_today_count(&self) -> Result<u32, String> {
        let start_of_day = chrono::Utc::now()
            .date_naive()
            .and_hms_opt(0, 0, 0)
            .unwrap()
            .and_utc()
            .timestamp();
        let conn = self.0.lock().map_err(|e| e.to_string())?;
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM incidents WHERE started_at >= ?1",
                params![start_of_day],
                |r| r.get(0),
            )
            .map_err(|e| e.to_string())?;
        Ok(count as u32)
    }

    pub fn prune_old(&self, retention_days: u32) -> Result<(), String> {
        let cutoff = chrono::Utc::now().timestamp() - (retention_days as i64 * 86400);
        let conn = self.0.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "DELETE FROM check_results WHERE timestamp < ?1",
            params![cutoff],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn handle_status_transition(
        &self,
        server_id: &str,
        server_name: &str,
        prev: Option<&str>,
        current: &str,
        cause: &str,
    ) -> Result<(), String> {
        let conn = self.0.lock().map_err(|e| e.to_string())?;
        let now = chrono::Utc::now().timestamp();

        if current == "offline" {
            if prev != Some("offline") {
                conn.execute(
                    "INSERT INTO incidents (server_id, server_name, started_at, ended_at, cause)
                     VALUES (?1, ?2, ?3, NULL, ?4)",
                    params![server_id, server_name, now, cause],
                )
                .map_err(|e| e.to_string())?;
            }
        } else if prev == Some("offline") {
            conn.execute(
                "UPDATE incidents SET ended_at = ?1
                 WHERE id = (SELECT id FROM incidents 
                            WHERE server_id = ?2 AND ended_at IS NULL 
                            ORDER BY started_at DESC LIMIT 1)",
                params![now, server_id],
            )
            .map_err(|e| e.to_string())?;
        }
        Ok(())
    }
}
