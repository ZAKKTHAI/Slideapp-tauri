import $ from "jquery";
import type { SlideDefinition } from "../core/slide-types";

export class SlideRenderer {
  constructor(private readonly $host: JQuery<HTMLElement>) {}

  render(slide: SlideDefinition): void {
    const $next = $("<section>")
      .addClass("slide-canvas")
      .attr("aria-label", slide.title)
      .css("background-color", slide.background);

    for (const element of slide.elements) {
      if (element.type !== "text") continue;

      const $text = $("<div>")
        .addClass("slide-text")
        .text(element.text)
        .css({
          left: `${element.x}%`,
          top: `${element.y}%`,
          width: `${element.width}%`,
          height: `${element.height}%`,
          fontSize: `${element.fontSize}cqw`,
          color: element.color,
        });

      $next.append($text);
    }

    // 新しいDOMを組み立ててから差し替えるため、途中の生成状態を見せない。
    this.$host.empty().append($next);
  }
}
