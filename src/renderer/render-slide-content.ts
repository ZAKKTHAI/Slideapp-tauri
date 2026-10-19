import MarkdownIt from "markdown-it";

const markdown = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
});

/**
 * HTML 内の <md>...</md> ブロックだけを Markdown として変換する。
 *
 * 注意:
 * - この関数は信頼できるローカルのスライドソースを対象とする。
 * - 任意の外部 HTML を安全化するサニタイザーではない。
 */
export function renderSlideContent(source: string): string {
  return source.replace(
    /<md(?:\s[^>]*)?>([\s\S]*?)<\/md\s*>/gi,
    (_match, markdownSource: string) => {
      return markdown.render(markdownSource.trim());
    },
  );
}

/**
 * プレビューの HTML 文書を生成する。
 * 1920 × 1080 のキャンバス内でスライドを表示する。
 */
import type { SlideTheme } from "../core/slide-types";

export function createSlidePreviewDocument(
  source: string,
  background = "#09090b",
  customCss = "",
  sharedCss = "",
  theme: SlideTheme = "dark",
): string {
  const renderedContent = renderSlideContent(source);

  const safeBackground = /^#[0-9a-fA-F]{3,8}$/.test(background)
    ? background
    : "#09090b";

  const themeCss = theme === "light"
    ? `
      --text: #171717;
      --muted: #52525b;
      --panel: #f3f4f6;
      --border: #d4d4d8;
      --code-bg: #e4e4e7;
      --slide-bg: #ffffff;
    `
    : `
      --text: #f4f4f5;
      --muted: #a1a1aa;
      --panel: #18181b;
      --border: #52525b;
      --code-bg: #18181b;
      --slide-bg: ${safeBackground};
    `;

  return `<!doctype html>
<html lang="ja" data-theme="${theme}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    :root {
      ${themeCss}
    }

    * {
      box-sizing: border-box;
    }

    html, body {
      margin: 0;
      width: 100%;
      height: 100%;
    }

    body {
      overflow: hidden;
      color: var(--text);
      background: var(--slide-bg);
      font-family: Inter, "Segoe UI", sans-serif;
    }

    .slide-canvas {
      width: 1920px;
      height: 1080px;
      padding: 80px;
      overflow: hidden;
      transform-origin: top left;
      font-size: 30px;
      line-height: 1.6;
      color: var(--text);
      background: var(--slide-bg);
    }

    .slide-canvas h1 {
      font-size: 76px;
      line-height: 1.15;
    }

    .slide-canvas h2 { font-size: 52px; }
    .slide-canvas h3 { font-size: 38px; }

    .slide-canvas img,
    .slide-canvas video {
      max-width: 100%;
      max-height: 100%;
    }

    .slide-canvas pre {
      padding: 24px;
      overflow: hidden;
      border-radius: 12px;
      background: var(--code-bg);
      font-size: 24px;
    }

    .slide-canvas code {
      font-family: "JetBrains Mono", monospace;
    }

    .slide-canvas table {
      width: 100%;
      border-collapse: collapse;
    }

    .slide-canvas th,
    .slide-canvas td {
      padding: 12px 16px;
      border: 1px solid var(--border);
      text-align: left;
    }

    /* 全スライド共通CSS */
    ${sharedCss}

    /* 旧プロジェクトのスライド専用CSS */
    ${customCss}
  </style>
</head>
<body>
  <main class="slide-canvas">
    ${renderedContent}
  </main>
  <script>
    (() => {
      const canvas = document.querySelector(".slide-canvas");

      function resizeCanvas() {
        const scale = Math.min(
          window.innerWidth / 1920,
          window.innerHeight / 1080
        );

        canvas.style.transform = "scale(" + scale + ")";
        document.body.style.width = (1920 * scale) + "px";
        document.body.style.height = (1080 * scale) + "px";
      }

      window.addEventListener("resize", resizeCanvas);
      resizeCanvas();
    })();
  </script>
</body>
</html>`;
}
