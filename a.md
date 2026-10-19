
# CSS Template Demo

<style>
:root {
  --slide-bg: #09090b;
  --slide-text: #f4f4f5;
  --slide-accent: #60a5fa;
  --slide-card: #18181b;
  --slide-border: #3f3f46;
}

.slide-canvas {
  background: var(--slide-bg);
  color: var(--slide-text);
  font-family: Inter, system-ui, sans-serif;
  transition: background 180ms ease, color 180ms ease;
}

.slide-canvas .template-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 32px;
}

.slide-canvas .template-toolbar button {
  padding: 10px 16px;
  border: 1px solid var(--slide-border);
  border-radius: 10px;
  background: var(--slide-card);
  color: var(--slide-text);
  cursor: pointer;
  font-size: 14px;
  transition: 160ms ease;
}

.slide-canvas .template-toolbar button:hover {
  border-color: var(--slide-accent);
  transform: translateY(-2px);
}

.slide-canvas .template-toolbar button[aria-pressed="true"] {
  background: var(--slide-accent);
  color: #ffffff;
  border-color: var(--slide-accent);
}

.slide-canvas .demo-card {
  padding: 28px;
  border: 1px solid var(--slide-border);
  border-radius: 18px;
  background: var(--slide-card);
  margin-top: 20px;
}

.slide-canvas .demo-card h2 {
  color: var(--slide-accent);
}

.slide-canvas .demo-card p {
  line-height: 1.8;
}

.slide-canvas[data-theme="light"] {
  --slide-bg: #ffffff;
  --slide-text: #18181b;
  --slide-accent: #2563eb;
  --slide-card: #eff6ff;
  --slide-border: #bfdbfe;
}

.slide-canvas[data-template="purple"] {
  --slide-accent: #a78bfa;
  --slide-card: #211a35;
  --slide-border: #51416f;
}

.slide-canvas[data-theme="light"][data-template="purple"] {
  --slide-accent: #7c3aed;
  --slide-card: #f5f3ff;
  --slide-border: #ddd6fe;
}
</style>

<div class="template-toolbar">
  <button type="button" data-theme-choice="dark" aria-pressed="true">
    🌙 Dark
  </button>
  <button type="button" data-theme-choice="light" aria-pressed="false">
    ☀️ White
  </button>
  <button type="button" data-template-choice="blue" aria-pressed="true">
    🔵 Blue Template
  </button>
  <button type="button" data-template-choice="purple" aria-pressed="false">
    🟣 Purple Template
  </button>
</div>

<div class="demo-card">
  <h2>CSS Template Preview</h2>
  <p>
    このカードは選択したCSSテンプレートとテーマに応じて、
    背景・文字色・アクセントカラーが変化します。
  </p>
</div>

<script>
(() => {
  const root = document.querySelector(".slide-canvas");
  if (!root || root.dataset.templateDemoReady) return;

  root.dataset.templateDemoReady = "true";
  root.dataset.theme = "dark";
  root.dataset.template = "blue";

  root.querySelectorAll("[data-theme-choice]").forEach(button => {
    button.addEventListener("click", () => {
      root.dataset.theme = button.dataset.themeChoice;

      root.querySelectorAll("[data-theme-choice]").forEach(item => {
        item.setAttribute(
          "aria-pressed",
          String(item === button)
        );
      });
    });
  });

  root.querySelectorAll("[data-template-choice]").forEach(button => {
    button.addEventListener("click", () => {
      root.dataset.template = button.dataset.templateChoice;

      root.querySelectorAll("[data-template-choice]").forEach(item => {
        item.setAttribute(
          "aria-pressed",
          String(item === button)
        );
      });
    });
  });
})();
</script>
