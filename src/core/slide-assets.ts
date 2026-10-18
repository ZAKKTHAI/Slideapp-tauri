/**
 * Uint8Array を Base64 に変換する。
 * 大きな画像でも巨大な引数リストを作らない。
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, i + chunkSize),
    );
  }

  return btoa(binary);
}

/**
 * Base64 を Uint8Array に変換する。
 */
export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

/**
 * data URL から MIME type とバイナリを取り出す。
 */
export function parseAssetDataUrl(
  dataUrl: string,
): { mime: string; bytes: Uint8Array } {
  const match = dataUrl.match(
    /^data:([^;,]+);base64,([\s\S]+)$/,
  );

  if (!match) {
    throw new Error("画像データの形式が不正です。");
  }

  return {
    mime: match[1],
    bytes: base64ToBytes(match[2]),
  };
}

/**
 * 編集ソース内の assets/... を data URL に置き換える。
 * プレビューと単一 HTML 書き出しに使用する。
 */
export function resolveAssetsToDataUrls(
  source: string,
  assets: Record<string, string> = {},
): string {
  let result = source;

  for (const [path, dataUrl] of Object.entries(assets)) {
    result = result.split(path).join(dataUrl);
  }

  return result;
}

/**
 * ZIP 内の slides/*.html 用に、アセットパスを相対パスへ変換する。
 */
export function resolveAssetsToRelativePaths(
  source: string,
  assets: Record<string, string> = {},
): string {
  let result = source;

  for (const path of Object.keys(assets)) {
    result = result.split(path).join(`../${path}`);
  }

  return result;
}
