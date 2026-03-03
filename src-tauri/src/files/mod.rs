use serde_json::json;
use std::path::PathBuf;
use tauri::{AppHandle, State};

use self::io::TextFileResponse;
use self::policy::{FileKind, FileScope};
use crate::remote_backend;
use crate::shared::codex_core;
use crate::shared::files_core::{file_read_core, file_write_core};
use crate::state::AppState;

pub(crate) mod io;
pub(crate) mod ops;
pub(crate) mod policy;

#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn read_clipboard_file_as_data_url_desktop() -> Result<String, String> {
    use arboard::Clipboard;
    use base64::engine::general_purpose::STANDARD;
    use base64::Engine;
    use png::{BitDepth, ColorType, Encoder};

    let mut clipboard = Clipboard::new().map_err(|err| err.to_string())?;
    let image = clipboard.get_image().map_err(|err| err.to_string())?;
    let width = image.width as u32;
    let height = image.height as u32;

    let mut encoded_png = Vec::new();
    {
        let mut encoder = Encoder::new(&mut encoded_png, width, height);
        encoder.set_color(ColorType::Rgba);
        encoder.set_depth(BitDepth::Eight);
        let mut writer = encoder.write_header().map_err(|err| err.to_string())?;
        writer
            .write_image_data(image.bytes.as_ref())
            .map_err(|err| err.to_string())?;
    }

    let data = STANDARD.encode(encoded_png);
    Ok(format!("data:image/png;base64,{data}"))
}

async fn file_read_impl(
    scope: FileScope,
    kind: FileKind,
    workspace_id: Option<String>,
    state: &AppState,
    app: &AppHandle,
) -> Result<TextFileResponse, String> {
    if remote_backend::is_remote_mode(state).await {
        let response = remote_backend::call_remote(
            state,
            app.clone(),
            "file_read",
            json!({ "scope": scope, "kind": kind, "workspaceId": workspace_id }),
        )
        .await?;
        return serde_json::from_value(response).map_err(|err| err.to_string());
    }

    file_read_core(&state.workspaces, scope, kind, workspace_id).await
}

async fn file_write_impl(
    scope: FileScope,
    kind: FileKind,
    workspace_id: Option<String>,
    content: String,
    state: &AppState,
    app: &AppHandle,
) -> Result<(), String> {
    if remote_backend::is_remote_mode(state).await {
        remote_backend::call_remote(
            state,
            app.clone(),
            "file_write",
            json!({
                "scope": scope,
                "kind": kind,
                "workspaceId": workspace_id,
                "content": content,
            }),
        )
        .await?;
        return Ok(());
    }

    file_write_core(&state.workspaces, scope, kind, workspace_id, content).await
}

#[tauri::command]
pub(crate) async fn file_read(
    scope: FileScope,
    kind: FileKind,
    workspace_id: Option<String>,
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<TextFileResponse, String> {
    file_read_impl(scope, kind, workspace_id, &*state, &app).await
}

#[tauri::command]
pub(crate) async fn file_write(
    scope: FileScope,
    kind: FileKind,
    workspace_id: Option<String>,
    content: String,
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<(), String> {
    file_write_impl(scope, kind, workspace_id, content, &*state, &app).await
}

#[tauri::command]
pub(crate) async fn read_image_as_data_url(
    path: String,
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<String, String> {
    let trimmed_path = path.trim();
    if trimmed_path.is_empty() {
        return Err("Image path is required".to_string());
    }

    let mobile_runtime = cfg!(any(target_os = "ios", target_os = "android"));
    let remote_mode = remote_backend::is_remote_mode(&*state).await;
    if !mobile_runtime && !remote_mode {
        return Err("Image conversion is only supported in remote backend mode or on mobile runtimes".to_string());
    }

    let normalized = codex_core::normalize_file_path(trimmed_path);
    if normalized.is_empty() {
        return Err("Image path is required".to_string());
    }

    let _ = app;
    codex_core::read_image_as_data_url_core(&normalized)
}

#[tauri::command]
pub(crate) fn write_text_file(path: String, content: String) -> Result<(), String> {
    let target = PathBuf::from(path.trim());
    if target.as_os_str().is_empty() {
        return Err("Path is required".to_string());
    }
    if let Some(parent) = target.parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent)
                .map_err(|err| format!("Failed to create export directory: {err}"))?;
        }
    }
    std::fs::write(&target, content).map_err(|err| format!("Failed to write export file: {err}"))
}

#[tauri::command]
pub(crate) fn read_clipboard_file_as_data_url() -> Result<Option<String>, String> {
    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        return Ok(None);
    }

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        match read_clipboard_file_as_data_url_desktop() {
            Ok(data_url) => Ok(Some(data_url)),
            Err(_) => Ok(None),
        }
    }
}
