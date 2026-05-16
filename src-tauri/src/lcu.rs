use sysinfo::{ProcessRefreshKind, ProcessesToUpdate, System};
use std::fs;
use base64::{Engine as _, engine::general_purpose};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LcuInfo {
    pub port: String,
    pub token: String,
}

pub fn find_lcu_info() -> Option<LcuInfo> {
    let mut sys = System::new();
    sys.refresh_processes_specifics(
        ProcessesToUpdate::All,
        true,
        ProcessRefreshKind::default().with_exe(sysinfo::UpdateKind::Always)
    );

    let process = sys.processes().values().find(|p| {
        let name = p.name().to_string_lossy().to_lowercase();
        name == "leagueclientux.exe" || 
        name == "leagueclient.exe" || 
        name == "leagueclientux" || 
        name == "leagueclient"
    })?;

    if let Some(exe_path) = process.exe() {
        if let Some(install_dir) = exe_path.parent() {
            let lockfile_path = install_dir.join("lockfile");
            if let Ok(contents) = fs::read_to_string(&lockfile_path) {
                let parts: Vec<&str> = contents.split(':').collect();
                if parts.len() >= 5 {
                    return Some(LcuInfo {
                        port: parts[2].to_string(),
                        token: parts[3].to_string(),
                    });
                }
            }
        }
    }
    
    // Fallback: Check common install paths if process detection fails or doesn't provide a path
    let mut fallbacks = vec![
        "C:\\Riot Games\\League of Legends\\lockfile".to_string(),
        "/Applications/League of Legends.app/Contents/LoL/lockfile".to_string(),
    ];

    // Add user-specific Mac path if HOME is set
    if let Ok(home) = std::env::var("HOME") {
        fallbacks.push(format!("{}/Applications/League of Legends.app/Contents/LoL/lockfile", home));
    }

    for path in fallbacks {
        let p = std::path::Path::new(&path);
        if p.exists() {
            if let Ok(contents) = fs::read_to_string(p) {
                let parts: Vec<&str> = contents.split(':').collect();
                if parts.len() >= 5 {
                    return Some(LcuInfo {
                        port: parts[2].to_string(),
                        token: parts[3].to_string(),
                    });
                }
            }
        }
    }

    None
}

pub fn get_auth_header(token: &str) -> String {
    let auth = format!("riot:{}", token);
    format!("Basic {}", general_purpose::STANDARD.encode(auth))
}
