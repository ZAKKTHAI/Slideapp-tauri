export interface TextElement {
  id: string;
  type: "text";
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
}

export type SlideTransition = {
  type: "fade" | "none";
  durationMs: number;
};

export interface SlideDefinition {
  id: string;
  title: string;
  background: string;
  elements: TextElement[];
  transition: SlideTransition;

  /**
   * HTML と <md> ブロックを混在させたスライドソース。
   * 既存の elements 形式との互換性のため optional にする。
   */
  content?: string;
  /**
   * スライド専用の CSS。
   * プレビュー・書き出し時に HTML の <style> へ統合する。
   */
  css?: string;

  // ブラウザスライド用。通常スライドでは省略。
  browser?: BrowserSlideConfig;
}

export interface SlideDocument {
  version: 1;
  title: string;
  slides: SlideDefinition[];

  /**
   * キーは assets/ から始まる相対パス。
   * 値は data URL。ZIP 保存時には画像を独立ファイルに変換する。
   */
  assets?: Record<string, string>;
}
export interface BrowserSlideConfig {
  url: string;
  ratio: "full" | "two-thirds" | "one-third";
}
