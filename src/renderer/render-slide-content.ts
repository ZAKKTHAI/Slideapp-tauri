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
export function createSlidePreviewDocument(
  source: string,
  background = "#09090b",
  customCss = "",
): string {
  const renderedContent = renderSlideContent(source);

  // CSS の文字列として扱うため、背景色の形式を限定する。
  const safeBackground = /^#[0-9a-fA-F]{3,8}$/.test(background)
    ? background
    : "#09090b";

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />
  <style>
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
      color: #f4f4f5;
      background: ${safeBackground};
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
    }

    .slide-canvas h1 {
      font-size: 76px;
      line-height: 1.15;
    }

    .slide-canvas h2 {
      font-size: 52px;
    }

    .slide-canvas h3 {
      font-size: 38px;
    }

    .slide-canvas img,
    .slide-canvas video {
      max-width: 100%;
      max-height: 100%;
    }

    .slide-canvas pre {
      padding: 24px;
      overflow: hidden;
      border-radius: 12px;
      background: #18181b;
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
      border: 1px solid #52525b;
      text-align: left;
    }
    /* User CSS */
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

        canvas.style.transform =
          "scale(" + scale + ")";

        document.body.style.width =
          (1920 * scale) + "px";
        document.body.style.height =
          (1080 * scale) + "px";
      }

      window.addEventListener("resize", resizeCanvas);
      resizeCanvas();
    })();
  </script>
</body>
</html>`;
}
