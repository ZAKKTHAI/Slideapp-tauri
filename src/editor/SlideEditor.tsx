import { useCallback, useEffect, useMemo, useRef, useState, KeyboardEvent } from "react";
import type { SlideDefinition } from "../core/slide-types";
import { createSlidePreviewDocument } from "../renderer/render-slide-content";
import "./SlideEditor.css";
import { open, save } from "@tauri-apps/plugin-dialog";
import {
  readFile,
  writeFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";

import {
  resolveAssetsToDataUrls,
} from "../core/slide-assets";
import { createProjectArchive } from "../core/project-archive";
import type { SlideDocument } from "../core/slide-types";

const DEFAULT_BROWSER_URL = "https://chatgpt.com/";

const INITIAL_SOURCE = `<section class="hero">
  <md>
# Rust Slide

HTML と **Markdown** を融合する。

- Markdown で文章を書く
- HTML でレイアウトする
- CSS でデザインする
  </md>

  <div class="card">
    <h2>自由な HTML</h2>
    <p>画像・動画・独自レイアウトにも対応</p>
  </div>
</section>

<style>
  .hero {
    display: flex;
    flex-direction: column;
    justify-content: center;
    height: 100%;
  }

  .hero h1 {
    color: #f9a8d4;
  }

  .card {
    margin-top: 24px;
    padding: 24px;
    border: 1px solid #52525b;
    border-radius: 16px;
    background: #18181b;
  }
</style>`;

function createSlide(index: number): SlideDefinition {
  return {
    id: crypto.randomUUID(),
    title: `Slide ${index}`,
    background: "#09090b",
    elements: [],
    transition: {
      type: "fade",
      durationMs: 300,
    },
    content: index === 1
      ? INITIAL_SOURCE
      : `<section style="display:grid;place-items:center;height:100%">
  <md>
# Slide ${index}

新しいスライドの内容を入力してください。
  </md>
</section>`,
  };
}

interface SlideEditorProps {
  onBack: () => void;
  initialDocument?: SlideDocument;
}


export default function SlideEditor({
  onBack,
  initialDocument,
}: SlideEditorProps) {
  const [slides, setSlides] = useState<SlideDefinition[]>(
    () => initialDocument?.slides ?? [createSlide(1)],
  );
  const [activeId, setActiveId] = useState(slides[0].id);
  const [previewVisible, setPreviewVisible] = useState(true);

  const sourceEditorRef = useRef<HTMLTextAreaElement>(null);

  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const restoringHistoryRef = useRef(false);

  const [webAiMenuOpen, setWebAiMenuOpen] = useState(false);

  const activeSlide =
    slides.find((slide) => slide.id === activeId) ?? slides[0];

  const [assets, setAssets] = useState<Record<string, string>>(
    () => initialDocument?.assets ?? {},
  );

  const lastSourceRef = useRef(activeSlide.content ?? "");

  // 初回保存で選択したパスを保持する。
  // タイトルやスライドを変更しても、次回は同じファイルへ保存する。
  const projectPathRef = useRef<string | null>(null);

  // 連続した Ctrl + S による同時保存を防ぐ。
  const isSavingRef = useRef(false);

  const saveProject = useCallback(async () => {
    if (isSavingRef.current) return;

    isSavingRef.current = true;

    try {
      let path = projectPathRef.current;

      // 初回だけ保存先を選択する。
      if (!path) {
        const selectedPath = await save({
          defaultPath: "MyPresentation.zip",
          filters: [
            {
              name: "Slide Project",
              extensions: ["zip"],
            },
          ],
        });

        // ダイアログがキャンセルされた場合は何もしない。
        if (!selectedPath) return;

        path = /\.zip$/i.test(selectedPath)
          ? selectedPath
          : `${selectedPath}.zip`;
      }

      const document: SlideDocument = {
        version: 1,
        title: "MyPresentation",
        slides,
        assets,
      };

      // HTML・CSSを含む編集データからZIPを生成する。
      const archive = createProjectArchive(document);

      // ZIPはバイナリとして保存する。
      await writeFile(path, archive);

      // 保存成功後にパスを記憶する。
      // 初回保存に失敗した場合は次回もう一度ダイアログを表示する。
      projectPathRef.current = path;
    } catch (error) {
      console.error("プロジェクトの保存に失敗しました:", error);
      window.alert("プロジェクトを保存できませんでした。コンソールを確認してください。");
    } finally {
      isSavingRef.current = false;
    }
  }, [slides, assets]);

  useEffect(() => {
    lastSourceRef.current = activeSlide.content ?? "";
  }, [activeId]);

  const previewDocument = useMemo(
    () =>
      createSlidePreviewDocument(
        resolveAssetsToDataUrls(
          activeSlide.content ?? "",
          assets,
        ),
        activeSlide.background,
        resolveAssetsToDataUrls(
          activeSlide.css ?? "",
          assets,
        ),
      ),
    [
      activeSlide.content,
      activeSlide.background,
      activeSlide.css,
      assets,
    ],
  );

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "s"
      ) {
        event.preventDefault();
        event.stopPropagation();

        void saveProject();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [saveProject]);



  const [sourceMode, setSourceMode] = useState<"html" | "css">("html");

  function updateActiveSlide(
    updates: Partial<SlideDefinition>,
  ) {
    setSlides((current) =>
      current.map((slide) =>
        slide.id === activeId
          ? { ...slide, ...updates }
          : slide,
      ),
    );
  }

  /**
   * HTML ソースへコードを挿入する。
   * HTML モードならカーソル位置、CSS モードなら末尾に挿入する。
   */
  function insertHtmlSnippet(snippet: string) {
    const current = activeSlide.content ?? "";
    const textarea = sourceEditorRef.current;

    let start = current.length;
    let end = current.length;

    if (sourceMode === "html" && textarea) {
      start = textarea.selectionStart;
      end = textarea.selectionEnd;
    }

    const next =
      current.slice(0, start) +
      snippet +
      current.slice(end);

    setSourceMode("html");
    handleSourceChange(next);

    requestAnimationFrame(() => {
      const editor = sourceEditorRef.current;
      if (!editor) return;

      editor.focus();

      const cursor = start + snippet.length;
      editor.setSelectionRange(cursor, cursor);
    });
  }

  /**
   * ローカル画像を読み込み、アセットとして保存する。
   */
  async function insertImage() {
    try {
      const selected = await open({
        multiple: false,
        title: "スライドに挿入する画像を選択",
        filters: [
          {
            name: "画像",
            extensions: [
              "png", "jpg", "jpeg", "webp",
              "gif", "svg", "avif", "bmp",
            ],
          },
        ],
      });

      if (!selected || Array.isArray(selected)) return;

      const extension =
        selected.split(/[\\/]/).pop()?.split(".").pop()?.toLowerCase() ?? "";

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
        window.alert("対応していない画像形式です。");
        return;
      }

      const bytes = await readFile(selected);

      // ブラウザ標準 API でバイナリを Base64 化する。
      let binary = "";
      const chunkSize = 0x8000;

      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(
          ...bytes.subarray(i, i + chunkSize),
        );
      }

      const dataUrl = `data:${mime};base64,${btoa(binary)}`;
      const assetPath =
        `assets/${crypto.randomUUID()}.${extension}`;

      setAssets((current) => ({
        ...current,
        [assetPath]: dataUrl,
      }));

      insertHtmlSnippet(
        `<img src="${assetPath}" alt="" style="max-width:100%;height:auto;" />`,
      );
    } catch (error) {
      console.error("画像の挿入に失敗しました:", error);
      window.alert("画像を挿入できませんでした。");
    }
  }

  /**
   * URL の形式を検証する。
   */
  function requestUrl(): string | null {
    const input = window.prompt("挿入する URL を入力してください。");
    if (!input) return null;

    try {
      const url = new URL(input.trim());

      if (url.protocol !== "https:" && url.protocol !== "http:") {
        window.alert("http:// または https:// の URL を指定してください。");
        return null;
      }

      return url.href;
    } catch {
      window.alert("URL の形式が正しくありません。");
      return null;
    }
  }

  /**
   * YouTube URL を埋め込み URL に変換する。
   */
  function getYouTubeEmbedUrl(urlString: string): string | null {
    try {
      const url = new URL(urlString);
      let videoId: string | null = null;

      if (url.hostname === "youtu.be") {
        videoId = url.pathname.slice(1);
      } else if (
        url.hostname === "youtube.com" ||
        url.hostname.endsWith(".youtube.com") ||
        url.hostname === "www.youtube-nocookie.com"
      ) {
        if (url.pathname === "/watch") {
          videoId = url.searchParams.get("v");
        } else {
          const match = url.pathname.match(
            /^\/(?:embed|shorts|live)\/([^/?]+)/,
          );
          videoId = match?.[1] ?? null;
        }
      }

      if (!videoId || !/^[\w-]{11}$/.test(videoId)) {
        return null;
      }

      return `https://www.youtube-nocookie.com/embed/${videoId}`;
    } catch {
      return null;
    }
  }

  /**
   * 動画・Web ページ・AI サービスを HTML として挿入する。
   */
  function insertUrlContent(kind: "video" | "web" | "ai") {
    const url = requestUrl();
    if (!url) return;

    const escapedUrl = url.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

    if (kind === "video") {
      const youtubeUrl = getYouTubeEmbedUrl(url);

      if (youtubeUrl) {
        insertHtmlSnippet(`
  <div class="slide-video" style="position:relative;width:100%;aspect-ratio:16/9;">
    <iframe
      src="${youtubeUrl}"
      title="YouTube video"
      style="position:absolute;inset:0;width:100%;height:100%;border:0;"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen
    ></iframe>
  </div>
  `);
        return;
      }

      if (/\.(mp4|webm|ogg)(?:$|[?#])/i.test(url)) {
        insertHtmlSnippet(`
  <video
    src="${escapedUrl}"
    controls
    playsinline
    style="max-width:100%;max-height:80%;"
  ></video>
  `);
        return;
      }

      window.alert(
        "YouTube または mp4・webm・ogg の動画 URL を指定してください。",
      );
      return;
    }

    const label = kind === "ai" ? "AI サービスを開く" : "Web ページを開く";

    insertHtmlSnippet(`
  <section class="embedded-page" style="width:100%;height:100%;min-height:500px;display:flex;flex-direction:column;gap:8px;">
    <iframe
      src="${escapedUrl}"
      title="${label}"
      style="width:100%;flex:1;min-height:400px;border:1px solid #52525b;border-radius:8px;"
      loading="lazy"
      allow="clipboard-read; clipboard-write; fullscreen"
      referrerpolicy="strict-origin-when-cross-origin"
    ></iframe>
    <p>
      埋め込みできない場合：
      <a href="${escapedUrl}" target="_blank" rel="noopener noreferrer">${label}</a>
    </p>
  </section>
  `);
  }

  function handleSourceKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) {
    const isCtrlOrMeta = event.ctrlKey || event.metaKey;

    // Shift + Insert: Paste
    if (event.shiftKey && event.key === "Insert") {
      event.preventDefault();

      void navigator.clipboard.readText().then((text) => {
        const textarea = sourceEditorRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const current = activeSlide.content ?? "";

        updateActiveSlide({
          content:
            current.slice(0, start) +
            text +
            current.slice(end),
        });

        requestAnimationFrame(() => {
          textarea.focus();
          textarea.setSelectionRange(
            start + text.length,
            start + text.length,
          );
        });
      }).catch((error) => {
        console.error("Paste failed:", error);
      });

      return;
    }

    if (!isCtrlOrMeta) return;

    const key = event.key.toLowerCase();

    // Ctrl + Y: Redo
    if (key === "y" && !event.shiftKey) {
      event.preventDefault();
      redoSource();
      return;
    }

    // Ctrl + Shift + Z: Redo（一般的な代替操作）
    if (key === "z" && event.shiftKey) {
      event.preventDefault();
      redoSource();
      return;
    }

    // Ctrl + Z: Undo
    if (key === "z") {
      event.preventDefault();
      undoSource();
      return;
    }

    // Ctrl + C / V は textarea の標準動作を利用する。
    // ブラウザ標準のコピー・貼り付けを妨げない。
  }

  function handleSourceChange(value: string) {
    const previous = lastSourceRef.current;

    if (!restoringHistoryRef.current && value !== previous) {
      undoStackRef.current.push(previous);

      // 履歴が無制限に増えるのを防ぐ
      if (undoStackRef.current.length > 200) {
        undoStackRef.current.shift();
      }

      redoStackRef.current = [];
    }

    lastSourceRef.current = value;
    updateActiveSlide({ content: value });
  }

  function restoreSource(value: string) {
    restoringHistoryRef.current = true;
    lastSourceRef.current = value;
    updateActiveSlide({ content: value });

    requestAnimationFrame(() => {
      restoringHistoryRef.current = false;
      sourceEditorRef.current?.focus();
    });
  }

  function undoSource() {
    const previous = undoStackRef.current.pop();
    if (previous === undefined) return;

    redoStackRef.current.push(lastSourceRef.current);
    restoreSource(previous);
  }

  function redoSource() {
    const next = redoStackRef.current.pop();
    if (next === undefined) return;

    undoStackRef.current.push(lastSourceRef.current);
    restoreSource(next);
  }

  function addSlide() {
    const next = createSlide(slides.length + 1);

    setSlides((current) => [...current, next]);
    setActiveId(next.id);
  }

  function deleteSlide(id: string) {
    if (slides.length <= 1) return;

    const index = slides.findIndex((slide) => slide.id === id);
    const remaining = slides.filter((slide) => slide.id !== id);

    setSlides(remaining);

    if (id === activeId) {
      setActiveId(remaining[Math.max(0, index - 1)].id);
    }
  }

  function addBrowserSlide() {
    const next = createBrowserSlide(slides.length + 1);

    setSlides((current) => [...current, next]);
    setActiveId(next.id);
  }


  async function exportHtml() {
    try {
      const documentHtml = createSlidePreviewDocument(
        resolveAssetsToDataUrls(
          activeSlide.content ?? "",
          assets,
        ),
        activeSlide.background,
        resolveAssetsToDataUrls(
          activeSlide.css ?? "",
          assets,
        ),
      );

      const filename =
        activeSlide.title
          .trim()
          .replace(/[\\/:*?"<>|]/g, "_") || "slide";

      const path = await save({
        title: "HTMLスライドを書き出す",
        defaultPath: `${filename}.html`,
        filters: [
          {
            name: "HTMLファイル",
            extensions: ["html"],
          },
        ],
      });

      // 保存ダイアログでキャンセルされた場合
      if (!path) return;

      await writeTextFile(path, documentHtml);

      window.alert("HTMLを書き出しました。");
    } catch (error) {
      console.error("HTML export failed:", error);
      window.alert("HTMLの書き出しに失敗しました。コンソールを確認してください。");
    }
  }

  function selectSlide(id: string) {
    const target = slides.find((slide) => slide.id === id);
    if (!target) return;

    undoStackRef.current = [];
    redoStackRef.current = [];
    lastSourceRef.current = target.content ?? "";
    setActiveId(id);
  }

  function createBrowserSlide(index: number): SlideDefinition {
    return {
      id: crypto.randomUUID(),
      title: `Browser ${index}`,
      background: "#09090b",
      elements: [],
      transition: { type: "fade", durationMs: 300 },
      browser: {
        url: "https://chatgpt.com/",
        ratio: "full",
      },
    };
  }


  return (
    <main className="slide-editor">
      <header className="editor-toolbar">
        <button
          className="toolbar-button"
          onClick={onBack}
          type="button"
        >
          ← メニュー
        </button>

        <div className="editor-brand">
          <strong>Rust Slide</strong>
          <span>EDITOR</span>
        </div>

        <div className="toolbar-actions">
          <button
            className="toolbar-button"
            onClick={() => setPreviewVisible((visible) => !visible)}
            type="button"
          >
            {previewVisible ? "プレビューを隠す" : "プレビューを表示"}
          </button>

          <button
            className="toolbar-button toolbar-primary"
            onClick={exportHtml}
            type="button"
          >
            HTMLを書き出す
          </button>
        </div>
      </header>

      <div
        className={`editor-workspace ${
          previewVisible ? "" : "preview-hidden"
        }`}
      >
        <aside className="slide-sidebar">
          <div className="panel-heading">
            <span>SLIDES</span>
            <button
              className="icon-button"
              onClick={addSlide}
              type="button"
              aria-label="スライドを追加"
              title="スライドを追加"
            >
              +
            </button>
            <button
              className="icon-button"
              onClick={addBrowserSlide}
              type="button"
              aria-label="ブラウザスライドを追加"
              title="ブラウザスライドを追加"
            >
              🌐
            </button>
          </div>

          <div className="slide-list">
            {slides.map((slide, index) => (
              <div
                className={`slide-list-item ${
                  slide.id === activeId ? "selected" : ""
                }`}
                key={slide.id}
              >
                <button
                  className="slide-select"
                  onClick={() => selectSlide(slide.id)}
                  type="button"
                >
                  <span className="slide-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="slide-list-title">
                    {slide.title}
                  </span>
                </button>

                <button
                  className="slide-delete"
                  onClick={() => deleteSlide(slide.id)}
                  type="button"
                  disabled={slides.length <= 1}
                  aria-label={`${slide.title}を削除`}
                  title="スライドを削除"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="sidebar-footer">
            {slides.length} SLIDE{slides.length === 1 ? "" : "S"}
          </div>
        </aside>

        <section className="source-panel">
          <div className="panel-heading source-heading">
            <span>SOURCE</span>

            <div className="source-mode-tabs">
              <button
                type="button"
                className={`source-mode-tab ${
                  sourceMode === "html" ? "active" : ""
                }`}
                onClick={() => setSourceMode("html")}
              >
                HTML
              </button>

              <button
                type="button"
                className={`source-mode-tab ${
                  sourceMode === "css" ? "active" : ""
                }`}
                onClick={() => setSourceMode("css")}
              >
                CSS
              </button>
            </div>
            <div className="media-toolbar">
              <span className="media-toolbar-label">INSERT</span>

              <button
                type="button"
                className="toolbar-button"
                onClick={() => void insertImage()}
              >
                画像
              </button>

              <button
                type="button"
                className="toolbar-button"
                onClick={() => insertUrlContent("video")}
              >
                動画 / YouTube
              </button>

              <button
                type="button"
                className="toolbar-button"
                onClick={() => insertUrlContent("web")}
              >
                Web ページ
              </button>

              <div className="web-ai-menu">
                <button
                  type="button"
                  className="toolbar-button"
                  aria-expanded={webAiMenuOpen}
                  onClick={() => setWebAiMenuOpen((open) => !open)}
                >
                  Web / AI ▾
                </button>

                {webAiMenuOpen && (
                  <div className="web-ai-menu-list">
                    <button
                      type="button"
                      onClick={() => {
                        setWebAiMenuOpen(false);
                        insertUrlContent("web");
                      }}
                    >
                      <span>🌐</span>
                      Web ページ
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setWebAiMenuOpen(false);
                        insertUrlContent("ai");
                      }}
                    >
                      <span>🤖</span>
                      AI サービス
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="slide-properties">
            <label className="property-field">
              <span>タイトル</span>
              <input
                value={activeSlide.title}
                onChange={(event) =>
                  updateActiveSlide({ title: event.target.value })
                }
                placeholder="スライドタイトル"
              />
            </label>

            <label className="property-field background-field">
              <span>背景色</span>
              <input
                aria-label="背景色"
                type="color"
                value={activeSlide.background}
                onChange={(event) =>
                  updateActiveSlide({ background: event.target.value })
                }
              />
            </label>

            <label className="property-field">
              <span>切り替え効果</span>
              <select
                value={activeSlide.transition.type}
                onChange={(event) => {
                  const type =
                    event.target.value === "none" ? "none" : "fade";

                  updateActiveSlide({
                    transition: {
                      ...activeSlide.transition,
                      type,
                    },
                  });
                }}
              >
                <option value="none">なし</option>
                <option value="fade">フェード</option>
              </select>
            </label>

            <label className="property-field transition-duration-field">
              <span>
                切り替え時間
                <strong>{activeSlide.transition.durationMs} ms</strong>
              </span>
              <input
                type="range"
                min={0}
                max={2000}
                step={100}
                value={activeSlide.transition.durationMs}
                onChange={(event) =>
                  updateActiveSlide({
                    transition: {
                      ...activeSlide.transition,
                      durationMs: Number(event.target.value),
                    },
                  })
                }
              />
            </label>

            {activeSlide.browser && (
              <>
                <label className="property-field">
                  <span>ブラウザ URL</span>
                  <input
                    type="url"
                    value={activeSlide.browser.url}
                    onChange={(event) =>
                      updateActiveSlide({
                        browser: {
                          ...activeSlide.browser!,
                          url: event.target.value,
                        },
                      })
                    }
                    placeholder="https://example.com"
                  />
                </label>

                <label className="property-field">
                  <span>ブラウザ表示比率</span>
                  <select
                    value={activeSlide.browser.ratio ?? "full"}
                    onChange={(event) =>
                      updateActiveSlide({
                        browser: {
                          ...activeSlide.browser!,
                          ratio: event.target.value as
                            | "full"
                            | "two-thirds"
                            | "one-third",
                        },
                      })
                    }
                  >
                    <option value="full">全画面（100%）</option>
                    <option value="two-thirds">ブラウザ 2/3・説明 1/3</option>
                    <option value="one-third">ブラウザ 1/3・説明 2/3</option>
                  </select>
                </label>
              </>
            )}

          </div>

          <div className="source-editor-wrap">
            <div className="source-gutter" aria-hidden="true">
              {(sourceMode === "html"
                ? activeSlide.content ?? ""
                : activeSlide.css ?? ""
              )
                .split("\n")
                .map((_, index) => (
                  <span key={index}>{index + 1}</span>
                ))}
            </div>

            <textarea
              ref={sourceEditorRef}
              onKeyDown={handleSourceKeyDown}
              className="source-editor"
              aria-label={
                sourceMode === "html"
                  ? "HTML と Markdown のソース"
                  : "CSS ソース"
              }
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              value={
                sourceMode === "html"
                  ? activeSlide.content ?? ""
                  : activeSlide.css ?? ""
              }
              onChange={(event) => {
                const value = event.target.value;

                if (sourceMode === "html") {
                  handleSourceChange(value);
                } else {
                  updateActiveSlide({ css: value });
                }
              }}
            />

          </div>

          <footer className="source-footer">
            <span>
              <span className="status-dot" />
              編集内容をプレビューに反映
            </span>
            <span>{(activeSlide.content ?? "").length} chars</span>
          </footer>
        </section>

        {previewVisible && (
          <section className="preview-panel">
            <div className="panel-heading">
              <span>PREVIEW</span>
              <span className="preview-resolution">1920 × 1080</span>
            </div>

            <div className="preview-stage">
              <iframe
                key={activeSlide.id}
                className="preview-frame"
                title={`${activeSlide.title} のプレビュー`}
                sandbox="allow-scripts"
                srcDoc={previewDocument}
              />
            </div>

            <footer className="preview-footer">
              <span>{activeSlide.title || "Untitled"}</span>
              <span>
                {slides.findIndex((slide) => slide.id === activeId) + 1}
                {" / "}
                {slides.length}
              </span>
            </footer>
          </section>
        )}
      </div>
    </main>
  );
}
