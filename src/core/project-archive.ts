
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import type { SlideDefinition, SlideDocument } from "./slide-types";
import { createSlidePreviewDocument } from "../renderer/render-slide-content";

import {
  bytesToBase64,
  parseAssetDataUrl,
  resolveAssetsToRelativePaths,
} from "./slide-assets";

/**
 * ファイル名に使用できない文字や制御文字を除去する。
 */
function safeFilename(value: string, fallback: string): string {
  const name = value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/[. ]+$/g, "")
    .slice(0, 80);

  return name || fallback;
}

/**
 * HTMLに文字列を埋め込むためのエスケープ。
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * スライドのHTMLファイル名を生成する。
 * 順番の番号を付けることで、同じタイトルでも衝突しない。
 */
function createSlideFilename(
  slide: SlideDefinition,
  index: number,
): string {
  const title = safeFilename(slide.title, "slide");

  return `${String(index + 1).padStart(2, "0")}-${title}.html`;
}

/**
 * プロジェクト内のスライド一覧ページを生成する。
 */
function createIndexHtml(
  title: string,
  slides: SlideDefinition[],
): string {
  const links = slides
    .map((slide, index) => {
      const filename = createSlideFilename(slide, index);

      return `      <li>
        <a href="./slides/${encodeURIComponent(filename)}">
          ${escapeHtml(slide.title || `Slide ${index + 1}`)}
        </a>
      </li>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 48px;
      background: #09090b;
      color: #f4f4f5;
      font-family: Inter, "Segoe UI", sans-serif;
    }
    main { max-width: 800px; margin: 0 auto; }
    h1 { font-size: 32px; }
    li { margin: 16px 0; }
    a { color: #ff4d8d; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(title)}</h1>
    <p>${slides.length} slides</p>
    <ol>
${links}
    </ol>
  </main>
</body>
</html>`;
}

/**
 * スライド編集データからZIPアーカイブを生成する。
 *
 * ZIP構成:
 * - project.json: 再編集用のデータ
 * - index.html: スライド一覧
 * - slides/*.html: CSS埋め込み済みの各スライド
 *
 * 戻り値は保存処理へ渡せるZIPバイナリ。
 */
export function createProjectArchive(
  document: SlideDocument,
): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  const assets = document.assets ?? {};

  // 編集データには画像本体ではなく assets の参照情報を残す。
  const { assets: _assets, ...projectData } = document;
  files["project.json"] = strToU8(
    JSON.stringify(projectData, null, 2),
  );

  // 画像などのアセットは独立ファイルとして ZIP に格納。
  for (const [path, dataUrl] of Object.entries(assets)) {
    if (!path.startsWith("assets/") || path.includes("..")) {
      throw new Error(`不正なアセットパスです: ${path}`);
    }

    const { bytes } = parseAssetDataUrl(dataUrl);
    files[path] = bytes;
  }

  files["index.html"] = strToU8(
    createIndexHtml(document.title, document.slides),
  );

  document.slides.forEach((slide, index) => {
    const filename = createSlideFilename(slide, index);

    const source = resolveAssetsToRelativePaths(
      slide.content ?? "",
      assets,
    );

    const css = resolveAssetsToRelativePaths(
      slide.css ?? "",
      assets,
    );

    const html = createSlidePreviewDocument(
      source,
      slide.background,
      css,
    );

    files[`slides/${filename}`] = strToU8(html);
  });

  return zipSync(files, { level: 6 });
}
/**
 * ZIPプロジェクトをメモリ上で展開し、編集用データを取得する。
 */
export function readProjectArchive(
  archive: Uint8Array,
): SlideDocument {
  const files = unzipSync(archive);
  const projectFile = files["project.json"];

  if (!projectFile) {
    throw new Error("ZIP内に project.json がありません。");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(strFromU8(projectFile));
  } catch {
    throw new Error("project.json の JSON 形式が不正です。");
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("version" in parsed) ||
    parsed.version !== 1 ||
    !("title" in parsed) ||
    typeof parsed.title !== "string" ||
    !("slides" in parsed) ||
    !Array.isArray(parsed.slides)
  ) {
    throw new Error("対応していないプロジェクト形式です。");
  }

  if (parsed.slides.length === 0) {
    throw new Error("プロジェクトにスライドがありません。");
  }

  // 最低限のデータ検証
  for (const slide of parsed.slides) {
    if (
      typeof slide !== "object" ||
      slide === null ||
      !("id" in slide) ||
      typeof slide.id !== "string" ||
      !("title" in slide) ||
      typeof slide.title !== "string" ||
      !("background" in slide) ||
      typeof slide.background !== "string" ||
      !("elements" in slide) ||
      !Array.isArray(slide.elements) ||
      !("transition" in slide) ||
      typeof slide.transition !== "object" ||
      slide.transition === null
    ) {
      throw new Error("不正なスライドデータが含まれています。");
    }
  }

  const assets: Record<string, string> = {};

  for (const [path, bytes] of Object.entries(files)) {
    if (!path.startsWith("assets/")) continue;

    // ZIP パスの不正な要素を拒否する。
    if (
      path.includes("..") ||
      path.startsWith("/") ||
      path.includes("\\")
    ) {
      throw new Error(`不正なアセットパスです: ${path}`);
    }

    const extension = path.split(".").pop()?.toLowerCase() ?? "";

    const mimeByExtension: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp",
      gif: "image/gif",
      svg: "image/svg+xml",
      avif: "image/avif",
      bmp: "image/bmp",
    };

    const mime = mimeByExtension[extension];

    if (!mime) {
      throw new Error(`対応していないアセット形式です: ${path}`);
    }

    assets[path] =
      `data:${mime};base64,${bytesToBase64(bytes)}`;
  }

  return {
    ...(parsed as SlideDocument),
    assets,
  };
}
