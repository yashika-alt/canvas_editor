// MonacoEditor.ts
import * as monaco from "monaco-editor";
import monacoCss from "monaco-editor/min/vs/editor/editor.main.css?inline";

export class MonacoEditor extends HTMLElement {
  private editor!: monaco.editor.IStandaloneCodeEditor;
  private ro!: ResizeObserver;
  private fileImported: boolean = false;


  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });

    /* 1️⃣  pull Monaco CSS into the shadow DOM */
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(monacoCss);
    root.adoptedStyleSheets = [sheet];

    /* 2️⃣  template */
    root.innerHTML = `
      <style>
        :host { display: block; height: 100%; }
        .container { height: 100%; width: 100%; }
           .monaco-toolbar {
              display: flex;
              justify-content: flex-end;
              align-items: center;
              padding: 16px 0 8px 0;
            }
            .download-btn {
              background: linear-gradient(90deg, #4f8cff 0%, #235390 100%);
              color: #fff;
              border: none;
              border-radius: 6px;
              padding: 8px 20px;
              font-size: 1rem;
              font-weight: 600;
              margin-right: 10px;
              cursor: pointer;
              box-shadow: 0 2px 8px rgba(79, 140, 255, 0.15);
              transition: background 0.2s, transform 0.2s;
              outline: none;
            }
            .download-btn:hover {
              background: linear-gradient(90deg, #235390 0%, #4f8cff 100%);
              transform: translateY(-2px) scale(1.04);
            }
      </style>
      <div class="container"></div>
    `;
  }

  connectedCallback() {
    const container = this.shadowRoot!.querySelector<HTMLDivElement>(".container")!;
    const downloadBtn = this.shadowRoot?.getElementById("download-btn");
    if (downloadBtn) {
      downloadBtn.addEventListener("click", () => {
        const xml = this.getContent();
        const blob = new Blob([xml], { type: "application/xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "diagram.xml";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 0);
      });
    }

    /* 3️⃣  create editor */
    this.editor = monaco.editor.create(container, {
      value: "<bpmn:definitions>…</bpmn:definitions>",
      language: "xml",
      theme: "vs-dark",
      automaticLayout: false,   // we’ll drive layout manually
    });

    /* 4️⃣  content-change handler */
    this.editor.onDidChangeModelContent(() => {
      const value = this.editor.getValue();
      this.dispatchEvent(new CustomEvent("code-updated", {
        detail: { value },
        bubbles: true,
        composed: true,
      }));
      this.validateXML(value);
      this.dispatchEvent(
        new CustomEvent("code-updated", {//sends a custom event "code-updated" from <monaco-editor>
          detail: { value },
          bubbles: true,
          composed: true,
        })
      );
      
    });

    /* 5️⃣  always lay out on size change */
    this.ro = new ResizeObserver(() => this.editor.layout());
    this.ro.observe(container);
  }

  disconnectedCallback() {
    this.ro.disconnect();
    this.editor.dispose();
  }

  /* public helpers ------------------------------------------------------- */
  setContent(text: string, language = "xml") {
    const model = monaco.editor.createModel(text, language);
    this.editor.setModel(model);
    this.editor.layout();
  }
  getContent() { return this.editor.getValue(); }


  layout() {
    this.editor?.layout();
  }


  /* simple XML validation example --------------------------------------- */
  private validateXML(xml: string) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "application/xml");
    const error = doc.querySelector("parsererror");
    monaco.editor.setModelMarkers(
      this.editor.getModel()!,
      "owner",
      error ? [{
        severity: monaco.MarkerSeverity.Error,
        message: error.textContent ?? "Invalid XML",
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 1,
      }] : [],
    );
  }

   setFileImported(imported: boolean) {
    this.fileImported = imported;
  }

  getFileImported(): boolean {
    return this.fileImported;
  }
}

customElements.define("monaco-editor", MonacoEditor);
