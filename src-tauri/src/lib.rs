mod commands;

use tauri::Manager;

#[tauri::command]
fn navigate_browser(app: tauri::AppHandle, label: String, url: String) -> Result<(), String> {
    let parsed = url::Url::parse(&url).map_err(|e| format!("URLが不正です: {e}"))?;

    if parsed.scheme() != "http" && parsed.scheme() != "https" {
        return Err("HTTP / HTTPS のURLのみ許可されています".into());
    }

    let webviews = app.webviews();

    let available = webviews.keys().cloned().collect::<Vec<_>>();

    let webview = webviews.get(&label).cloned().ok_or_else(|| {
        format!(
            "WebViewが見つかりません: {label}。登録済みWebView: {:?}",
            available
        )
    })?;

    webview
        .navigate(parsed)
        .map_err(|e| format!("URL遷移に失敗しました: {e}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::read_text_file,
            commands::write_text_file,
            navigate_browser,
        ])
        .run(tauri::generate_context!())
        .expect("Tauriアプリの起動に失敗しました");
}
