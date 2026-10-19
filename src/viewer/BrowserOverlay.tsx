import { useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Webview } from "@tauri-apps/api/webview";
import { LogicalPosition, LogicalSize } from "@tauri-apps/api/dpi";
import "./BrowserOverlay.css";


interface BrowserOverlayProps {
  visible: boolean;
  initialUrl?: string;
}

function normalizeUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

export default function BrowserOverlay({
  visible,
  initialUrl = "https://example.com",
}: BrowserOverlayProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const webviewRef = useRef<Webview | null>(null);

  const [error, setError] = useState("");


  useEffect(() => {
    if (!visible || !hostRef.current) {
      return;
    }

    const host = hostRef.current;
    const initial = normalizeUrl(initialUrl);

    if (!initial) {
      setError("初期URLが不正です。");
      return;
    }

    let disposed = false;
    const label = `slide-browser-${crypto.randomUUID()}`;

    const getBounds = () => {
      const rect = host.getBoundingClientRect();

      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      };
    };

    const bounds = getBounds();

    if (bounds.width <= 0 || bounds.height <= 0) {
      return;
    }

    let webview: Webview;

    try {
      webview = new Webview(getCurrentWindow(), label, {
        url: initial,
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      });
    } catch (reason) {
      console.error("Browser creation failed:", reason);
      setError("ブラウザを作成できませんでした。");
      return;
    }

    webviewRef.current = webview;

    const syncBounds = () => {
      if (disposed) return;

      const rect = getBounds();

      if (rect.width <= 0 || rect.height <= 0) return;

      void Promise.all([
        webview.setPosition(new LogicalPosition(rect.x, rect.y)),
        webview.setSize(new LogicalSize(rect.width, rect.height)),
      ]).catch((reason: unknown) => {
        console.error("Browser resize failed:", reason);
      });
    };

    void webview.once("tauri://created", () => {
      if (disposed) {
        void webview.close();
        return;
      }

      syncBounds();
      setError("");
    });

    void webview.once("tauri://error", (reason) => {
      console.error("Browser creation error:", reason);
      if (!disposed) {
        setError("外部WebViewの初期化に失敗しました。");
      }
    });

    const observer = new ResizeObserver(syncBounds);
    observer.observe(host);
    window.addEventListener("resize", syncBounds);

    return () => {
      disposed = true;
      observer.disconnect();
      window.removeEventListener("resize", syncBounds);

      if (webviewRef.current === webview) {
        webviewRef.current = null;
      }

      void webview.close().catch((reason: unknown) => {
        console.error("Browser close failed:", reason);
      });
    };
  }, [visible, initialUrl]);

  if (!visible) {
    return null;
  }

  return (
    <section className="browser-overlay">
      {error && <p className="browser-error">{error}</p>}

      <div
        ref={hostRef}
        className="browser-host"
        aria-label="外部Webサイト表示領域"
      />
    </section>
  );
}
