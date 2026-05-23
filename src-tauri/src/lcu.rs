use sysinfo::{ProcessRefreshKind, ProcessesToUpdate, System};
use std::fs;
use std::path::PathBuf;
use base64::{Engine as _, engine::general_purpose};
use serde::{Deserialize, Serialize};
use std::sync::{Mutex, OnceLock};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LcuInfo {
    pub port: String,
    pub token: String,
}

/// Reuse a single System instance across calls — avoids allocating a new one every 2 seconds.
static SYS: OnceLock<Mutex<System>> = OnceLock::new();

fn get_system() -> &'static Mutex<System> {
    SYS.get_or_init(|| Mutex::new(System::new()))
}

pub fn find_lcu_info() -> Option<LcuInfo> {
    // Hold the lock only while refreshing sysinfo — release before any file I/O.
    let exe_path: Option<PathBuf> = {
        let mut sys = get_system().lock().unwrap_or_else(|e| e.into_inner());
        sys.refresh_processes_specifics(
            ProcessesToUpdate::All,
            true,
            ProcessRefreshKind::default().with_exe(sysinfo::UpdateKind::Always),
        );
        sys.processes().values().find(|p| {
            let name = p.name().to_string_lossy().to_lowercase();
            matches!(name.as_str(), "leagueclientux.exe" | "leagueclient.exe" | "leagueclientux" | "leagueclient")
        }).and_then(|p| p.exe().map(|e| e.to_path_buf()))
    }; // MutexGuard dropped here

    if let Some(exe) = exe_path {
        if let Some(install_dir) = exe.parent() {
            if let Some(info) = read_lockfile(&install_dir.join("lockfile")) {
                return Some(info);
            }
        }
    }

    // Fallback: common install paths
    let mut fallbacks = vec![
        PathBuf::from("C:\\Riot Games\\League of Legends\\lockfile"),
        PathBuf::from("/Applications/League of Legends.app/Contents/LoL/lockfile"),
    ];
    if let Ok(home) = std::env::var("HOME") {
        fallbacks.push(PathBuf::from(format!(
            "{}/Applications/League of Legends.app/Contents/LoL/lockfile",
            home
        )));
    }
    for path in &fallbacks {
        if let Some(info) = read_lockfile(path) {
            return Some(info);
        }
    }

    None
}

fn read_lockfile(path: &std::path::Path) -> Option<LcuInfo> {
    let contents = fs::read_to_string(path).ok()?;
    let parts: Vec<&str> = contents.split(':').collect();
    if parts.len() >= 5 {
        Some(LcuInfo {
            port:  parts[2].to_string(),
            token: parts[3].to_string(),
        })
    } else {
        None
    }
}

pub fn get_auth_header(token: &str) -> String {
    let auth = format!("riot:{}", token);
    format!("Basic {}", general_purpose::STANDARD.encode(auth))
}
