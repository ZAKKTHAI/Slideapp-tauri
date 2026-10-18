import type { SlideDefinition } from "../core/slide-types";

interface SlideFrameProps {
  slide: SlideDefinition;
  html: string;
}

export default function SlideFrame({
  slide,
  html,
}: SlideFrameProps) {
  if (slide.browser) {
    return (
      <iframe
        className="viewer-frame viewer-frame--browser"
        title={slide.title}
        src={slide.browser.url}
        sandbox="allow-scripts allow-forms allow-same-origin"
      />
    );
  }

  return (
    <iframe
      className="viewer-frame"
      title={slide.title}
      srcDoc={html}
      sandbox="allow-scripts"
      tabIndex={-1}
    />
  );
}
