import type { SlideDocument } from "../core/slide-types";
import { SlideRenderer } from "../renderer/slide-renderer";

export class ViewerController {
  private index = 0;

  constructor(
    private readonly document: SlideDocument,
    private readonly renderer: SlideRenderer,
    private readonly $status: JQuery<HTMLElement>,
  ) {
    this.renderCurrent();
  }

  next(): void {
    if (this.index >= this.document.slides.length - 1) return;
    this.index += 1;
    this.renderCurrent();
  }

  previous(): void {
    if (this.index <= 0) return;
    this.index -= 1;
    this.renderCurrent();
  }

  private renderCurrent(): void {
    const slide = this.document.slides[this.index];
    this.renderer.render(slide);
    this.$status.text(
      `${this.index + 1} / ${this.document.slides.length} — ${slide.title}`,
    );
  }
}
