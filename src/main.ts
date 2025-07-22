import "./style.css";
import "./components/NavBar.ts";
import "./components/CanvasToolbar.ts";
import "./components/FileUpload.ts";
import "./components/ToastMessage.ts";
import "./components/MonacoEditor.ts";
import "monaco-editor/min/vs/editor/editor.main.css";
import "./components/EditableLabel.ts";
import "./components/SyncToCodeButton.ts";
import './components/InputNodeCard';
import './components/ProcessNodeCard';
import './components/FilterNodeCard';
import './components/LLMNodeCard.ts';
import './components/OutputNodeCard.ts';

async function getCytoscapeCanvasWithRetry(retries = 10, delay = 100): Promise<any> {
  for (let i = 0; i < retries; i++) {
    // Updated for new monolithic component
    const canvas = document.querySelector("cytoscape-editor") as any;
    if (canvas?.updateFromXML) return canvas;
    await new Promise(res => setTimeout(res, delay));
  }
  return null;
}

function showToast(message: string, type: "error" | "success" = "error") {
  const toastEl = document.querySelector("toast-message") as any;
  toastEl?.show?.(message, type);
}
(window as any).showToast = showToast;

document.addEventListener("DOMContentLoaded", () => {
  const sections = document.querySelectorAll<HTMLElement>(".section");

  // Navigation between sections
  document.body.addEventListener("navigate-section", (e: Event) => {
    const customEvent = e as CustomEvent;
    const targetId = customEvent.detail.targetId;
    sections.forEach((sec) => sec.classList.remove("visible"));

    const target = document.getElementById(targetId);
    if (target) {
      target.classList.add("visible");
      if (targetId === "editor") {
        const monacoEl = document.querySelector("monaco-editor") as any;
        requestAnimationFrame(() => monacoEl?.layout?.());
      }
    }
  });

  // File upload handling
  const fileUpload = document.querySelector("file-upload");
  fileUpload?.addEventListener("file-selected", async (e: Event) => {
    const file = (e as CustomEvent).detail.file as File;
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    if (!fileExtension || !["bpmn", "xml"].includes(fileExtension)) {
      showToast(
        "❌ Unsupported file type. Please upload a .bpmn or .xml file."
      );
      return;
    }
    try {
      const content = await file.text();
      const monacoEl = document.querySelector("monaco-editor") as any;
      monacoEl?.setContent?.(content);
      monacoEl?.setFileImported?.(true);
      showToast("✅ File loaded successfully.", "success");
      // Immediately sync to canvas after file upload
      document.dispatchEvent(
        new CustomEvent("sync-xml-to-canvas", {
          detail: { xml: content, isFileImport: true },
          bubbles: true,
          composed: true,
        })
      );
    } catch (err) {
      console.error("File read/render error:", err);
      showToast("❌ Failed to process the file.");
    }
  });

  document.addEventListener("sync-xml-to-canvas", async (e: Event) => {
    const xml = (e as CustomEvent).detail.xml;
    const isFileImport = (e as CustomEvent).detail.isFileImport || false;
    // Use retry helper to ensure cytoscape-canvas is available
    const canvas = await getCytoscapeCanvasWithRetry();
    if (canvas) {
      canvas.updateFromXML(xml, isFileImport);
    } else {
      console.warn("cytoscape-canvas not found or updateFromXML missing after retry");
    }
  });

  // Canvas to XML sync
  document.addEventListener("sync-canvas-to-xml", (e: Event) => {
    const xml = (e as CustomEvent).detail.xml;
    const monacoEl = document.querySelector("monaco-editor") as any;
    monacoEl?.setContent?.(xml);
  });

  // Listen for code changes in the Monaco editor and sync to canvas
  const monacoEl = document.querySelector("monaco-editor");
  monacoEl?.addEventListener("code-updated", (e: Event) => {
    const value = (e as CustomEvent).detail.value;
    document.dispatchEvent(
      new CustomEvent("sync-xml-to-canvas", {
        detail: { xml: value },
        bubbles: true,
        composed: true,
      })
    );
  });
});
