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
        .monaco-container {
          height: 100vh;
          width: 100%;
        }
      </style>
      <div class="monaco-container" id="monaco-container"></div>
    `;
    shadow.appendChild(wrapper);
  }

  connectedCallback() {
    const container = this.shadowRoot?.getElementById("monaco-container")!;
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
