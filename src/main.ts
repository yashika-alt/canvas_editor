import "./style.css";
import "./components/NavBar.ts";
import "./components/CanvasToolbar.ts";
import "./components/FileUpload.ts";
import "./components/ToastMessage.ts";
import "./components/MonacoEditor.ts";
import "monaco-editor/min/vs/editor/editor.main.css";
import "./components/SyncToCanvas.ts";
import "./components/EditableLabel.ts";
import "./components/SyncToCodeButton.ts";




function showToast(message: string, type: "error" | "success" = "error") {
  const toastEl = document.querySelector("toast-message") as any;
  toastEl?.show?.(message, type);
}

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

      // 👇 Force Monaco layout when editor section becomes visible
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

    // ✅ Validate file type
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
    } catch (err) {
      console.error("File read/render error:", err);
      showToast("❌ Failed to process the file.");
    }
  });

      document.addEventListener("sync-xml-to-canvas", (e: Event) => {
    const xml = (e as CustomEvent).detail.xml;
    const canvas = document.querySelector("cytoscape-editor") as any;
    canvas?.updateFromXML?.(xml);
  });

  // Canvas to XML sync
  document.addEventListener("sync-canvas-to-xml", (e: Event) => {
    const xml = (e as CustomEvent).detail.xml;
    const monacoEl = document.querySelector("monaco-editor") as any;
    monacoEl?.setContent?.(xml);
  });


});
