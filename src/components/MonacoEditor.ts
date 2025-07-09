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
      </style>
      <div class="container"></div>
    `;
  }

  connectedCallback() {
    const container = this.shadowRoot!.querySelector<HTMLDivElement>(".container")!;

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
