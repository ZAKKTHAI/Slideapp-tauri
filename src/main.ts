import $ from "jquery";
import { SlideStore } from "./core/slide-store";
import { SlideRenderer } from "./renderer/slide-renderer";
import { ViewerController } from "./viewer/viewer-controller";
import "./styles.css";

const sampleData: unknown = {
  version: 1,
  title: "Rust Slide Demo",
  slides: [
    {
      id: "intro",
      title: "Rust Slide",
      background: "#18181b",
      elements: [
        {
          id: "heading",
          type: "text",
          text: "Hello, Slides!",
          x: 10,
          y: 30,
          width: 80,
          height: 25,
          fontSize: 5,
          color: "#ffffff",
        },
      ],
      transition: { type: "fade", durationMs: 250 },
    },
    {
      id: "second",
      title: "TypeScript + jQuery",
      background: "#27272a",
      elements: [
        {
          id: "heading-2",
          type: "text",
          text: "TypeScript + jQuery",
          x: 10,
          y: 30,
          width: 80,
          height: 25,
          fontSize: 4,
          color: "#f9a8d4",
        },
      ],
      transition: { type: "fade", durationMs: 250 },
    },
  ],
};

$(function () {
  const $app = $("#app");
  $app.empty().append(`
    <main class="app-shell">
      <header class="toolbar">
        <strong>Rust Slide</strong>
        <div class="toolbar-actions">
          <button id="previous-slide" type="button">前へ</button>
          <span id="slide-status" aria-live="polite"></span>
          <button id="next-slide" type="button">次へ</button>
        </div>
      </header>
      <div id="slide-host" class="slide-host"></div>
      <p id="app-error" class="error-message" role="alert"></p>
    </main>
  `);

  try {
    const store = new SlideStore();
    const document = store.load(sampleData);
    const renderer = new SlideRenderer($("#slide-host"));
    const viewer = new ViewerController(
      document,
      renderer,
      $("#slide-status"),
    );

    $("#previous-slide").on("click", () => viewer.previous());
    $("#next-slide").on("click", () => viewer.next());

    $(document).on("keydown", (event) => {
      if (event.key === "ArrowRight") viewer.next();
      if (event.key === "ArrowLeft") viewer.previous();
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    $("#app-error").text(`スライドを表示できません: ${message}`);
  }
});
