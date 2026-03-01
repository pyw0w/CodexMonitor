use std::collections::HashMap;
use std::future::Future;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use keyring::Entry as KeyringEntry;
use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::backend::app_server::WorkspaceSession;
use crate::codex::args::resolve_workspace_codex_args;
use crate::shared::process_core::kill_child_process_tree;
use crate::storage::write_settings;
use crate::types::{AccountProfileMeta, AppSettings, WorkspaceEntry};

const KEYRING_SERVICE: &str = "codex-monitor";
const ACCOUNT_SOURCE_LOGIN: &str = "login";
const ACCOUNT_SOURCE_IMPORT: &str = "import";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AccountProfilesListResult {
    pub(crate) profiles: Vec<AccountProfileMeta>,
    pub(crate) active_profile_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AccountProfileCreateResult {
    pub(crate) profile_id: String,
    pub(crate) profiles: Vec<AccountProfileMeta>,
    pub(crate) active_profile_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AccountProfileSwitchResult {
    pub(crate) switched: bool,
    pub(crate) requires_confirmation: bool,
    pub(crate) interrupted_runs_count: u32,
    pub(crate) active_profile_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AccountProfileSignOutResult {
    pub(crate) signed_out: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AccountProfileRemoveResult {
    pub(crate) removed: bool,
    pub(crate) active_profile_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AccountProfileRenameResult {
    pub(crate) updated: bool,
    pub(crate) profiles: Vec<AccountProfileMeta>,
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or(0)
}

fn keyring_entry(profile_id: &str) -> Result<KeyringEntry, String> {
    let account = format!("account-profile/{profile_id}");
    KeyringEntry::new(KEYRING_SERVICE, &account).map_err(|err| err.to_string())
}

fn write_profile_secret(profile_id: &str, codex_home: &Path) -> Result<(), String> {
    let entry = keyring_entry(profile_id)?;
    entry
        .set_password(codex_home.to_string_lossy().as_ref())
        .map_err(|err| err.to_string())
}

fn read_profile_secret(profile_id: &str) -> Result<PathBuf, String> {
    let entry = keyring_entry(profile_id)?;
    let secret = entry.get_password().map_err(|err| err.to_string())?;
    let trimmed = secret.trim();
    if trimmed.is_empty() {
        return Err("Profile storage is empty.".to_string());
    }
    Ok(PathBuf::from(trimmed))
}

fn is_missing_secure_entry_error(message: &str) -> bool {
    let normalized = message.to_ascii_lowercase();
    normalized.contains("no matching entry found in secure storage")
        || normalized.contains("no entry found")
        || normalized.contains("item not found")
}

fn delete_profile_secret(profile_id: &str) {
    if let Ok(entry) = keyring_entry(profile_id) {
        let _ = entry.delete_credential();
    }
}

fn normalize_profile_name(name: &str) -> Option<String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return None;
    }
    Some(trimmed.to_string())
}

fn ensure_unique_profile_name(
    profiles: &[AccountProfileMeta],
    candidate: &str,
    skip_id: Option<&str>,
) -> Result<(), String> {
    let exists = profiles.iter().any(|profile| {
        if let Some(skip_id) = skip_id {
            if profile.id == skip_id {
                return false;
            }
        }
        profile.name.eq_ignore_ascii_case(candidate)
    });
    if exists {
        return Err(format!("An account profile named \"{candidate}\" already exists."));
    }
    Ok(())
}

pub(crate) fn apply_active_account_profile_env(settings: &AppSettings) -> Result<(), String> {
    let Some(profile_id) = settings.active_account_profile_id.as_deref() else {
        std::env::remove_var("CODEX_HOME");
        return Ok(());
    };
    let codex_home = read_profile_secret(profile_id)?;
    std::env::set_var("CODEX_HOME", codex_home);
    Ok(())
}

pub(crate) async fn account_profiles_list_core(
    app_settings: &Mutex<AppSettings>,
) -> AccountProfilesListResult {
    let settings = app_settings.lock().await;
    AccountProfilesListResult {
        profiles: settings.account_profiles.clone(),
        active_profile_id: settings.active_account_profile_id.clone(),
    }
}

fn managed_codex_home_path(settings_path: &Path, profile_id: &str) -> Result<PathBuf, String> {
    let Some(data_dir) = settings_path.parent() else {
        return Err("Unable to resolve app data directory.".to_string());
    };
    Ok(data_dir.join("accounts").join(profile_id).join("codex-home"))
}

pub(crate) async fn account_profile_add_login_core(
    name: String,
    make_active: bool,
    app_settings: &Mutex<AppSettings>,
    settings_path: &PathBuf,
) -> Result<AccountProfileCreateResult, String> {
    let normalized_name =
        normalize_profile_name(&name).ok_or_else(|| "Profile name is required.".to_string())?;
    let profile_id = format!("profile-{}", Uuid::new_v4());
    let codex_home = managed_codex_home_path(settings_path, profile_id.as_str())?;
    std::fs::create_dir_all(&codex_home).map_err(|err| err.to_string())?;
    write_profile_secret(profile_id.as_str(), &codex_home)?;

    let mut settings = app_settings.lock().await;
    ensure_unique_profile_name(&settings.account_profiles, normalized_name.as_str(), None)?;
    let created_at_ms = now_ms();
    settings.account_profiles.push(AccountProfileMeta {
        id: profile_id.clone(),
        name: normalized_name,
        source: ACCOUNT_SOURCE_LOGIN.to_string(),
        last_used_at_ms: if make_active { Some(created_at_ms) } else { None },
        created_at_ms,
    });
    if make_active {
        settings.active_account_profile_id = Some(profile_id.clone());
        let _ = apply_active_account_profile_env(&settings);
    }
    write_settings(settings_path, &settings)?;

    Ok(AccountProfileCreateResult {
        profile_id,
        profiles: settings.account_profiles.clone(),
        active_profile_id: settings.active_account_profile_id.clone(),
    })
}

pub(crate) async fn account_profile_add_import_core(
    name: String,
    import_path: String,
    make_active: bool,
    app_settings: &Mutex<AppSettings>,
    settings_path: &PathBuf,
) -> Result<AccountProfileCreateResult, String> {
    let normalized_name =
        normalize_profile_name(&name).ok_or_else(|| "Profile name is required.".to_string())?;
    let normalized_import = import_path.trim();
    if normalized_import.is_empty() {
        return Err("Import path is required.".to_string());
    }
    let codex_home = PathBuf::from(normalized_import);
    if !codex_home.is_dir() {
        return Err("Import path must be an existing directory.".to_string());
    }

    let profile_id = format!("profile-{}", Uuid::new_v4());
    write_profile_secret(profile_id.as_str(), &codex_home)?;

    let mut settings = app_settings.lock().await;
    ensure_unique_profile_name(&settings.account_profiles, normalized_name.as_str(), None)?;
    let created_at_ms = now_ms();
    settings.account_profiles.push(AccountProfileMeta {
        id: profile_id.clone(),
        name: normalized_name,
        source: ACCOUNT_SOURCE_IMPORT.to_string(),
        last_used_at_ms: if make_active { Some(created_at_ms) } else { None },
        created_at_ms,
    });
    if make_active {
        settings.active_account_profile_id = Some(profile_id.clone());
        let _ = apply_active_account_profile_env(&settings);
    }
    write_settings(settings_path, &settings)?;

    Ok(AccountProfileCreateResult {
        profile_id,
        profiles: settings.account_profiles.clone(),
        active_profile_id: settings.active_account_profile_id.clone(),
    })
}

pub(crate) async fn account_profile_switch_core<F, Fut>(
    profile_id: String,
    _force: bool,
    workspaces: &Mutex<HashMap<String, WorkspaceEntry>>,
    sessions: &Mutex<HashMap<String, Arc<WorkspaceSession>>>,
    app_settings: &Mutex<AppSettings>,
    settings_path: &PathBuf,
    spawn_session: F,
) -> Result<AccountProfileSwitchResult, String>
where
    F: Fn(WorkspaceEntry, Option<String>, Option<String>, Option<PathBuf>) -> Fut,
    Fut: Future<Output = Result<Arc<WorkspaceSession>, String>>,
{
    let (settings_snapshot, profile_source) = {
        let settings = app_settings.lock().await;
        let Some(profile) = settings
            .account_profiles
            .iter()
            .find(|profile| profile.id == profile_id)
            .cloned()
        else {
            return Err("Account profile not found.".to_string());
        };
        (settings.clone(), profile.source)
    };

    let codex_home = match read_profile_secret(profile_id.as_str()) {
        Ok(path) => path,
        Err(err) if profile_source == ACCOUNT_SOURCE_LOGIN && is_missing_secure_entry_error(&err) => {
            let fallback_path = managed_codex_home_path(settings_path, profile_id.as_str())?;
            if !fallback_path.is_dir() {
                return Err(
                    "Saved login profile could not be recovered from secure storage. Please add it again."
                        .to_string(),
                );
            }
            write_profile_secret(profile_id.as_str(), &fallback_path)?;
            fallback_path
        }
        Err(err) if profile_source == ACCOUNT_SOURCE_IMPORT && is_missing_secure_entry_error(&err) => {
            return Err(
                "Imported profile credentials are missing from secure storage. Re-import this account profile."
                    .to_string(),
            );
        }
        Err(err) => return Err(err),
    };
    if !codex_home.is_dir() {
        return Err("Selected profile path does not exist anymore.".to_string());
    }

    let sessions_guard = sessions.lock().await;
    let owner_workspace_id = sessions_guard
        .values()
        .next()
        .map(|session| session.owner_workspace_id.clone());
    drop(sessions_guard);

    let workspaces_guard = workspaces.lock().await;
    let owner_workspace = owner_workspace_id
        .as_ref()
        .and_then(|workspace_id| workspaces_guard.get(workspace_id).cloned());
    let parent_workspace = owner_workspace
        .as_ref()
        .and_then(|owner| owner.parent_id.as_ref())
        .and_then(|parent_id| workspaces_guard.get(parent_id).cloned());
    let codex_args = owner_workspace.as_ref().and_then(|owner| {
        resolve_workspace_codex_args(owner, parent_workspace.as_ref(), Some(&settings_snapshot))
    });
    let default_bin = settings_snapshot.codex_bin.clone();

    let Some(owner_workspace) = owner_workspace else {
        let mut settings = app_settings.lock().await;
        let now = now_ms();
        settings
            .account_profiles
            .iter_mut()
            .filter(|profile| profile.id == profile_id)
            .for_each(|profile| profile.last_used_at_ms = Some(now));
        settings.active_account_profile_id = Some(profile_id.clone());
        write_settings(settings_path, &settings)?;
        std::env::set_var("CODEX_HOME", &codex_home);
        return Ok(AccountProfileSwitchResult {
            switched: true,
            requires_confirmation: false,
            interrupted_runs_count: 0,
            active_profile_id: Some(profile_id),
        });
    };

    let current_session = {
        let sessions = sessions.lock().await;
        sessions.values().next().cloned()
    };

    let Some(current_session) = current_session else {
        let mut settings = app_settings.lock().await;
        let now = now_ms();
        settings
            .account_profiles
            .iter_mut()
            .filter(|profile| profile.id == profile_id)
            .for_each(|profile| profile.last_used_at_ms = Some(now));
        settings.active_account_profile_id = Some(profile_id.clone());
        write_settings(settings_path, &settings)?;
        std::env::set_var("CODEX_HOME", &codex_home);
        return Ok(AccountProfileSwitchResult {
            switched: true,
            requires_confirmation: false,
            interrupted_runs_count: 0,
            active_profile_id: Some(profile_id),
        });
    };

    let new_session =
        spawn_session(
            owner_workspace.clone(),
            default_bin,
            codex_args,
            Some(codex_home.clone()),
        )
        .await?;

    let workspace_ids = {
        let sessions = sessions.lock().await;
        sessions.keys().cloned().collect::<Vec<_>>()
    };

    let workspace_paths = {
        let workspaces = workspaces.lock().await;
        workspace_ids
            .iter()
            .map(|workspace_id| {
                let path = workspaces
                    .get(workspace_id)
                    .map(|entry| entry.path.clone())
                    .unwrap_or_default();
                (workspace_id.clone(), path)
            })
            .collect::<Vec<_>>()
    };

    for (workspace_id, workspace_path) in &workspace_paths {
        let path = if workspace_path.is_empty() {
            None
        } else {
            Some(workspace_path.as_str())
        };
        new_session
            .register_workspace_with_path(workspace_id, path)
            .await;
    }

    let mut settings = app_settings.lock().await;
    let now = now_ms();
    settings
        .account_profiles
        .iter_mut()
        .filter(|profile| profile.id == profile_id)
        .for_each(|profile| profile.last_used_at_ms = Some(now));
    settings.active_account_profile_id = Some(profile_id.clone());
    write_settings(settings_path, &settings)?;
    std::env::set_var("CODEX_HOME", &codex_home);
    drop(settings);

    {
        let mut sessions = sessions.lock().await;
        for key in &workspace_ids {
            sessions.insert(key.clone(), Arc::clone(&new_session));
        }
    }

    let mut child = current_session.child.lock().await;
    kill_child_process_tree(&mut child).await;

    Ok(AccountProfileSwitchResult {
        switched: true,
        requires_confirmation: false,
        interrupted_runs_count: 0,
        active_profile_id: Some(profile_id),
    })
}

pub(crate) async fn account_profile_sign_out_core(
    workspace_id: String,
    profile_id: Option<String>,
    sessions: &Mutex<HashMap<String, Arc<WorkspaceSession>>>,
    app_settings: &Mutex<AppSettings>,
) -> Result<AccountProfileSignOutResult, String> {
    if let Some(profile_id) = profile_id {
        let settings = app_settings.lock().await;
        if settings.active_account_profile_id.as_deref() != Some(profile_id.as_str()) {
            return Err("Can only sign out the active account profile.".to_string());
        }
    }

    let session = {
        let sessions = sessions.lock().await;
        sessions.get(&workspace_id).cloned()
    }
    .ok_or_else(|| "Workspace is not connected.".to_string())?;

    let _ = session
        .send_request_for_workspace(&workspace_id, "account/logout", serde_json::Value::Null)
        .await?;

    Ok(AccountProfileSignOutResult { signed_out: true })
}

pub(crate) async fn account_profile_remove_core(
    profile_id: String,
    app_settings: &Mutex<AppSettings>,
    settings_path: &PathBuf,
) -> Result<AccountProfileRemoveResult, String> {
    let mut settings = app_settings.lock().await;
    let initial_len = settings.account_profiles.len();
    let removed_profile = settings
        .account_profiles
        .iter()
        .find(|profile| profile.id == profile_id)
        .cloned();
    settings
        .account_profiles
        .retain(|profile| profile.id != profile_id);
    if settings.account_profiles.len() == initial_len {
        return Ok(AccountProfileRemoveResult {
            removed: false,
            active_profile_id: settings.active_account_profile_id.clone(),
        });
    }

    delete_profile_secret(profile_id.as_str());

    if settings.active_account_profile_id.as_deref() == Some(profile_id.as_str()) {
        settings.active_account_profile_id = None;
        std::env::remove_var("CODEX_HOME");
    }

    if let Some(profile) = removed_profile {
        if profile.source == ACCOUNT_SOURCE_LOGIN {
            if let Ok(managed_path) = managed_codex_home_path(settings_path, profile_id.as_str()) {
                if let Some(profile_root) = managed_path.parent().and_then(|value| value.parent()) {
                    let _ = std::fs::remove_dir_all(profile_root);
                }
            }
        }
    }

    write_settings(settings_path, &settings)?;

    Ok(AccountProfileRemoveResult {
        removed: true,
        active_profile_id: settings.active_account_profile_id.clone(),
    })
}

pub(crate) async fn account_profile_rename_core(
    profile_id: String,
    name: String,
    app_settings: &Mutex<AppSettings>,
    settings_path: &PathBuf,
) -> Result<AccountProfileRenameResult, String> {
    let normalized_name =
        normalize_profile_name(&name).ok_or_else(|| "Profile name is required.".to_string())?;

    let mut settings = app_settings.lock().await;
    ensure_unique_profile_name(
        &settings.account_profiles,
        normalized_name.as_str(),
        Some(profile_id.as_str()),
    )?;

    let mut updated = false;
    settings.account_profiles.iter_mut().for_each(|profile| {
        if profile.id == profile_id {
            profile.name = normalized_name.clone();
            updated = true;
        }
    });

    if !updated {
        return Err("Account profile not found.".to_string());
    }

    write_settings(settings_path, &settings)?;

    Ok(AccountProfileRenameResult {
        updated,
        profiles: settings.account_profiles.clone(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn profile(id: &str, name: &str) -> AccountProfileMeta {
        AccountProfileMeta {
            id: id.to_string(),
            name: name.to_string(),
            source: "login".to_string(),
            last_used_at_ms: None,
            created_at_ms: 1,
        }
    }

    #[test]
    fn normalize_profile_name_trims_and_rejects_empty() {
        assert_eq!(normalize_profile_name("  Work  "), Some("Work".to_string()));
        assert_eq!(normalize_profile_name(" "), None);
        assert_eq!(normalize_profile_name(""), None);
    }

    #[test]
    fn ensure_unique_profile_name_detects_case_insensitive_duplicates() {
        let profiles = vec![profile("p1", "Work"), profile("p2", "Personal")];
        let error = ensure_unique_profile_name(&profiles, "work", None).expect_err("duplicate");
        assert!(error.contains("already exists"));
    }

    #[test]
    fn ensure_unique_profile_name_allows_same_profile_rename() {
        let profiles = vec![profile("p1", "Work"), profile("p2", "Personal")];
        let result = ensure_unique_profile_name(&profiles, "Work", Some("p1"));
        assert!(result.is_ok());
    }

    #[test]
    fn now_ms_is_non_negative() {
        assert!(now_ms() >= 0);
    }
}
