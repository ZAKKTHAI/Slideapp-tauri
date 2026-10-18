
import { useState } from "react";
import "./App.css";
import SlideEditor from "./editor/SlideEditor";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import type { SlideDocument } from "./core/slide-types";
import { readProjectArchive } from "./core/project-archive";
import SlideViewer from "./viewer/SlideViewer";

type Screen = "home" | "new-slide" | "load-slide" | "present";

function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [showSlideEditor, setShowSlideEditor] = useState(false);

  const [editorDocument, setEditorDocument] =
    useState<SlideDocument | null>(null);

  const [viewerDocument, setViewerDocument] =
    useState<SlideDocument | null>(null);

  if (showSlideEditor) {
    return (
      <SlideEditor
        initialDocument={editorDocument ?? undefined}
        onBack={() => {
          setShowSlideEditor(false);
          setEditorDocument(null);
        }}
      />
    );
  }

  if (viewerDocument) {
    return (
      <SlideViewer
        document={viewerDocument}
        onBack={() => setViewerDocument(null)}
      />
    );
  }

  async function openProject(mode: "edit" | "present") {
    try {
      const selected = await open({
        multiple: false,
        directory: false,
        filters: [
          {
            name: "Rust Slide Project",
            extensions: ["zip"],
          },
        ],
      });

      if (!selected || Array.isArray(selected)) return;

      const bytes = await readFile(selected);
      const project = readProjectArchive(bytes);

      if (mode === "edit") {
        setEditorDocument(project);
        setShowSlideEditor(true);
      } else {
        setViewerDocument(project);
      }
    } catch (error) {
      console.error("プロジェクトの読み込みに失敗しました:", error);
      window.alert(
        "プロジェクトを読み込めませんでした。\nZIPファイルが正しいか確認してください。",
      );
    }
  }

  function goHome() {
    setScreen("home");
    setCreateMenuOpen(false);
  }

  function renderHome() {
    return (
      <main className="home-screen">
        <header className="home-header">
          <h1>Rust Slide</h1>
          <p>Create. Present. Share your ideas.</p>
        </header>

        <section className="menu-list">
          <div className={`menu-card ${createMenuOpen ? "expanded" : ""}`}>
            <button
              type="button"
              className="menu-button"
              aria-expanded={createMenuOpen}
              onClick={() => setCreateMenuOpen((open) => !open)}
            >
              <span className="menu-icon create-icon">＋</span>

              <span className="menu-button-text">
                <strong>Create a slide</strong>
                <small>Create or load a presentation</small>
              </span>

              <span className="menu-chevron">
                {createMenuOpen ? "⌃" : "›"}
              </span>
            </button>

            {createMenuOpen && (
              <div className="submenu">
                <button
                  type="button"
                  className="submenu-button"
                  onClick={() => setShowSlideEditor(true)}
                >
                  <span className="submenu-icon">＋</span>
                  <span className="menu-button-text">
                    <strong>New slide</strong>
                    <small>Start a new presentation</small>
                  </span>
                  <span className="menu-chevron">›</span>
                </button>

                <button
                  type="button"
                  className="submenu-button"
                  onClick={() => void openProject("edit")}
                >
                  <span className="submenu-icon">↗</span>
                  <span className="menu-button-text">
                    <strong>Load slide</strong>
                    <small>Open an existing presentation</small>
                  </span>
                  <span className="menu-chevron">›</span>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className="menu-button menu-card"
            onClick={() => void openProject("present")}
          >
            <span className="menu-icon present-icon">▷</span>

            <span className="menu-button-text">
              <strong>Present the Slide</strong>
              <small>Start presenting your slides</small>
            </span>

            <span className="menu-chevron">›</span>
          </button>
        </section>

        <footer className="home-footer">
          BETA · WINDOWS / LINUX
        </footer>
      </main>
    );
  }

  function renderPlaceholder(title: string, description: string) {
    return (
      <main className="placeholder-screen">
        <div className="placeholder-card">
          <span className="placeholder-icon">✦</span>

          <p className="placeholder-label">RUST SLIDE / BETA</p>
          <h1>{title}</h1>
          <p className="placeholder-description">{description}</p>

          <div className="coming-soon">Coming soon</div>

          <button
            type="button"
            className="back-button"
            onClick={goHome}
          >
            <span>←</span> Back to menu
          </button>
        </div>
      </main>
    );
  }

  switch (screen) {
    case "new-slide":
      return renderPlaceholder(
        "New slide",
        "Create a new presentation from scratch.",
      );

    case "load-slide":
      return renderPlaceholder(
        "Load slide",
        "Open an existing presentation from your files.",
      );

    case "present":
      return renderPlaceholder(
        "Present the Slide",
        "Choose a presentation to start your slideshow.",
      );

    default:
      return renderHome();
  }
}

export default App;
