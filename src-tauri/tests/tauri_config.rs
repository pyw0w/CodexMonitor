use std::fs;
use std::path::PathBuf;

use serde_json::Value;

fn read_json_config(path: &PathBuf) -> Value {
    let contents =
        fs::read_to_string(path).unwrap_or_else(|error| panic!("Failed to read {path:?}: {error}"));
    serde_json::from_str(&contents)
        .unwrap_or_else(|error| panic!("Failed to parse {}: {error}", path.display()))
}

#[test]
fn macos_private_api_feature_matches_config() {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let config_path = manifest_dir.join("tauri.conf.json");
    let config = read_json_config(&config_path);
    let macos_private_api = config
        .get("app")
        .and_then(|app| app.get("macOSPrivateApi"))
        .and_then(|value| value.as_bool())
        .unwrap_or(false);

    if macos_private_api {
        let cargo_path = manifest_dir.join("Cargo.toml");
        let cargo_contents = fs::read_to_string(&cargo_path)
            .unwrap_or_else(|error| panic!("Failed to read {cargo_path:?}: {error}"));
        let mut in_dependencies = false;
        let mut has_feature = false;

        for line in cargo_contents.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with('[') {
                in_dependencies = trimmed == "[dependencies]";
                continue;
            }
            if !in_dependencies {
                continue;
            }
            if trimmed.starts_with("tauri") && trimmed.contains("macos-private-api") {
                has_feature = true;
                break;
            }
        }

        assert!(
            has_feature,
            "Cargo.toml [dependencies] must enable macos-private-api when app.macOSPrivateApi is true"
        );
    }
}

#[test]
fn linux_window_override_disables_transparency_effects() {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let config_path = manifest_dir.join("tauri.linux.conf.json");
    let config = read_json_config(&config_path);
    let window = config
        .get("app")
        .and_then(|app| app.get("windows"))
        .and_then(|windows| windows.get(0))
        .unwrap_or_else(|| panic!("Missing app.windows[0] in {}", config_path.display()));

    assert_eq!(
        window
            .get("titleBarStyle")
            .and_then(|value| value.as_str())
            .unwrap_or(""),
        "Overlay",
        "Linux override should use overlay title bar for custom in-app caption controls"
    );
    assert_eq!(
        window
            .get("hiddenTitle")
            .and_then(|value| value.as_bool())
            .unwrap_or(true),
        true,
        "Linux override should hide native window title for custom caption controls"
    );
    assert_eq!(
        window
            .get("transparent")
            .and_then(|value| value.as_bool())
            .unwrap_or(true),
        false,
        "Linux window transparency should be disabled"
    );
    assert!(
        window.get("windowEffects").is_some_and(Value::is_null),
        "Linux windowEffects should be explicitly null"
    );
}

#[test]
fn fedora_override_pins_rpm_bundle_and_linux_window_defaults() {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let config_path = manifest_dir.join("tauri.fedora.conf.json");
    let config = read_json_config(&config_path);
    let window = config
        .get("app")
        .and_then(|app| app.get("windows"))
        .and_then(|windows| windows.get(0))
        .unwrap_or_else(|| panic!("Missing app.windows[0] in {}", config_path.display()));

    assert_eq!(
        window
            .get("titleBarStyle")
            .and_then(|value| value.as_str())
            .unwrap_or(""),
        "Overlay",
        "Fedora override should use overlay title bar for custom in-app caption controls"
    );
    assert_eq!(
        window
            .get("hiddenTitle")
            .and_then(|value| value.as_bool())
            .unwrap_or(true),
        true,
        "Fedora override should hide native window title for custom caption controls"
    );
    assert_eq!(
        window
            .get("transparent")
            .and_then(|value| value.as_bool())
            .unwrap_or(true),
        false,
        "Fedora window transparency should be disabled"
    );
    assert!(
        window.get("windowEffects").is_some_and(Value::is_null),
        "Fedora windowEffects should be explicitly null"
    );

    assert_eq!(
        config
            .get("bundle")
            .and_then(|bundle| bundle.get("targets"))
            .and_then(Value::as_array)
            .map(|targets| {
                targets
                    .iter()
                    .filter_map(Value::as_str)
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default(),
        vec!["rpm"],
        "Fedora override should only target RPM bundles"
    );
    assert_eq!(
        config
            .get("bundle")
            .and_then(|bundle| bundle.get("createUpdaterArtifacts"))
            .and_then(Value::as_bool),
        Some(false),
        "Fedora override should disable updater artifacts for local/manual RPM distribution"
    );
}

#[test]
fn windows_override_pins_windows_bundle_targets() {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let config_path = manifest_dir.join("tauri.windows.conf.json");
    let config = read_json_config(&config_path);
    let window = config
        .get("app")
        .and_then(|app| app.get("windows"))
        .and_then(|windows| windows.get(0))
        .unwrap_or_else(|| panic!("Missing app.windows[0] in {}", config_path.display()));

    assert_eq!(
        window
            .get("titleBarStyle")
            .and_then(|value| value.as_str())
            .unwrap_or(""),
        "Visible",
        "Windows override should use visible native title bar"
    );
    assert_eq!(
        window
            .get("hiddenTitle")
            .and_then(|value| value.as_bool())
            .unwrap_or(true),
        false,
        "Windows override should keep native title text visible"
    );
    assert_eq!(
        config
            .get("bundle")
            .and_then(|bundle| bundle.get("targets"))
            .and_then(Value::as_array)
            .map(|targets| {
                targets
                    .iter()
                    .filter_map(Value::as_str)
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default(),
        vec!["nsis", "msi"],
        "Windows override should only target NSIS and MSI bundles"
    );
}
