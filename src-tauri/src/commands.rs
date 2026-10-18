use std::path::PathBuf;

#[tauri::command]
pub async fn read_text_file(path: String) -> Result<String, String> {
    let path = PathBuf::from(path);

    // 最小実装例。実運用では許可済みディレクトリ・ファイルであることを
    // 検証してから読み込むこと。任意パスを無条件で受け付けない。
    tokio::fs::read_to_string(path)
        .await
        .map_err(|error| format!("ファイルを読み込めませんでした: {error}"))
}

#[tauri::command]
pub async fn write_text_file(path: String, content: String) -> Result<(), String> {
    let path = PathBuf::from(path);

    // 実運用では保存先の許可リスト、拡張子、サイズ、上書き確認を追加する。
    tokio::fs::write(path, content)
        .await
        .map_err(|error| format!("ファイルを保存できませんでした: {error}"))
}
