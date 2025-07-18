class SyncToCodeButton extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      :host {
        display: block;
        width: 100%;
        margin-top: 20px;
      }

      .sync-btn {
        width: 100%;
        padding: 10px 16px;
        font-size: 14px;
        background-color: #007acc;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: background-color 0.2s;
        font-family: inherit;
      }

      .sync-btn:hover {
        background-color: #1e7e34;
      }

      .sync-btn:active {
        background-color: #155724;
      }

      .sync-btn:disabled {
        background-color: #6c757d;
        cursor: not-allowed;
      }
    `;

    const button = document.createElement("button");
    button.className = "sync-btn";
    button.textContent = "📝 Sync to Code Editor";
    button.addEventListener("click", () => this.handleSync());

    this.shadowRoot?.append(style, button);
  }

  private handleSync() {
    const canvas = document.querySelector("cytoscape-editor") as any;
    const cy = canvas?.getCy?.();
    if (!cy) {
      this.showToast("❌ No canvas content to sync");
      return;
    }

    // Check if the canvas is empty (no nodes and no edges)
    if (cy.nodes().length === 0 && cy.edges().length === 0) {
      this.showToast("❌ Nothing is on canvas graph");
      return;
    }

    const xml = this.convertToXML(cy);
    if (xml) {
      // Dispatch event to update the code editor
      document.dispatchEvent(
        new CustomEvent("sync-canvas-to-xml", {
          detail: { xml },
          bubbles: true,
          composed: true,
        })
      );

      this.showToast("✅ Code editor synced successfully", "success");
    } else {
      this.showToast("❌ Failed to generate XML");
    }
  }

  private convertToXML(cy: any): string {
    if (!cy) return "";

    const nodes = cy.nodes();
    const edges = cy.edges();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">`;

    // Add nodes
    nodes.forEach((node: any) => {
      const data = node.data();
      const shape = data.shape;
      const label = data.label || shape;
      
      let tag = "task";
      if (shape === "ellipse") {
        tag = label.toLowerCase().includes("start") ? "startEvent" : "endEvent";
      } else if (shape === "diamond") {
        tag = "exclusiveGateway";
      }

      xml += `
    <bpmn:${tag} id="${data.id}" name="${label}" />`;
    });

    // Add edges
    edges.forEach((edge: any) => {
      const data = edge.data();
      xml += `
    <bpmn:sequenceFlow id="${data.id}" sourceRef="${data.source}" targetRef="${data.target}" />`;
    });

    xml += `
  </bpmn:process>
</bpmn:definitions>`;

    return xml;
  }

  private showToast(message: string, type: "success" | "error" = "error") {
    const toast = document.querySelector("toast-message") as any;
    toast?.show?.(message, type);
  }
}

customElements.define("sync-to-code-button", SyncToCodeButton); 