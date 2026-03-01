use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::PathBuf;
use toml_edit::{Array, Document, Item, Table, Value as TomlValue};

use crate::codex::home as codex_home;
use crate::shared::config_toml_core;

const MCP_SERVERS_KEY: &str = "mcp_servers";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct McpServerDto {
    pub name: String,
    pub enabled: Option<bool>,
    pub command: Option<String>,
    pub args: Vec<String>,
    pub env: BTreeMap<String, String>,
    pub url: Option<String>,
    pub headers: BTreeMap<String, String>,
    pub additional_toml: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct McpSettingsDto {
    pub config_path: String,
    pub servers: Vec<McpServerDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CreateMcpServerInput {
    pub name: String,
    pub enabled: Option<bool>,
    pub command: Option<String>,
    #[serde(default)]
    pub args: Vec<String>,
    #[serde(default)]
    pub env: BTreeMap<String, String>,
    pub url: Option<String>,
    #[serde(default)]
    pub headers: BTreeMap<String, String>,
    pub additional_toml: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct UpdateMcpServerInput {
    pub original_name: String,
    pub name: String,
    pub enabled: Option<bool>,
    pub command: Option<String>,
    #[serde(default)]
    pub args: Vec<String>,
    #[serde(default)]
    pub env: BTreeMap<String, String>,
    pub url: Option<String>,
    #[serde(default)]
    pub headers: BTreeMap<String, String>,
    pub additional_toml: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DeleteMcpServerInput {
    pub name: String,
}

pub(crate) fn get_mcp_settings_core() -> Result<McpSettingsDto, String> {
    let codex_home = resolve_codex_home()?;
    let config_path = codex_home.join("config.toml");
    let config_path_string = config_path
        .to_str()
        .ok_or_else(|| "Unable to resolve CODEX_HOME".to_string())?
        .to_string();

    let (_, document) = config_toml_core::load_global_config_document(&codex_home)?;
    let mut servers = collect_servers(&document);
    servers.sort_by(|left, right| left.name.cmp(&right.name));

    Ok(McpSettingsDto {
        config_path: config_path_string,
        servers,
    })
}

pub(crate) fn create_mcp_server_core(input: CreateMcpServerInput) -> Result<McpSettingsDto, String> {
    let name = normalize_server_name(&input.name)?;
    validate_connection_shape(
        input.command.as_deref(),
        input.url.as_deref(),
        input.args.as_slice(),
        input.env.clone(),
    )?;

    let codex_home = resolve_codex_home()?;
    let (_, mut document) = config_toml_core::load_global_config_document(&codex_home)?;
    let mcp_servers = config_toml_core::ensure_table(&mut document, MCP_SERVERS_KEY)?;
    if mcp_servers.get(&name).is_some() {
        return Err(format!("MCP server '{name}' already exists"));
    }

    let server_table = build_server_table(ServerTableInput {
        enabled: input.enabled,
        command: input.command,
        args: input.args,
        env: input.env,
        url: input.url,
        headers: input.headers,
        additional_toml: input.additional_toml,
        existing_unknown: None,
    })?;
    mcp_servers[&name] = Item::Table(server_table);

    config_toml_core::persist_global_config_document(&codex_home, &document)?;
    get_mcp_settings_core()
}

pub(crate) fn update_mcp_server_core(input: UpdateMcpServerInput) -> Result<McpSettingsDto, String> {
    let original_name = normalize_server_name(&input.original_name)?;
    let name = normalize_server_name(&input.name)?;
    validate_connection_shape(
        input.command.as_deref(),
        input.url.as_deref(),
        input.args.as_slice(),
        input.env.clone(),
    )?;

    let codex_home = resolve_codex_home()?;
    let (_, mut document) = config_toml_core::load_global_config_document(&codex_home)?;
    let mcp_servers = config_toml_core::ensure_table(&mut document, MCP_SERVERS_KEY)?;

    if name != original_name && mcp_servers.get(&name).is_some() {
        return Err(format!("MCP server '{name}' already exists"));
    }

    let Some(existing_item) = mcp_servers.remove(&original_name) else {
        return Err(format!("MCP server '{original_name}' not found"));
    };
    let existing_table = existing_item
        .as_table_like()
        .ok_or_else(|| format!("MCP server '{original_name}' must be a table"))?;
    let existing_unknown = collect_unknown_fields(existing_table);

    let server_table = build_server_table(ServerTableInput {
        enabled: input.enabled,
        command: input.command,
        args: input.args,
        env: input.env,
        url: input.url,
        headers: input.headers,
        additional_toml: input.additional_toml,
        existing_unknown: Some(existing_unknown),
    })?;
    mcp_servers[&name] = Item::Table(server_table);

    config_toml_core::persist_global_config_document(&codex_home, &document)?;
    get_mcp_settings_core()
}

pub(crate) fn delete_mcp_server_core(input: DeleteMcpServerInput) -> Result<McpSettingsDto, String> {
    let name = normalize_server_name(&input.name)?;

    let codex_home = resolve_codex_home()?;
    let (_, mut document) = config_toml_core::load_global_config_document(&codex_home)?;
    let mcp_servers = config_toml_core::ensure_table(&mut document, MCP_SERVERS_KEY)?;

    if mcp_servers.remove(&name).is_none() {
        return Err(format!("MCP server '{name}' not found"));
    }

    config_toml_core::persist_global_config_document(&codex_home, &document)?;
    get_mcp_settings_core()
}

fn resolve_codex_home() -> Result<PathBuf, String> {
    codex_home::resolve_default_codex_home().ok_or_else(|| "Unable to resolve CODEX_HOME".to_string())
}

fn normalize_server_name(raw: &str) -> Result<String, String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err("MCP server name is required".to_string());
    }
    if trimmed.len() > 64 {
        return Err("MCP server name must be 64 characters or fewer".to_string());
    }
    if trimmed.chars().any(char::is_whitespace) {
        return Err("MCP server name must not contain spaces".to_string());
    }
    if trimmed
        .chars()
        .any(|ch| !ch.is_ascii_alphanumeric() && ch != '_' && ch != '-' && ch != '.')
    {
        return Err("MCP server name must use only letters, digits, '.', '_' or '-'".to_string());
    }
    Ok(trimmed.to_string())
}

fn validate_connection_shape(
    command: Option<&str>,
    url: Option<&str>,
    args: &[String],
    env: BTreeMap<String, String>,
) -> Result<(), String> {
    let has_command = command.map(str::trim).is_some_and(|value| !value.is_empty());
    let has_url = url.map(str::trim).is_some_and(|value| !value.is_empty());
    if !has_command && !has_url {
        return Err("Set either command or url for the MCP server".to_string());
    }

    if !has_command && !args.is_empty() {
        return Err("args requires command".to_string());
    }
    if !has_command && !env.is_empty() {
        return Err("env requires command".to_string());
    }

    Ok(())
}

fn collect_servers(document: &Document) -> Vec<McpServerDto> {
    let Some(table) = document.get(MCP_SERVERS_KEY).and_then(Item::as_table_like) else {
        return Vec::new();
    };

    let mut servers = Vec::new();
    for (name, item) in table.iter() {
        let Some(server) = item.as_table_like() else {
            continue;
        };
        servers.push(McpServerDto {
            name: name.to_string(),
            enabled: server.get("enabled").and_then(Item::as_bool),
            command: read_trimmed_string(server.get("command")),
            args: read_string_array(server.get("args")),
            env: read_string_map(server.get("env")),
            url: read_trimmed_string(server.get("url")),
            headers: read_string_map(server.get("headers")),
            additional_toml: render_additional_toml(&collect_unknown_fields(server)),
        });
    }

    servers
}

fn read_trimmed_string(item: Option<&Item>) -> Option<String> {
    let value = item.and_then(Item::as_str)?;
    let trimmed = value.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

fn read_string_array(item: Option<&Item>) -> Vec<String> {
    let Some(values) = item.and_then(Item::as_array) else {
        return Vec::new();
    };
    values
        .iter()
        .filter_map(TomlValue::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
        .collect()
}

fn read_string_map(item: Option<&Item>) -> BTreeMap<String, String> {
    let Some(table_like) = item.and_then(Item::as_table_like) else {
        return BTreeMap::new();
    };

    let mut map = BTreeMap::new();
    for (key, value) in table_like.iter() {
        let Some(text) = value.as_str() else {
            continue;
        };
        map.insert(key.to_string(), text.to_string());
    }
    map
}

struct ServerTableInput {
    enabled: Option<bool>,
    command: Option<String>,
    args: Vec<String>,
    env: BTreeMap<String, String>,
    url: Option<String>,
    headers: BTreeMap<String, String>,
    additional_toml: Option<String>,
    existing_unknown: Option<Table>,
}

fn build_server_table(input: ServerTableInput) -> Result<Table, String> {
    let mut table = Table::new();

    if let Some(enabled) = input.enabled {
        table["enabled"] = Item::Value(TomlValue::Boolean(toml_edit::Formatted::new(enabled)));
    }
    if let Some(command) = normalize_optional_string(input.command) {
        table["command"] = Item::Value(TomlValue::from(command));
    }
    if !input.args.is_empty() {
        let mut args = Array::new();
        for value in input
            .args
            .into_iter()
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
        {
            args.push(value);
        }
        if !args.is_empty() {
            table["args"] = Item::Value(TomlValue::Array(args));
        }
    }
    if !input.env.is_empty() {
        table["env"] = Item::Table(build_string_table(input.env));
    }
    if let Some(url) = normalize_optional_string(input.url) {
        table["url"] = Item::Value(TomlValue::from(url));
    }
    if !input.headers.is_empty() {
        table["headers"] = Item::Table(build_string_table(input.headers));
    }

    let unknown = if let Some(raw) = input.additional_toml {
        parse_additional_toml(raw.as_str())?
    } else {
        input.existing_unknown.unwrap_or_default()
    };
    for (key, item) in unknown.iter() {
        table[key] = item.clone();
    }

    Ok(table)
}

fn normalize_optional_string(value: Option<String>) -> Option<String> {
    let text = value?;
    let trimmed = text.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

fn build_string_table(values: BTreeMap<String, String>) -> Table {
    let mut table = Table::new();
    for (key, value) in values {
        let trimmed_key = key.trim();
        if trimmed_key.is_empty() {
            continue;
        }
        table[trimmed_key] = Item::Value(TomlValue::from(value));
    }
    table
}

fn parse_additional_toml(raw: &str) -> Result<Table, String> {
    if raw.trim().is_empty() {
        return Ok(Table::new());
    }
    let document = config_toml_core::parse_document(raw)
        .map_err(|err| format!("Failed to parse additional TOML: {err}"))?;
    let mut table = Table::new();
    for (key, item) in document.iter() {
        if is_known_server_key(key) {
            return Err(format!(
                "Additional TOML must not redefine '{key}' (edit it in the structured fields)"
            ));
        }
        table[key] = item.clone();
    }
    Ok(table)
}

fn collect_unknown_fields(table_like: &dyn toml_edit::TableLike) -> Table {
    let mut table = Table::new();
    for (key, item) in table_like.iter() {
        if is_known_server_key(key) {
            continue;
        }
        table[key] = item.clone();
    }
    table
}

fn render_additional_toml(table: &Table) -> String {
    if table.is_empty() {
        return String::new();
    }

    let mut document = Document::new();
    for (key, item) in table.iter() {
        document[key] = item.clone();
    }
    document.to_string().trim().to_string()
}

fn is_known_server_key(key: &str) -> bool {
    matches!(key, "enabled" | "command" | "args" | "env" | "url" | "headers")
}
