import cytoscape from "cytoscape";
import type { Core, NodeSingular, EventObject } from "cytoscape";

class CytoscapeEditor extends HTMLElement {
  private shadow: ShadowRoot;
  private cy?: Core;
  private dragShape: string | null = null;
  private selectedNodeId: string | null = null;
  private selectedEdge: any = null;
  private sourceNode: NodeSingular | null = null;
  private editableLabel: any = null;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      #container {
        display: flex;
        height: 100vh;
        font-family: "Segoe UI", sans-serif;
        margin: 0;
        background-color: #fff;
      }

      #toolbar {
        width: 160px;
        background: #f8f9fa;
        padding: 16px 12px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        border-right: 1px solid #ddd;
        box-shadow: 2px 0 6px rgba(0, 0, 0, 0.05);
      }

      .node-item {
        padding: 12px;
        background: #ffffff;
        border-radius: 10px;
        text-align: center;
        border: 1px solid #ccc;
        cursor: grab;
        transition: background 0.2s, transform 0.2s;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      }

      .node-item:hover {
        background: #e0f7ff;
        transform: scale(1.05);
      }

      #cy {
        flex-grow: 1;
        height: 100vh;
        width: 100%;
        min-width: 0;
        overflow: hidden;
      }

      .shape {
        width: 60px;
        height: 40px;
        margin: auto;
        background-color: #61bffc;
      }

      .shape-ellipse {
        border-radius: 50%;
      }

      .shape-rectangle {
        border-radius: 4px;
      }

      .shape-diamond {
        width: 32px;
        height: 32px;
        background-color: #61bffc;
        transform: rotate(45deg);
        margin: auto;
      }

      #top-bar {
        position: absolute;
        top: 10px;
        left: 180px;
        z-index: 10;
        background: white;
        padding: 6px 10px;
        border-radius: 6px;
        border: 1px solid #ccc;
      }


    `;

    const container = document.createElement("div");
    container.id = "container";
    container.innerHTML = `
      <div id="toolbar">
        <div class="node-item" draggable="true" data-shape="ellipse">
          <div class="shape shape-ellipse"></div>
        </div>
        <div class="node-item" draggable="true" data-shape="rectangle">
          <div class="shape shape-rectangle"></div>
        </div>
        <div class="node-item" draggable="true" data-shape="diamond">
          <div class="shape shape-diamond"></div>
        </div>
        <sync-to-code-button></sync-to-code-button>
      </div>
        <div id="cy"></div>
      
    `;

    this.shadow.append(style, container);
  }

  connectedCallback() {
    const cyContainer = this.shadow.getElementById("cy") as HTMLElement;

    this.cy = cytoscape({
      container: cyContainer,
      elements: [],
      style: [
        {
          selector: "node",
          style: {
            shape: "data(shape)" as any,
            label: "data(label)",
            "background-color": "#61bffc",
            "border-width": 2,
            "border-color": "#555",
            "text-valign": "center",
            "text-halign": "center",
            "text-wrap": "wrap",
            "font-size": 10,
          },
        },
        {
          selector: "node:selected",
          style: {
            "border-color": "red",
            "border-width": 4,
          },
        },
        {
          selector: 'node[shape = "rectangle"]',
          style: {
            width: 60,
            height: 30,
          },
        },
        {
          selector: 'node[shape = "ellipse"]',
          style: {
            width: 40,
            height: 40,
          },
        },
        {
          selector: 'node[shape = "diamond"]',
          style: {
            width: 45,
            height: 45,
            shape: "diamond",
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "black",
            "target-arrow-shape": "triangle",
            "target-arrow-color": "black",
            "curve-style": "bezier",
          },
        },
        {
          selector: "edge:selected",
          style: {
            "line-color": "red",
            "target-arrow-color": "red",
          },
        },
      ],
    });

    const cy = this.cy;

    cy.panningEnabled(true);
  cy.boxSelectionEnabled(true);
  cy.autoungrabify(false);

    // Events
    cy.on("tap", "node", (evt) => {
      this.selectedNodeId = evt.target.id();
      this.selectedEdge = null;
      cy.nodes().unselect();
      cy.edges().unselect();
      evt.target.select();
    });

    // Double-click to edit node label
    cy.on("dbltap", "node", (evt) => {
      this.startLabelEdit(evt.target);
    });

    cy.on("tap", "edge", (evt) => {
      this.selectedEdge = evt.target;
      this.selectedNodeId = null;
      cy.nodes().unselect();
      cy.edges().unselect();
      evt.target.select();
    });

    cy.on("tap", (evt) => {
      if (evt.target === cy) {
        this.selectedNodeId = null;
        this.selectedEdge = null;
        cy.nodes().unselect();
        cy.edges().unselect();
      }
    });



    // Drag/Drop
    this.shadow.querySelectorAll(".node-item").forEach((item) => {
      item.addEventListener("dragstart", (e) => {
        const target = e.currentTarget as HTMLElement;
        this.dragShape = target.dataset.shape || null;
      });
    });

    cyContainer.addEventListener("dragover", (e) => e.preventDefault());

    cyContainer.addEventListener("drop", (e: DragEvent) => {
  e.preventDefault();
  if (!this.dragShape || !this.cy) return;

  const rect = cyContainer.getBoundingClientRect();
  const zoom = this.cy.zoom();
  const pan = this.cy.pan();

  const pos = {
    x: (e.clientX - rect.left - pan.x) / zoom,
    y: (e.clientY - rect.top - pan.y) / zoom,
  };

  console.log("Final drop position:", pos);

  const newNodeId = `n${Date.now()}`;
  this.cy.add({
    group: "nodes",
    data: {
      id: newNodeId,
      label: this.dragShape,
      shape: this.dragShape,
    },
    grabbable: true,
    position: pos,
  });

  if (this.selectedNodeId) {
    this.cy.add({
      group: "edges",
      data: {
        id: `e-${this.selectedNodeId}-${newNodeId}`,
        source: this.selectedNodeId,
        target: newNodeId,
      },
    });
    this.selectedNodeId = null;
    this.cy.nodes().unselect();
  }

  this.dragShape = null;
});




    // Edge creation
cy.on("mousedown", "node", (evt) => {
  if (!evt.originalEvent?.shiftKey) return; // Only if Shift is held

  this.sourceNode = evt.target as NodeSingular;
  this.sourceNode.ungrabify(); // Temporarily prevent drag

  cy.container()!.style.cursor = "crosshair";
  cy.boxSelectionEnabled(false);
  cy.panningEnabled(false);
  cy.on("mousemove", this.onMouseMove);
});

cy.on("mouseup", (evt) => {
  cy.container()!.style.cursor = "default";
  cy.boxSelectionEnabled(true);
  cy.panningEnabled(true);
  cy.off("mousemove", this.onMouseMove);

  if (!this.sourceNode) return;

  const targetNode = evt.target;

  if (targetNode !== this.sourceNode && targetNode.isNode?.()) {
    this.cy?.add({
      group: "edges",
      data: {
        id: `e-${this.sourceNode.id()}-${targetNode.id()}`,
        source: this.sourceNode.id(),
        target: targetNode.id(),
      },
    });
  }

  this.sourceNode.grabify(); // Re-enable drag
  this.sourceNode = null;
});







    document.addEventListener("keydown", (e: KeyboardEvent) => {
      if (!cy) return;
      if (e.key === "Delete") {
        if (this.selectedEdge) {
          cy.remove(this.selectedEdge);
          this.selectedEdge = null;
        } else if (this.selectedNodeId) {
          const node = cy.getElementById(this.selectedNodeId);
          if (node) {
            cy.remove(node);
            this.selectedNodeId = null;
          }
        }
      }
    });
  }

  private runLayout() {
    if (!this.cy) return;
    const layout = this.cy.layout({
      name: "breadthfirst",
      directed: true,
      padding: 30,
      spacingFactor: 1.2,
      animate: true,
    } as any);

    layout.run();

    layout.on("layoutstop", () => {
      this.cy?.fit(undefined, 50);
      this.cy?.panBy({ x: 400, y: 240 });
    });
  }

  public updateFromXML(xml: string) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "application/xml");

    const elements = this.parseBPMNtoCytoscape(doc);

    if (this.cy) {
      this.cy.elements().remove();
      this.cy.add(elements.map(el => el.group === "nodes" ? { ...el, grabbable: true } : el));
      this.runLayout();
    }
  }

  private parseBPMNtoCytoscape(doc: Document): any[] {
    const nodes: any[] = [];
    const edges: any[] = [];

    const process =
      doc.querySelector("bpmn\\:process") || doc.querySelector("process");
    if (!process) return [];

    for (const el of Array.from(process.children)) {
      const tag = el.tagName.split(":").pop();
      const id = el.getAttribute("id")!;
      const name = el.getAttribute("name") || tag;

      if (
        ["startEvent", "endEvent", "task", "exclusiveGateway"].includes(tag!)
      ) {
        nodes.push({
          group: "nodes",
          data: {
            id,
            label: name,
            shape:
              tag === "startEvent" || tag === "endEvent"
                ? "ellipse"
                : tag === "task"
                ? "rectangle"
                : "diamond",
          },
        });
      } else if (tag === "sequenceFlow") {
        edges.push({
          group: "edges",
          data: {
            id,
            source: el.getAttribute("sourceRef"),
            target: el.getAttribute("targetRef"),
          },
        });
      }
    }

    return [...nodes, ...edges];
  }

  private onMouseMove = (_e: EventObject): void => {
    // Optional: edge preview
  };

  private startLabelEdit(node: any) {
    if (!this.cy) return;

    // Create editable label component if it doesn't exist
    if (!this.editableLabel) {
      this.editableLabel = document.createElement('editable-label');
    }

    // Start editing with callback for when label is saved
    this.editableLabel.startEdit(node, this.cy, (newLabel: string) => {
      // Optional: Add any additional logic when label is saved
      console.log('Label updated:', newLabel);
    });
  }



  public getCy(): Core | undefined {
    return this.cy;
  }
}

customElements.define("cytoscape-editor", CytoscapeEditor);
