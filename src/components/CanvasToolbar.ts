import cytoscape from "cytoscape";
import cytoscapeSvg from "cytoscape-svg";
cytoscape.use(cytoscapeSvg);

type Core = any;

type NodeSingular = any;
type EventObject = any;

// Returns SVG markup for a given BPMN type
function getBPMNSVG(type: string): string {
  switch (type) {
    case "startEvent":
      return `<svg viewBox="0 0 36 36" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
        <circle cx="18" cy="18" r="12" fill="#fff" stroke="#000" stroke-width="2" />
      </svg>`;
    case "endEvent":
      return `<svg viewBox="0 0 36 36" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
        <circle cx="18" cy="18" r="12" fill="#fff" stroke="#000" stroke-width="4" />
      </svg>`;
    case "userTask":
      return `<svg viewBox="0 0 48 36" width="28" height="24" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="46" height="34" rx="4" ry="4" fill="#fff" stroke="#000" stroke-width="2"/>
        <path d="M24 12a4 4 0 1 1 0 8a4 4 0 0 1 0-8zm-9 14c0-3 6-4.5 9-4.5s9 1.5 9 4.5v1h-18v-1z" fill="#000"/>
      </svg>`;
    case "exclusiveGateway":
      return `<svg viewBox="0 0 36 36" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
        <polygon points="18,2 34,18 18,34 2,18" fill="#fff" stroke="#000" stroke-width="2"/>
        <path d="M12 12l12 12m0-12l-12 12" stroke="#000" stroke-width="2"/>
      </svg>`;
    default:
      return `<svg viewBox="0 0 36 36" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="32" height="32" rx="6" ry="6" fill="#fff" stroke="#000" stroke-width="2"/>
          <text x="18" y="22" text-anchor="middle" font-size="10" fill="#000">${type.slice(0, 2)}</text>
        </svg>`;

  }
}

// Returns a data URI for the SVG
function getBPMNSVGDataURI(type: string): string {
  const svg = getBPMNSVG(type);
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function addExportButton(cy: any) {
  const exportBtn = document.createElement("button");
  exportBtn.textContent = "Download SVG";
  exportBtn.style.cssText = `
    position: absolute;
    top: 10px;
    right: 20px;
    z-index: 20;
    padding: 8px 12px;
    background: #1976d2;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
  `;

  exportBtn.addEventListener("click", () => {
    const svgStr = cy.svg({ scale: 1, full: true });
    const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cytoscape-graph.svg";
    a.click();
    URL.revokeObjectURL(url);
  });

  document.body.appendChild(exportBtn);
}



// Move outputModal declaration to a class property
class CytoscapeEditor extends HTMLElement {
  private shadow: ShadowRoot;
  private cy?: Core;
  private dragShape: string | null = null;
  private selectedNodeId: string | null = null;
  private selectedEdge: any = null;
  private sourceNode: NodeSingular | null = null;
  private editableLabel: any = null;
  private configPanel: HTMLElement | null = null;
  private outputModal: HTMLElement | null = null;

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

      .bpmn-icon-start-event,
.bpmn-icon-user-task,
.bpmn-icon-gateway-xor {
  display: block;
  font-size: 28px;
  margin-bottom: 4px;
  text-align: center;
}

      .toolbar-section {
        margin-bottom: 18px;
      }
      .section-title {
        font-weight: bold;
        margin-bottom: 8px;
        font-size: 15px;
        color: #1976d2;
      }
      .node-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        max-height: 180px;
        overflow-y: auto;
        margin-bottom: 8px;
      }
      .bpmn-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
        width: 36px;
        height: 36px;
        margin: 0 auto 4px auto;
        background: #e0f7ff;
        border-radius: 8px;
        border: 1px solid #b0dfff;
        box-shadow: 0 1px 3px rgba(0,0,0,0.07);
      }
      .placeholder {
        color: #aaa;
        font-size: 13px;
        padding: 8px 0;
      }
        @font-face {
    font-family: 'bpmn';
    src: url('https://unpkg.com/bpmn-font@0.11.0/dist/font/bpmn.woff') format('woff');
  }

  .bpmn-icon {
    font-family: 'bpmn'; /* 🟢 force font in toolbar */
  }

      .config-sidebar {
        width: 260px;
        background: #f7faff;
        border-left: 1px solid #90b4fa;
        box-shadow: -2px 0 6px rgba(90,120,255,0.06);
        display: none;
        position: relative;
        z-index: 2;
      }
      .config-sidebar.active { display: block; }
        
    `;

    const container = document.createElement("div");
    container.id = "container";
    container.innerHTML = `
      <div id="toolbar">
        <div class="toolbar-section">
          <div class="section-title">BPMN Nodes</div>
          <div class="node-list">
            ${[
        // Events (ellipse shape)
        { shape: "ellipse", type: "startEvent" },
        { shape: "ellipse", type: "endEvent" },
        { shape: "ellipse", type: "intermediateCatchEvent" },
        { shape: "ellipse", type: "intermediateThrowEvent" },
        // Tasks (rectangle shape)
        { shape: "rectangle", type: "task" },
        { shape: "rectangle", type: "userTask" },
        { shape: "rectangle", type: "serviceTask" },
        { shape: "rectangle", type: "scriptTask" },
        { shape: "rectangle", type: "subprocess" },
        { shape: "rectangle", type: "callActivity" },
        // Gateways (diamond shape)
        { shape: "diamond", type: "exclusiveGateway" },
        { shape: "diamond", type: "parallelGateway" },
        { shape: "diamond", type: "inclusiveGateway" },
        { shape: "diamond", type: "eventBasedGateway" },
        // More events
        { shape: "ellipse", type: "boundaryEvent" },
        { shape: "ellipse", type: "intermediateEvent" },
        // More tasks
        { shape: "rectangle", type: "businessRuleTask" },
        { shape: "rectangle", type: "manualTask" },
        { shape: "rectangle", type: "receiveTask" },
        { shape: "rectangle", type: "sendTask" },
        // More gateways
        { shape: "diamond", type: "complexGateway" },
        // Continue with remaining codes - default to rectangle for unknown types
        ...Array.from({ length: 50 }, (_, i) => ({
          code: 0xe819 + i,
          shape: "rectangle",
          type: `bpmnNode${(0xe819 + i).toString(16)}`
        }))
      ].map(({ shape, type }) => `
              <div class="node-item" draggable="true" data-shape="${shape}" data-bpmn="${type}">
                ${getBPMNSVG(type)}
              </div>
            `).join('')}
          </div>
        </div>
        <div class="toolbar-section">
          <div class="section-title">Flowise Nodes</div>
          <div class="node-list flowise-list">
            <div class="node-item" draggable="true" data-shape="rectangle" data-flowise="inputNode">Input Node</div>
            <div class="node-item" draggable="true" data-shape="rectangle" data-flowise="processNode">Process Node</div>
            <div class="node-item" draggable="true" data-shape="rectangle" data-flowise="filterNode">Filter Node</div>
            <div class="node-item" draggable="true" data-shape="rectangle" data-flowise="llmNode">LLM Node</div>
            <div class="node-item" draggable="true" data-shape="rectangle" data-flowise="outputNode">Output Node</div>    
          </div>
        </div>
        <sync-to-code-button></sync-to-code-button>
      </div>
      <div id="cy"></div>
    `;

    // Add config panel sidebar
    const configSidebar = document.createElement('div');
    configSidebar.className = 'config-sidebar';
    configSidebar.id = 'configSidebar';
    container.appendChild(configSidebar);
    this.configPanel = configSidebar;

    // Add a simple modal for output display
    const outputModal = document.createElement('div');
    outputModal.id = 'outputModal';
    outputModal.style.display = 'none';
    outputModal.style.position = 'fixed';
    outputModal.style.top = '0';
    outputModal.style.left = '0';
    outputModal.style.width = '100vw';
    outputModal.style.height = '100vh';
    outputModal.style.background = 'rgba(0,0,0,0.3)';
    outputModal.style.zIndex = '1000';
    outputModal.innerHTML = `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;padding:32px 24px;border-radius:12px;min-width:320px;box-shadow:0 4px 24px rgba(0,0,0,0.18);font-size:18px;max-width:90vw;max-height:80vh;overflow:auto;"><span id="outputModalContent"></span><br><br><button id="closeOutputModal" style="margin-top:12px;padding:8px 18px;font-size:16px;background:#1976d2;color:#fff;border:none;border-radius:6px;cursor:pointer;">Close</button></div>`;
    document.body.appendChild(outputModal);
    this.outputModal = outputModal;
    this.outputModal.querySelector('#closeOutputModal')?.addEventListener('click', () => {
      if (this.outputModal) this.outputModal.style.display = 'none';
    });

    this.shadow.append(style, container);
  }


  connectedCallback() {
    const cyContainer = this.shadow.getElementById("cy") as HTMLElement;

    this.cy = (cytoscape as any)({
      container: cyContainer,
      elements: [],
      style: [
        {
          selector: "node[svgIcon]",
          style: {
            "background-color": "#fff",
            "background-image": "data(svgIcon)",
            "background-fit": "cover",
            "background-clip": "none",
            "border-width": 2,
            "border-color": "#1976d2",
            "width": 48,
            "height": 48,
            "label": "data(label)",
            "text-valign": "bottom",
            "text-halign": "center",
            "font-size": 12,
            "color": "#222",
          },
        },
        // Add selection styling for nodes
        {
          selector: "node:selected",
          style: {
            "border-color": "#ff9800",
            "border-width": 4,
            "background-color": "#ffe0b2"
          }
        },
        // Lighter, thinner edge style
        {
          selector: "edge",
          style: {
            "width": 2,
            "line-color": "#000",
            "target-arrow-color": "#000",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            "opacity": 1,
          },
        },
        // Add selection styling for edges
        {
          selector: "edge:selected",
          style: {
            "line-color": "#ff9800",
            "target-arrow-color": "#ff9800",
            "width": 4
          }
        },

      ],
    });
    (window as any).cytoscapeInstance = this.cy;

    // Make all port nodes non-draggable (static)
    this.cy.nodes('[isPort]').forEach((node: any) => node.grabbable(false));
    // Ensure any new port node is also non-draggable
    this.cy.on('add', 'node[isPort]', (evt: any) => {
      evt.target.grabbable(false);
    });

    if (this.cy) {
      addExportButton(this.cy);
    }

    // 🔁 Unicode icon → BPMN type map
    const iconToTypeMap: { [key: string]: string } = {
      "\ue801": "startEvent",
      "\ue804": "endEvent",
      "\ue805": "intermediateCatchEvent",
      "\ue806": "intermediateThrowEvent",
      "\ue807": "task",
      "\ue808": "userTask",
      "\ue809": "serviceTask",
      "\ue80a": "scriptTask",
      "\ue80b": "subprocess",
      "\ue80c": "callActivity",
      "\ue80d": "exclusiveGateway",
      "\ue80e": "parallelGateway",
      "\ue80f": "inclusiveGateway",
      "\ue811": "eventBasedGateway",
      "\ue812": "boundaryEvent",
      "\ue813": "intermediateEvent",
      "\ue814": "businessRuleTask",
      "\ue815": "manualTask",
      "\ue816": "receiveTask",
      "\ue817": "sendTask",
      "\ue818": "complexGateway",
    };

    // ✅ Drag/Drop drop listener update (keep only one)
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

      // Check for Flowise node
      const flowiseType = e.dataTransfer?.getData('flowise');
      if (flowiseType && flowiseType !== '') {
        // Only log for actual Flowise nodes
        console.log('flowiseType:', flowiseType);
      }
      if (flowiseType === 'inputNode' || flowiseType === 'filterNode') {
        // Place the card visually
        const card = document.createElement(
          flowiseType === 'inputNode' ? 'input-node-card' :
          'filter-node-card'
        );
        card.setAttribute('label',
          flowiseType === 'inputNode' ? 'Input Node' :
          'Filter Node'
        );
        card.setAttribute('value', '');
        card.style.position = 'absolute';
        card.style.left = `${e.clientX}px`;
        card.style.top = `${e.clientY}px`;
        card.style.zIndex = '1000';
        // Add a tiny Cytoscape node as a port at the correct border of the card
        const cyContainer = this.shadow.getElementById("cy");
        if (cyContainer) {
          const cyRect1 = cyContainer.getBoundingClientRect();
          const cyZoom1 = this.cy.zoom();
          const cyPan1 = this.cy.pan();
          // Calculate canvas position for the port
          card.offsetHeight; // Force reflow
          const cardRect1 = card.getBoundingClientRect();
          let portScreenX, portScreenY, portPosition;
          if (flowiseType === 'inputNode') {
            // Bottom border, centered horizontally
            portScreenX = cardRect1.left + cardRect1.width / 2;
            portScreenY = cardRect1.bottom;
            portPosition = 'bottom';
          } else {
            // FilterNode: Top border, centered horizontally
            portScreenX = cardRect1.left + cardRect1.width / 2;
            portScreenY = cardRect1.top;
            portPosition = 'top';
          }
          const portCanvasX = (portScreenX - cyRect1.left - cyPan1.x) / cyZoom1;
          const portCanvasY = (portScreenY - cyRect1.top - cyPan1.y) / cyZoom1;
          const portId = `port-${flowiseType}-${Date.now()}`;
          this.cy.add({
            group: 'nodes',
            data: {
              id: portId,
              label: '',
              portOf: flowiseType,
              isPort: true,
              portPosition: portPosition,
            },
            grabbable: false,
            position: { x: portCanvasX, y: portCanvasY },
          });
          // Style the port node as a small circle
          this.cy.style().selector('node[isPort]').style({
            'width': 16,
            'height': 16,
            'background-color': flowiseType === 'inputNode' ? '#1976d2' : '#fbc02d',
            'border-width': 2,
            'border-color': '#fff',
            'shape': 'ellipse',
            'z-index': 9999,
          }).update();
          // Set data-port-id on the card for drag sync
          card.setAttribute('data-port-id', portId);
        }
        document.body.appendChild(card);
        this.dragShape = null;
        return;
      }
      if (flowiseType === 'processNode') {
        const card = document.createElement('process-node-card');
        card.setAttribute('label', 'Process Node');
        card.setAttribute('value', '');
        card.style.position = 'absolute';
        card.style.left = `${e.clientX}px`;
        card.style.top = `${e.clientY}px`;
        card.style.zIndex = '1000';
        document.body.appendChild(card); // Append first!
        card.offsetHeight; // Force reflow

        const cyContainer = this.shadow.getElementById("cy");
        if (cyContainer) {
          const cyRect1 = cyContainer.getBoundingClientRect();
          const cyZoom1 = this.cy.zoom();
          const cyPan1 = this.cy.pan();
          const cardRect1 = card.getBoundingClientRect();

          // Top port
          const portScreenXTop = cardRect1.left + cardRect1.width / 2;
          const portScreenYTop = cardRect1.top;
          const portCanvasXTop = (portScreenXTop - cyRect1.left - cyPan1.x) / cyZoom1;
          const portCanvasYTop = (portScreenYTop - cyRect1.top - cyPan1.y) / cyZoom1;
          const portIdTop = `port-processNode-top-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          this.cy.add({
            group: 'nodes',
            data: {
              id: portIdTop,
              label: '',
              portOf: 'processNode',
              isPort: true,
              portPosition: 'top',
            },
            grabbable: false,
            position: { x: portCanvasXTop, y: portCanvasYTop },
          });

          // Bottom port
          const portScreenXBottom = cardRect1.left + cardRect1.width / 2;
          const portScreenYBottom = cardRect1.bottom;
          const portCanvasXBottom = (portScreenXBottom - cyRect1.left - cyPan1.x) / cyZoom1;
          const portCanvasYBottom = (portScreenYBottom - cyRect1.top - cyPan1.y) / cyZoom1;
          const portIdBottom = `port-processNode-bottom-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          this.cy.add({
            group: 'nodes',
            data: {
              id: portIdBottom,
              label: '',
              portOf: 'processNode',
              isPort: true,
              portPosition: 'bottom',
            },
            grabbable: false,
            position: { x: portCanvasXBottom, y: portCanvasYBottom },
          });

          // Style the port nodes as small circles
          this.cy.style().selector('node[isPort]').style({
            'width': 16,
            'height': 16,
            'background-color': '#43a047',
            'border-width': 2,
            'border-color': '#fff',
            'shape': 'ellipse',
            'z-index': 9999,
          }).update();

          card.setAttribute('data-port-id', portIdTop);
          card.setAttribute('data-port-id-bottom', portIdBottom);
        }
        this.dragShape = null;
        return; // Do not add a Cytoscape node for Process Node
      }
      if (flowiseType === 'llmNode') {
        const card = document.createElement('llm-node-card');
        card.setAttribute('label', 'LLM Node');
        card.setAttribute('value', '');
        card.style.position = 'absolute';
        card.style.left = `${e.clientX}px`;
        card.style.top = `${e.clientY}px`;
        card.style.zIndex = '1000';
        document.body.appendChild(card);
        card.offsetHeight; // Force reflow
        // --- Add Cytoscape port node at the top border of the LLM node ---
        const cyContainer = this.shadow.getElementById("cy");
        if (cyContainer) {
          const cyRect1 = cyContainer.getBoundingClientRect();
          const cyZoom1 = this.cy.zoom();
          const cyPan1 = this.cy.pan();
          const cardRect1 = card.getBoundingClientRect();
          // Top port
          const portScreenXTop = cardRect1.left + cardRect1.width / 2;
          const portScreenYTop = cardRect1.top;
          const portCanvasXTop = (portScreenXTop - cyRect1.left - cyPan1.x) / cyZoom1;
          const portCanvasYTop = (portScreenYTop - cyRect1.top - cyPan1.y) / cyZoom1;
          const portIdTop = `port-llmNode-top-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          this.cy.add({
            group: 'nodes',
            data: {
              id: portIdTop,
              label: '',
              portOf: 'llmNode',
              isPort: true,
              portPosition: 'top',
            },
            grabbable: false,
            position: { x: portCanvasXTop, y: portCanvasYTop },
          });
          // Style the port node as a small circle
          this.cy.style().selector('node[isPort]').style({
            'width': 16,
            'height': 16,
            'background-color': '#1976d2',
            'border-width': 2,
            'border-color': '#fff',
            'shape': 'ellipse',
            'z-index': 9999,
            'cursor': 'pointer',
          }).update();
          card.setAttribute('data-port-id-top', portIdTop);
        }
        this.dragShape = null;
        return;
      }
      if (flowiseType === 'outputNode') {
        const card = document.createElement('output-node-card');
        card.setAttribute('label', 'Output Node');
        card.setAttribute('value', '');
        card.style.position = 'absolute';
        card.style.left = `${e.clientX}px`;
        card.style.top = `${e.clientY}px`;
        card.style.zIndex = '1000';
        document.body.appendChild(card);
        card.offsetHeight; // Force reflow
        // --- Add Cytoscape port node at the top border of the Output node ---
        const cyContainer = this.shadow.getElementById("cy");
        if (cyContainer) {
          const cyRect1 = cyContainer.getBoundingClientRect();
          const cyZoom1 = this.cy.zoom();
          const cyPan1 = this.cy.pan();
          const cardRect1 = card.getBoundingClientRect();
          // Top port
          const portScreenXTop = cardRect1.left + cardRect1.width / 2;
          const portScreenYTop = cardRect1.top;
          const portCanvasXTop = (portScreenXTop - cyRect1.left - cyPan1.x) / cyZoom1;
          const portCanvasYTop = (portScreenYTop - cyRect1.top - cyPan1.y) / cyZoom1;
          const portIdTop = `port-outputNode-top-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          this.cy.add({
            group: 'nodes',
            data: {
              id: portIdTop,
              label: '',
              portOf: 'outputNode',
              isPort: true,
              portPosition: 'top',
            },
            grabbable: false,
            position: { x: portCanvasXTop, y: portCanvasYTop },
          });
          // Style the port node as a small circle
          this.cy.style().selector('node[isPort]').style({
            'width': 16,
            'height': 16,
            'background-color': '#1976d2',
            'border-width': 2,
            'border-color': '#fff',
            'shape': 'ellipse',
            'z-index': 9999,
            'cursor': 'pointer',
          }).update();
          card.setAttribute('data-port-id-top', portIdTop);
        }
        this.dragShape = null;
        return;
      }

      // Existing BPMN node logic (unchanged)
      const newNodeId = `n${Date.now()}`;
      const iconChar = e.dataTransfer?.getData("bpmnIcon") || "";
      const bpmnTypeRaw = e.dataTransfer?.getData("bpmnType") || this.dragShape || "task";
      const mappedType = iconToTypeMap[iconChar] || bpmnTypeRaw;
      let svgIcon;
      let shape = this.dragShape || "rectangle";
      let nodeLabel = mappedType;
      if (mappedType === "startEvent") {
        svgIcon = getBPMNSVGDataURI(mappedType);
      } else if (mappedType === "endEvent") {
        svgIcon = getBPMNSVGDataURI(mappedType);
      } else if (mappedType === "userTask") {
        svgIcon = getBPMNSVGDataURI(mappedType);
      } else if (mappedType === "exclusiveGateway") {
        svgIcon = getBPMNSVGDataURI(mappedType);
      } else {
        svgIcon = getBPMNSVGDataURI(mappedType);
      }
      this.cy.add({
        group: "nodes",
        data: {
          id: newNodeId,
          label: nodeLabel,
          shape,
          bpmnType: mappedType,
          svgIcon,
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
    // Double-click to edit node label
    this.cy.on("dbltap", "node", (evt: any) => {
      this.startLabelEdit(evt.target);
    });

    // Single click to select node and create edge if another node is already selected
    this.cy.on("tap", "node", (evt: any) => {
      const tappedNode = evt.target;
      if (this.selectedNodeId && this.selectedNodeId !== tappedNode.id()) {
        // Create edge from previously selected node to this node
        this.cy.add({
          group: "edges",
          data: {
            id: `e-${this.selectedNodeId}-${tappedNode.id()}`,
            source: this.selectedNodeId,
            target: tappedNode.id(),
          },
        });
        // --- Custom: If connecting input-node-card to process-node-card, run the flow logic ---
        const inputCard = document.querySelector('input-node-card') as any;
        const processCard = document.querySelector('process-node-card') as any;
        if (inputCard && processCard) {
          let val = inputCard.value;
          let processed = (val || '').trim().replace(/\s+/g, ' ');
          processCard.value = processed;
          // Success toast removed from here; only shown in edge handler
        }
        // Unselect after creating edge
        this.selectedNodeId = null;
        this.cy.nodes().unselect();
      } else {
        // Select the clicked node
        this.cy.nodes().unselect();
        tappedNode.select();
        this.selectedNodeId = tappedNode.id();
        this.selectedEdge = null;
      }
    });

    this.cy.on("tap", "edge", (evt: any) => {
      this.selectedEdge = evt.target;
      this.selectedNodeId = null;
      this.cy.nodes().unselect();
      this.cy.edges().unselect();
      evt.target.select();
    });

    this.cy.on("tap", (evt: any) => {
      if (evt.target === this.cy) {
        this.selectedNodeId = null;
        this.selectedEdge = null;
        this.cy.nodes().unselect();
        this.cy.edges().unselect();
        if (this.configPanel) {
          this.configPanel.innerHTML = '';
          this.configPanel.classList.remove('active');
        }
      }
    });

    // Drag/Drop
    this.shadow.querySelectorAll(".node-item").forEach((item) => {
      item.addEventListener("dragstart", (e) => {
        const target = e.currentTarget as HTMLElement;
        this.dragShape = target.dataset.shape || null;
        // --- PATCH: Set flowise drag data if present ---
        if (target.dataset.flowise) {
          (e as DragEvent).dataTransfer?.setData("flowise", target.dataset.flowise);
        }
        const iconChar = target.querySelector(".bpmn-icon")?.textContent || "";
        (e as DragEvent).dataTransfer?.setData("bpmnType", target.dataset.bpmn || "");
        (e as DragEvent).dataTransfer?.setData("bpmnIcon", iconChar);
      });
    });



    cyContainer.addEventListener("dragover", (e) => e.preventDefault());

    // Edge creation
    // Remove the old mousedown/mouseup edge creation logic for clarity

    document.addEventListener("keydown", (e: KeyboardEvent) => {
      if (!this.cy) return;
      if (e.key === "Delete") {
        if (this.selectedEdge) {
          this.cy.remove(this.selectedEdge);
          this.selectedEdge = null;
        } else if (this.selectedNodeId) {
          const node = this.cy.getElementById(this.selectedNodeId);
          if (node) {
            this.cy.remove(node);
            this.selectedNodeId = null;
          }
        }
      }
    });

    // Listen for the 'run-flow' event from the config panel
    this.configPanel?.addEventListener('run-flow', async () => {
      if (!this.selectedNodeId || !this.cy) return;
      // Traverse and execute the flow starting from the selected node
      const nodeMap = new Map();
      this.cy.nodes().forEach((n: any) => nodeMap.set(n.id(), n));
      const edgeMap = new Map();
      this.cy.edges().forEach((e: any) => {
        const src = e.data('source');
        if (!edgeMap.has(src)) edgeMap.set(src, []);
        edgeMap.get(src).push(e.data('target'));
      });
      // Import node logic classes
      try {
        // Removed Flow node logic imports
      } catch (e) {
        alert('Flow node logic not found.');
        return;
      }
      async function runNode(nodeId: string, input: any): Promise<any> {
        const node = nodeMap.get(nodeId);
        if (!node) return input;
        const type = node.data('nodeType');
        let result = input;
        try {
          // Removed Flow node logic execution
        } catch (err: any) {
          result = `[Error in ${type}]: ${err.message}`;
        }
        // Continue to next node(s)
        const nextNodes = edgeMap.get(nodeId) || [];
        if (nextNodes.length === 0) return result;
        // For simplicity, only follow the first outgoing edge (can be extended for branching)
        return runNode(nextNodes[0], result);
      }
      // Start from selected node
      const output = await runNode(this.selectedNodeId, undefined);
      // Show output in modal
      if (this.outputModal) {
        const content = this.outputModal.querySelector('#outputModalContent');
        if (content) content.textContent = String(output);
      }
      if (this.outputModal) this.outputModal.style.display = 'block';
    });

    // Overlay card logic for Flowise nodes
    const flowiseCardMap: Record<string, HTMLElement> = {};
    const updateCardPosition = (node: any) => {
      const id = node.id();
      const card = flowiseCardMap[id];
      if (!card) return;
      const pos = node.renderedPosition();
      const cyRect = cyContainer.getBoundingClientRect();
      card.style.left = `${cyRect.left + pos.x - card.offsetWidth / 2}px`;
      card.style.top = `${cyRect.top + pos.y - card.offsetHeight / 2}px`;
    };
    // Show card on select, hide on unselect
    this.cy.on('select', 'node', (evt: any) => {
      const node = evt.target;
      if (node.data('isFlowise')) {
        const id = node.id();
        if (!flowiseCardMap[id]) {
          let card;
          if (node.data('nodeType') === 'inputNode') {
            card = document.createElement('input-node-card');
          } else if (node.data('nodeType') === 'processNode') {
            card = document.createElement('process-node-card');
          } else if (node.data('nodeType') === 'filterNode') {
            card = document.createElement('filter-node-card');
          } else if (node.data('nodeType') === 'llmNode') {
            card = document.createElement('llm-node-card');
          }
          if (card) {
            card.setAttribute('label', node.data('label'));
            card.setAttribute('value', '');
            card.style.position = 'absolute';
            card.style.zIndex = '1000';
            card.setAttribute('data-cy-id', id);
            document.body.appendChild(card);
            flowiseCardMap[id] = card;
          }
        }
        updateCardPosition(node);
        flowiseCardMap[id].style.display = 'block';
      }
    });
    this.cy.on('unselect', 'node', (evt: any) => {
      const node = evt.target;
      if (node.data('isFlowise')) {
        const id = node.id();
        if (flowiseCardMap[id]) flowiseCardMap[id].style.display = 'none';
      }
    });
    // Sync card position on pan/zoom/move
    this.cy.on('pan zoom position', () => {
      this.cy.nodes().forEach((node: any) => {
        if (node.data('isFlowise') && flowiseCardMap[node.id()] && flowiseCardMap[node.id()].style.display !== 'none') {
          updateCardPosition(node);
        }
      });
    });
    // Remove card when node is removed
    this.cy.on('remove', 'node', (evt: any) => {
      const node = evt.target;
      if (node.data('isFlowise')) {
        const id = node.id();
        if (flowiseCardMap[id]) {
          flowiseCardMap[id].remove();
          delete flowiseCardMap[id];
        }
      }
    });

    // (Removed: all drag-to-connect with preview arrow logic for Flowise nodes/ports)

    // When an edge is created from a process node to a filter node, create the bottom port on the filter node card
    this.cy.on('add', 'edge', (evt: any) => {
      const edge = evt.target;
      const sourceNode = edge.source();
      const targetNode = edge.target();
      // Process node to filter node logic (existing)
      if (
        sourceNode.data('portOf') === 'processNode' &&
        targetNode.data('portOf') === 'filterNode'
      ) {
        // Find the process node card and filter node card in the DOM
        const processCards = document.querySelectorAll('process-node-card');
        const filterCards = document.querySelectorAll('filter-node-card');
        const processCard = processCards[0] as any;
        const filterCard = filterCards[0] as any;
        if (processCard && filterCard) {
          const processValue = processCard.value; // Store before clearing
          // Check for profanity using filterCard's method
          if (typeof filterCard.containsProfanity === 'function' && filterCard.containsProfanity(processValue)) {
            // Remove all edges from Cytoscape
            if (this.cy) {
              this.cy.edges().remove();
            }
            // Clear the filter node's value
            filterCard.value = '';
            // Also clear the input and process node values
            const inputCard = document.querySelector('input-node-card') as any;
            if (inputCard) inputCard.value = '';
            processCard.value = '';
            // Debug: log when profanity is detected
            console.log('[DEBUG] Profanity detected in processCard.value:', processValue);
            // Show popup notification (always show)
            if (typeof (window as any).showToast === 'function') {
              (window as any).showToast('Data contains offensive language', 'error');
            } else {
              alert('Data contains offensive language');
            }
            return; // Do not proceed with port creation or success toast
          } else {
            filterCard.value = processCard.value;
            // Show success toast only if data is valid
            if (typeof (window as any).showToast === 'function') {
              (window as any).showToast('Flow ran: processed value set in Filter Node', 'success');
            }
          }
        }
        // Now create the port as before
        filterCards.forEach((card: any) => {
          if (card && typeof card.createOrUpdateBottomPort === 'function') {
            card.createOrUpdateBottomPort();
          }
        });
      }
      // Filter node to LLM node logic
      if (
        sourceNode.data('portOf') === 'filterNode' &&
        targetNode.data('portOf') === 'llmNode'
      ) {
        // Find the filter node card and llm node card in the DOM
        const filterCards = document.querySelectorAll('filter-node-card');
        const llmCards = document.querySelectorAll('llm-node-card');
        // For now, just use the first card of each type (improve by matching IDs if needed)
        const filterCard = filterCards[0] as any;
        const llmCard = llmCards[0] as any;
        if (filterCard && llmCard) {
          const filterValue = filterCard.value.trim();
          let llmResponse = '';
          if (/what is going on in room no\. 25\?/i.test(filterValue)) {
            llmResponse = 'Code, chaos and comedy - all in one place';
          } else if (/what is the capital of sri ?lanka ?\?/i.test(filterValue)) {
            llmResponse = 'Colombo';
          } else {
            llmResponse = '[LLM simulated response for: ' + filterValue + ']';
          }
          llmCard.value = llmResponse;
        }
        // --- Create Cytoscape port node at the bottom border of the LLM node ---
        if (llmCard && (window as any).cytoscapeInstance) {
          const cy = (window as any).cytoscapeInstance;
          const portId = llmCard.getAttribute('data-port-id-bottom') || `port-llmNode-bottom-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          const cardRect = llmCard.getBoundingClientRect();
          const cyContainer = cy.container();
          if (cyContainer) {
            const cyRect = cyContainer.getBoundingClientRect();
            const cyZoom = cy.zoom();
            const cyPan = cy.pan();
            const portScreenX = cardRect.left + cardRect.width / 2;
            const portScreenY = cardRect.bottom;
            const portCanvasX = (portScreenX - cyRect.left - cyPan.x) / cyZoom;
            const portCanvasY = (portScreenY - cyRect.top - cyPan.y) / cyZoom;
            let portNode = cy.getElementById(portId);
            if (portNode && portNode.length > 0) {
              portNode.position({ x: portCanvasX, y: portCanvasY });
            } else {
              cy.add({
                group: 'nodes',
                data: {
                  id: portId,
                  label: '',
                  portOf: 'llmNode',
                  isPort: true,
                  portPosition: 'bottom',
                },
                grabbable: false,
                position: { x: portCanvasX, y: portCanvasY },
              });
              llmCard.setAttribute('data-port-id-bottom', portId);
              cy.style().selector('node[isPort]').style({
                'width': 16,
                'height': 16,
                'background-color': '#1976d2',
                'border-width': 2,
                'border-color': '#fff',
                'shape': 'ellipse',
                'z-index': 9999,
                'cursor': 'pointer',
              }).update();
            }
          }
        }
      }
      // LLM node to Output node logic
      if (
        sourceNode.data('portOf') === 'llmNode' &&
        targetNode.data('portOf') === 'outputNode'
      ) {
        // Find the llm node card and output node card in the DOM
        const llmCards = document.querySelectorAll('llm-node-card');
        const outputCards = document.querySelectorAll('output-node-card');
        // For now, just use the first card of each type (improve by matching IDs if needed)
        const llmCard = llmCards[0] as any;
        const outputCard = outputCards[0] as any;
        if (llmCard && outputCard) {
          outputCard.value = llmCard.value;
        }
      }
    });

  }
  private runLayout(preserveView: boolean = false) {
    if (!this.cy) return;
    // Find the start event node to use as root
    const startNode = this.cy
      .nodes()
      .filter((node: any) => node.data("bpmnType") === "startEvent");
    const roots = startNode.length ? `#${startNode[0].id()}` : undefined;
    const layout = this.cy.layout({
      name: "breadthfirst",
      directed: true,
      padding: 30,
      spacingFactor: 1.7,
      animate: true,
      orientation: "vertical", // lock orientation
      ...(roots ? { roots } : {}),
    } as any);

    layout.run();
    this.cy?.fit(undefined, 50); // Ensure all nodes are visible after layout

    // After layout, set labelPosition for each edge based on direction
    layout.on("layoutstop", () => {
      this.cy?.edges().forEach((edge: any) => {
        const source = edge.source();
        const target = edge.target();
        if (source && target) {
          const sx = source.position("x");
          const tx = target.position("x");
          if (tx > sx) {
            edge.data("labelPosition", "right");
          } else if (tx < sx) {
            edge.data("labelPosition", "left");
          } else {
            edge.data("labelPosition", undefined);
          }
        }
      });
      if (!preserveView) {
        this.cy?.fit(undefined, 50);
        this.cy?.panBy({ x: 400, y: 240 });
      }

      // --- Robust De-overlap logic: multiple passes, random offsets ---
      if (this.cy) {
        const nodes = this.cy.nodes();
        for (let pass = 0; pass < 5; pass++) {
          const seenPositions = new Set<string>();
          nodes.forEach((node: any) => {
            let { x, y } = node.position();
            let key = `${Math.round(x)},${Math.round(y)}`;
            // If this position is already taken, offset randomly until free
            while (seenPositions.has(key)) {
              const offset = 40 + Math.floor(Math.random() * 40); // 40-80px
              x += offset;
              y += offset;
              key = `${Math.round(x)},${Math.round(y)}`;
            }
            node.position({ x, y });
            seenPositions.add(key);
          });
        }
      }
    });
  }

  public updateFromXML(xml: string, isFileImport: boolean = false) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "application/xml");

    const elements = this.parseBPMNtoCytoscape(doc);

    if (this.cy) {
      if (isFileImport) {
        // For file imports, run layout to properly position nodes
        this.cy.elements().remove();
        this.cy.add(
          elements.map((el) =>
            el.group === "nodes" ? { ...el, grabbable: true } : el
          )
        );
        this.runLayout(false); // Run layout for file imports
      } else {
        // For sync operations, preserve existing positions
        const prevPan = this.cy.pan();
        const prevZoom = this.cy.zoom();
        const nodePositions = new Map();

        // Save positions of existing nodes
        this.cy.nodes().forEach((node: any) => {
          const data = node.data();
          nodePositions.set(data.id, {
            x: node.position('x'),
            y: node.position('y')
          });
        });

        this.cy.elements().remove();

        // Add elements with preserved positions if available
        const elementsWithPositions = elements.map((el) => {
          if (el.group === "nodes") {
            const savedPosition = nodePositions.get(el.data.id);
            if (savedPosition) {
              return { ...el, grabbable: true, position: savedPosition };
            }
          }
          return el.group === "nodes" ? { ...el, grabbable: true } : el;
        });

        this.cy.add(elementsWithPositions);

        // Restore pan and zoom
        this.cy.pan(prevPan);
        this.cy.zoom(prevZoom);
      }
    }
  }

  private parseBPMNtoCytoscape(doc: Document): any[] {
    const nodes: any[] = [];
    const edges: any[] = [];

    let process =
      doc.querySelector("bpmn\\:process") || doc.querySelector("process");
    if (!process) {
      // Try any element whose localName is 'process'
      const candidates = Array.from(doc.getElementsByTagName("*"))
        .filter(el => el.localName === "process");
      if (candidates.length > 0) {
        process = candidates[0];
        console.warn("[CytoscapeEditor] Found process element by localName:", process);
      }
    }
    if (!process) {
      // Debug: log all root and child elements for troubleshooting
      console.warn("[CytoscapeEditor] No <process> element found. Available elements:",
        Array.from(doc.documentElement.getElementsByTagName("*"))
          .map(el => ({ tagName: el.tagName, localName: el.localName, namespaceURI: el.namespaceURI }))
      );
      return [];
    }

    // Supported BPMN node types and their Cytoscape shapes
    const nodeTypeToShape: Record<string, string> = {
      startEvent: "ellipse",
      endEvent: "ellipse",
      task: "rectangle",
      userTask: "rectangle",
      serviceTask: "rectangle",
      scriptTask: "rectangle",
      subprocess: "rectangle",
      callActivity: "rectangle",
      exclusiveGateway: "diamond",
      parallelGateway: "diamond",
      inclusiveGateway: "diamond",
      eventBasedGateway: "diamond",
      intermediateCatchEvent: "ellipse",
      intermediateThrowEvent: "ellipse",
    };

    function walk(element: Element) {
      for (const el of Array.from(element.children)) {
        const tag = el.tagName.split(":").pop();
        const id = el.getAttribute("id");
        const name = el.getAttribute("name") || tag;

        // --- PATCH: Skip Flowise nodes so they are not rendered as BPMN nodes ---
        if (!tag) continue;
        if (["inputNode", "processNode", "filterNode", "outputNode"].includes(tag)) {
          continue;
        }
        if (tag && nodeTypeToShape[tag] && id) {
          nodes.push({
            group: "nodes",
            data: {
              id,
              label: name,
              shape: nodeTypeToShape[tag],
              bpmnType: tag,
              svgIcon: getBPMNSVGDataURI(tag)  // 🔥 added line for icon rendering
            },
          });

        } else if (tag === "sequenceFlow") {
          const label = el.getAttribute("name") || "";
          let labelPosition = undefined;
          if (label.toLowerCase() === "no") labelPosition = "left";
          if (label.toLowerCase() === "yes") labelPosition = "right";
          edges.push({
            group: "edges",
            data: {
              id: el.getAttribute("id"),
              source: el.getAttribute("sourceRef"),
              target: el.getAttribute("targetRef"),
              label,
              ...(labelPosition ? { labelPosition } : {}),
            },
          });
        }
        // Recursively walk children
        walk(el);
      }
    }

    walk(process);
    return [...nodes, ...edges];
  }

  private onMouseMove = (_e: EventObject): void => {
    // Optional: edge preview
  };

  private startLabelEdit(node: any) {
    if (!this.cy) return;

    // Create editable label component if it doesn't exist
    if (!this.editableLabel) {
      this.editableLabel = document.createElement("editable-label");
    }

    // Start editing with callback for when label is saved
    this.editableLabel.startEdit(node, this.cy, (newLabel: string) => {
      // Update SVG icon for Flowise nodes when label changes
      // Removed Flowise node label update logic
      console.log("Label updated:", newLabel);
    });
  }

  public getCy(): Core | undefined {
    return this.cy;
  }
}

customElements.define("cytoscape-editor", CytoscapeEditor);



