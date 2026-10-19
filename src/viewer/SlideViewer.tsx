import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import $ from "./carousel-plugins";
import type { SlideDocument } from "../core/slide-types";

import { createSlidePreviewDocument } from "../renderer/render-slide-content";
import "./SlideViewer.css";

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "owl.carousel/dist/assets/owl.carousel.css";
import "owl.carousel/dist/assets/owl.theme.default.css";


import { resolveAssetsToDataUrls } from "../core/slide-assets";

import BrowserOverlay from "./BrowserOverlay";

type CarouselMode = "slick" | "owl";

type SlickApi = JQuery<HTMLElement> & {
  slick: (
    command: string | Record<string, unknown>,
    ...args: unknown[]
  ) => unknown;
};

type OwlApi = JQuery<HTMLElement> & {
  owlCarousel: (options: Record<string, unknown>) => unknown;
};

interface SlideViewerProps {
  document: SlideDocument;
  onBack: () => void;
}

export default function SlideViewer({
  document,
  onBack,
}: SlideViewerProps) {
  const [carouselMode, setCarouselMode] = useState<CarouselMode>("slick");
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const slickRef = useRef<HTMLDivElement>(null);
  const owlRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(0);

  const slides = document.slides;

  const [browserVisible, setBrowserVisible] = useState(false);

  const slideHtmls = useMemo(
    () =>
      slides.map((slide) =>
        createSlidePreviewDocument(
          resolveAssetsToDataUrls(
            slide.content ?? "",
            document.assets ?? {},
          ),
          slide.background,
          resolveAssetsToDataUrls(
            slide.css ?? "",
            document.assets ?? {},
          ),
        ),
      ),
    [slides, document.assets],
  );

  const updateActiveIndex = useCallback(
    (index: number) => {
      const boundedIndex = Math.max(0, Math.min(index, slides.length - 1));
      activeIndexRef.current = boundedIndex;
      setActiveIndex(boundedIndex);
    },
    [slides.length],
  );

  // Slick の初期化と破棄
  useEffect(() => {
    if (carouselMode !== "slick" || !slickRef.current || slides.length === 0) {
      return;
    }

    const $carousel = $(slickRef.current) as unknown as SlickApi;

    $carousel.slick({
      initialSlide: activeIndexRef.current,
      slidesToShow: 1,
      slidesToScroll: 1,
      infinite: false,
      dots: true,
      arrows: true,
      adaptiveHeight: false,
      draggable: true,
      swipe: true,
      touchMove: true,
      speed: 300,
      accessibility: true,
      prevArrow:
        '<button type="button" class="slick-prev" aria-label="Previous slide">Previous</button>',
      nextArrow:
        '<button type="button" class="slick-next" aria-label="Next slide">Next</button>',
    });

    const handleAfterChange = (
      _event: JQuery.Event,
      slick: { currentSlide: number },
    ) => {
      updateActiveIndex(slick.currentSlide);
    };

    $carousel.on("afterChange", handleAfterChange);

    return () => {
      $carousel.off("afterChange", handleAfterChange);

      try {
        $carousel.slick("unslick");
      } catch (error) {
        console.error("Slick の終了処理に失敗しました:", error);
      }
    };
  }, [carouselMode, slides.length, updateActiveIndex]);

  // Owl Carousel 2 の初期化と破棄
  useEffect(() => {
    if (carouselMode !== "owl" || !owlRef.current || slides.length === 0) {
      return;
    }

    const $carousel = $(owlRef.current) as unknown as OwlApi;
    const $owlEvents = $carousel as JQuery<HTMLElement>;

    $carousel.owlCarousel({
      items: 1,
      startPosition: activeIndexRef.current,
      loop: false,
      margin: 0,
      nav: true,
      dots: true,
      navText: [
        '<span aria-hidden="true">←</span>',
        '<span aria-hidden="true">→</span>',
      ],
      smartSpeed: 300,
      mouseDrag: true,
      touchDrag: true,
      pullDrag: true,
      autoHeight: false,
    });
    const handleChanged = (event: JQuery.Event) => {
      const owlEvent = event as JQuery.Event & {
        item?: { index?: number };
      };

      if (typeof owlEvent.item?.index === "number") {
        updateActiveIndex(owlEvent.item.index);
      }
    };

    $owlEvents.on("changed.owl.carousel", handleChanged);

    return () => {
      $owlEvents.off("changed.owl.carousel", handleChanged);
      $owlEvents.trigger("destroy.owl.carousel");
    };
  }, [carouselMode, slides.length, updateActiveIndex]);

  const goToSlide = useCallback(
    (index: number) => {
      if (index < 0 || index >= slides.length) return;

      if (carouselMode === "slick" && slickRef.current) {
        ($(slickRef.current) as unknown as SlickApi).slick("slickGoTo", index);
      } else if (carouselMode === "owl" && owlRef.current) {
        ($(owlRef.current) as JQuery<HTMLElement>).trigger(
          "to.owl.carousel",
          [index, 300, true],
        );
      }

      updateActiveIndex(index);
    },
    [carouselMode, slides.length, updateActiveIndex],
  );

  const moveSlide = useCallback(
    (direction: -1 | 1) => {
      goToSlide(activeIndexRef.current + direction);
    },
    [goToSlide],
  );

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!window.document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await window.document.exitFullscreen();
      }
    } catch (error) {
      console.error("全画面表示に切り替えられませんでした:", error);
    }
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      switch (event.key) {
        case "ArrowLeft":
        case "PageUp":
          event.preventDefault();
          moveSlide(-1);
          break;

        case "ArrowRight":
        case "PageDown":
        case " ":
          event.preventDefault();
          moveSlide(1);
          break;

        case "Home":
          event.preventDefault();
          goToSlide(0);
          break;

        case "End":
          event.preventDefault();
          goToSlide(slides.length - 1);
          break;

        case "f":
        case "F":
          event.preventDefault();
          void toggleFullscreen();
          break;

        case "Escape":
          if (!window.document.fullscreenElement) onBack();
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [moveSlide, goToSlide, slides.length, toggleFullscreen, onBack]);

  if (slides.length === 0) {
    return (
      <main className="viewer-screen">
        <p>No slides to display.</p>
        <button type="button" onClick={onBack}>
          Back to menu
        </button>
      </main>
    );
  }

  return (
    <main className="viewer-screen" ref={containerRef}>
      <header className="viewer-header">
        <span className="viewer-project-title">{document.title}</span>

        <div className="viewer-header-actions">
          <label htmlFor="carousel-mode">Carousel</label>
          <select
            id="carousel-mode"
            value={carouselMode}
            onChange={(event) => setCarouselMode(event.target.value as CarouselMode)}
          >
            <option value="slick">Slick</option>
            <option value="owl">Owl Carousel 2</option>
          </select>

          <button
            type="button"
            onClick={() => setBrowserVisible((current) => !current)}
          >
            {browserVisible ? "Close browser" : "Open browser"}
          </button>

          <button type="button" onClick={onBack}>
            Exit presentation
          </button>
        </div>
      </header>

      <section className={`viewer-stage viewer-stage--${carouselMode}`}>
        {carouselMode === "slick" ? (
          <div className="viewer-carousel viewer-carousel--slick" ref={slickRef}>
            {slides.map((slide, index) => (
              <div className="viewer-carousel-item" key={slide.id}>
                <iframe
                  className="viewer-frame"
                  title={slide.title}
                  srcDoc={slideHtmls[index]}
                  sandbox="allow-scripts"
                  tabIndex={-1}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="viewer-carousel viewer-carousel--owl owl-carousel" ref={owlRef}>
            {slides.map((slide, index) => (
              <div className="viewer-carousel-item" key={slide.id}>
                <iframe
                  className="viewer-frame"
                  title={slide.title}
                  srcDoc={slideHtmls[index]}
                  sandbox="allow-scripts"
                  tabIndex={-1}
                />
              </div>
            ))}
          </div>
        )}
        <BrowserOverlay
          visible={browserVisible}
          initialUrl="https://example.com"
        />
      </section>

      <footer className="viewer-controls">
        <button
          type="button"
          onClick={() => moveSlide(-1)}
          disabled={activeIndex === 0}
          aria-label="Previous slide"
        >
          ←
        </button>

        <span className="viewer-counter" aria-live="polite">
          {activeIndex + 1} / {slides.length}
        </span>

        <button
          type="button"
          onClick={() => moveSlide(1)}
          disabled={activeIndex >= slides.length - 1}
          aria-label="Next slide"
        >
          →
        </button>

        <button type="button" onClick={() => void toggleFullscreen()}>
          Fullscreen
        </button>
      </footer>
    </main>
  );
}
