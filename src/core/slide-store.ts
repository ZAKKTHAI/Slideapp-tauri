import type { SlideDocument } from "./slide-types";
import { parseSlideDocument } from "./slide-schema";

export class SlideStore {
  private currentDocument: SlideDocument | null = null;

  load(input: unknown): SlideDocument {
    const validated = parseSlideDocument(input);
    this.currentDocument = validated;
    return validated;
  }

  getCurrent(): SlideDocument | null {
    return this.currentDocument;
  }
}
