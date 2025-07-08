import * as monaco from "monaco-editor";

class MonacoEditor extends HTMLElement {
  private editorInstance!: monaco.editor.IStandaloneCodeEditor;
  private fileImported: boolean = false;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });

    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <style>
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
        .monaco-container {
          height: 100vh;
          width: 100%;
        }
      </style>
      <div class="monaco-toolbar">
        <button class="download-btn" id="download-btn" title="Download XML">
          ⬇️
        </button>
      </div>
      <div class="monaco-container" id="monaco-container"></div>
    `;
    shadow.appendChild(wrapper);
  }

  connectedCallback() {
    const container = this.shadowRoot?.getElementById("monaco-container")!;
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
    requestAnimationFrame(() => {
      this.editorInstance = monaco.editor.create(container, {
        value: "<bpmn:definitions>...</bpmn:definitions>",
        language: "xml",
        theme: "vs-dark",
        automaticLayout: true,
      });

      //runs whenever the user changes the content in the Monaco Editor
      this.editorInstance.onDidChangeModelContent(() => {
        const xml = this.editorInstance.getValue();//gets the current XML code from the editor.
        this.validateXML(xml);

        this.dispatchEvent(
          new CustomEvent("code-updated", {//sends a custom event "code-updated" from <monaco-editor>
            detail: { xml },
            bubbles: true,
            composed: true,
          })
        );
      });

      // Trigger initial layout fix
      setTimeout(() => this.editorInstance?.layout(), 50);
    });

    //whenever the browser window resize, the monaco editor will adjust itself to fit in new size
    window.addEventListener("resize", this.handleResize);
  }

  
  disconnectedCallback() {
    window.removeEventListener("resize", this.handleResize);
  }


  handleResize = () => {
    this.editorInstance?.layout();
  };

  
  setContent(xml: string) {
    this.editorInstance?.setValue(xml);
    this.validateXML(xml);
  }

  getContent(): string {
    return this.editorInstance?.getValue() || "";
  }

  layout() {
    this.editorInstance?.layout();
  }

  validateXML(xml: string) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "application/xml");
    const errorNode = doc.getElementsByTagName("parsererror")[0];

    const model = this.editorInstance.getModel();
    if (!model) return;

    const markers: monaco.editor.IMarkerData[] = [];

    if (errorNode) {
      const message = errorNode.textContent || "Invalid XML";
      markers.push({
        severity: monaco.MarkerSeverity.Error,
        message: message,
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 1,
      });
    }

    monaco.editor.setModelMarkers(model, "xml", markers);
  }

  setFileImported(imported: boolean) {
    this.fileImported = imported;
  }

  getFileImported(): boolean {
    return this.fileImported;
  }
}

customElements.define("monaco-editor", MonacoEditor);
