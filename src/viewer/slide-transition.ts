
import $ from "jquery";
import type { SlideTransition } from "../core/slide-types";

/**
 * jQueryの非同期アニメーションを使ってスライドを切り替える。
 *
 * React側の表示更新は updateSlide に委譲し、
 * jQueryは遷移領域のopacityだけを操作する。
 */
export async function transitionSlide(
  element: HTMLElement,
  transition: SlideTransition,
  updateSlide: () => void,
): Promise<void> {
  const $element = $(element);

  // 実行中の古いアニメーションを停止する。
  $element.stop(true, false);

  if (transition.type === "none" || transition.durationMs <= 0) {
    updateSlide();
    return;
  }

  const duration = transition.durationMs;
  const halfDuration = duration / 2;

  // 現在のスライドをフェードアウト。
  await new Promise<void>((resolve) => {
    $element.animate(
      { opacity: 0 },
      halfDuration,
      "swing",
      resolve,
    );
  });

  // Reactに新しいスライドを描画させる。
  updateSlide();

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });

  // 次のスライドをフェードイン。
  await new Promise<void>((resolve) => {
    $element.animate(
      { opacity: 1 },
      halfDuration,
      "swing",
      resolve,
    );
  });
}
