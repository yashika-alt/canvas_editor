class SyncToCanvas extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      .wrapper {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%; /* Ensure it stretches full height of parent */
        padding: 20px;
      }

      button {
        padding: 8px 16px;
        font-size: 14px;
        background-color: #007acc;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
    `;

    const wrapper = document.createElement("div");
    wrapper.className = "wrapper";

    const button = document.createElement("button");
    button.textContent = "🔄 Sync to Canvas";
    button.addEventListener("click", () => this.handleSync());

    wrapper.appendChild(button);
    this.shadowRoot?.append(style, wrapper);
  }

  handleSync() {
    const monacoEditor = document.querySelector("monaco-editor") as any;
    if (!monacoEditor?.getFileImported?.()) {
      this.showToast("❌ No file is imported so nothing can sync on canvas");
      return;
    }
    const xml = monacoEditor?.getContent?.();

    if (!xml) {
      this.showToast?.("❌ No XML content to sync");
      return;
    }

    document.dispatchEvent(
      new CustomEvent("sync-xml-to-canvas", {
        detail: { xml },
        bubbles: true,
        composed: true,
      })
    );

    this.showToast?.("✅ Canvas synced successfully", "success");
  }

  showToast(message: string, type: "success" | "error" = "error") {
    const toast = document.querySelector("toast-message") as any;
    toast?.show?.(message, type);
  }
}

customElements.define("sync-to-canvas", SyncToCanvas);
