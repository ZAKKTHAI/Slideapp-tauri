import type {
  SlideDefinition,
  SlideDocument,
  TextElement,
} from "./slide-types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNumberInRange(
  value: unknown,
  min: number,
  max: number,
): value is number {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max;
}

function isTextElement(value: unknown): value is TextElement {
  if (!isRecord(value)) return false;

  return value.type === "text" &&
    typeof value.id === "string" &&
    typeof value.text === "string" &&
    isNumberInRange(value.x, 0, 100) &&
    isNumberInRange(value.y, 0, 100) &&
    isNumberInRange(value.width, 0, 100) &&
    isNumberInRange(value.height, 0, 100) &&
    isNumberInRange(value.fontSize, 1, 30) &&
    typeof value.color === "string";
}

function isSlideDefinition(value: unknown): value is SlideDefinition {
  if (!isRecord(value)) return false;

  if (
    typeof value.id !== "string" ||
    typeof value.title !== "string" ||
    typeof value.background !== "string" ||
    !Array.isArray(value.elements) ||
    !value.elements.every(isTextElement)
  ) {
    return false;
  }

  if (!isRecord(value.transition)) return false;

  return (
    (value.transition.type === "none" || value.transition.type === "fade") &&
    isNumberInRange(value.transition.durationMs, 0, 3000)
  );
}

export function parseSlideDocument(input: unknown): SlideDocument {
  if (!isRecord(input)) {
    throw new Error("スライドデータのルートはオブジェクトである必要があります");
  }

  if (
    input.version !== 1 ||
    typeof input.title !== "string" ||
    !Array.isArray(input.slides) ||
    input.slides.length === 0 ||
    !input.slides.every(isSlideDefinition)
  ) {
    throw new Error("スライドデータの形式が正しくありません");
  }

  return input as unknown as SlideDocument;
}
