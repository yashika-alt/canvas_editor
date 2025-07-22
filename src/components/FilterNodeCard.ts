// FilterNodeCard.ts
// Purpose: Filter-based routing and validation checks.
// Data: Accepts a string input, validates, and routes/blocks as needed.
// Output: Sends validated/filtered data to the next node.

const template = document.createElement('template');
template.innerHTML = `
  <style>
    .card {
      background: #fff;
      border: 1px solid #90b4fa;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      padding: 18px;
      min-width: 120px;
      min-height: 60px;
      max-width: 600px;
      max-height: 400px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
      font-family: 'Segoe UI', Arial, sans-serif;
      position: relative;
      resize: both;
      overflow: auto;
      min-width: 180px;
      min-height: 60px;
      max-width: 600px;
      max-height: 400px;
    }
    .label-input {
      font-weight: bold;
      font-size: 18px;
      color: #1976d2;
      border: none;
      background: transparent;
      margin-bottom: 4px;
      outline: none;
      text-align: center;
    }
    .desc {
      font-size: 13px;
      color: #444;
    }
    .value-input {
      padding: 10px;
      border-radius: 6px;
      border: 1px solid #b0dfff;
      font-size: 15px;
      margin-top: 4px;
      width: 100%;
      box-sizing: border-box;
    }
    .output {
      font-size: 12px;
      color: #888;
      margin-top: 4px;
    }
    .warning {
      display: none;
      color: #d32f2f;
      font-size: 12px;
      margin-top: 4px;
    }
    .invalid {
      border-color: #d32f2f !important;
    }
  </style>
  <div class="card">
    <input class="label-input" value="Filter Node" readonly />
    <div class="desc">Filter-based routing and validation checks.</div>
    <input class="value-input" placeholder="Enter text for filter..." />
    <div class="output">Output: Sends validated/filtered data to the next node.</div>
    <div class="warning">Validation failed.</div>
  </div>
`;

export class FilterNodeCard extends HTMLElement {
  private labelInput!: HTMLInputElement;
  private valueInput!: HTMLInputElement;
  private isDragging = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));

    this.labelInput = shadow.querySelector('.label-input') as HTMLInputElement;
    this.valueInput = shadow.querySelector('.value-input') as HTMLInputElement;
    const warning = shadow.querySelector('.warning') as HTMLDivElement;

    this.labelInput.value = 'Filter Node';
    this.labelInput.readOnly = true;
    if (this.hasAttribute('value')) {
      this.valueInput.value = this.getAttribute('value')!;
    }

    this.valueInput.addEventListener('input', () => {
      const val = this.valueInput.value;
      let warnMsg = '';
      if (!val.trim()) {
        warnMsg = 'Input is empty.';
      } else if (val.length < 3) {
        warnMsg = 'Text is too short.';
      } else if (val.length > 100) {
        warnMsg = 'Text is too long.';
      } else if (this.containsProfanity(val)) {
        warnMsg = 'Input contains profanity. Please rephrase.';
      }
      if (warnMsg) {
        warning.textContent = warnMsg;
        warning.style.display = 'block';
        this.valueInput.classList.add('invalid');
      } else {
        warning.style.display = 'none';
        this.valueInput.classList.remove('invalid');
      }
      this.setAttribute('value', val);
      // --- Create or remove Cytoscape port node at bottom border ---
      if ((window as any).cytoscapeInstance) {
        const cy = (window as any).cytoscapeInstance;
        const portId = this.getAttribute('data-port-id-bottom') || `port-filterNode-bottom-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        if (val && val.trim() !== '') {
          // Create or update port node
          const cardRect = this.getBoundingClientRect();
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
              console.log('[FilterNodeCard] Updated port node position:', portId, portCanvasX, portCanvasY);
            } else {
              cy.add({
                group: 'nodes',
                data: {
                  id: portId,
                  label: '',
                  portOf: 'filterNode',
                  isPort: true,
                  portPosition: 'bottom',
                },
                grabbable: false,
                position: { x: portCanvasX, y: portCanvasY },
              });
              this.setAttribute('data-port-id-bottom', portId);
              // Style the port node as a small circle
              cy.style().selector('node[isPort]').style({
                'width': 16,
                'height': 16,
                'background-color': '#fbc02d',
                'border-width': 2,
                'border-color': '#fff',
                'shape': 'ellipse',
                'z-index': 9999,
                'cursor': 'pointer',
              }).update();
              console.log('[FilterNodeCard] Created port node:', portId, portCanvasX, portCanvasY);
            }
          }
        } else {
          // Remove port node if input is empty
          const portNode = cy.getElementById(portId);
          if (portNode && portNode.length > 0) {
            cy.remove(portNode);
            this.removeAttribute('data-port-id-bottom');
            console.log('[FilterNodeCard] Removed port node:', portId);
          }
        }
      }
    });

    // Make the card draggable (except when clicking inputs)
    const card = shadow.querySelector('.card') as HTMLElement;
    card.addEventListener('mousedown', (e: MouseEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      this.isDragging = true;
      const rect = this.getBoundingClientRect();
      this.dragOffsetX = e.clientX - rect.left;
      this.dragOffsetY = e.clientY - rect.top;
      document.addEventListener('mousemove', this.handleDrag);
      document.addEventListener('mouseup', this.stopDrag);
    });
    // Add ResizeObserver to sync port on resize
    const resizeObserver = new ResizeObserver(() => {
      this.syncPortsToCardPosition();
    });
    resizeObserver.observe(card);
  }

  private handleDrag = (e: MouseEvent) => {
    if (!this.isDragging) return;
    this.style.left = `${e.clientX - this.dragOffsetX}px`;
    this.style.top = `${e.clientY - this.dragOffsetY}px`;
    // --- Sync port node position if attached ---
    const portId = this.getAttribute('data-port-id');
    if (portId && (window as any).cytoscapeInstance) {
      const cy = (window as any).cytoscapeInstance;
      const portNode = cy.getElementById(portId);
      if (portNode && portNode.length > 0) {
        // Place port at top border, centered horizontally (like process node)
        const cardRect = this.getBoundingClientRect();
        const cyContainer = cy.container();
        if (cyContainer) {
          const cyRect = cyContainer.getBoundingClientRect();
          const cyZoom = cy.zoom();
          const cyPan = cy.pan();
          const portScreenX = cardRect.left + cardRect.width / 2;
          const portScreenY = cardRect.top;
          const portCanvasX = (portScreenX - cyRect.left - cyPan.x) / cyZoom;
          const portCanvasY = (portScreenY - cyRect.top - cyPan.y) / cyZoom;
          portNode.position({ x: portCanvasX, y: portCanvasY });
        }
      }
    }
  };

  private stopDrag = () => {
    this.isDragging = false;
    document.removeEventListener('mousemove', this.handleDrag);
    document.removeEventListener('mouseup', this.stopDrag);
  };

  private syncPortsToCardPosition = () => {
    const portIdTop = this.getAttribute('data-port-id');
    if (portIdTop && (window as any).cytoscapeInstance) {
      const cy = (window as any).cytoscapeInstance;
      const portNode = cy.getElementById(portIdTop);
      if (portNode && portNode.length > 0) {
        const cardRect = this.getBoundingClientRect();
        const cyContainer = cy.container();
        if (cyContainer) {
          const cyRect = cyContainer.getBoundingClientRect();
          const cyZoom = cy.zoom();
          const cyPan = cy.pan();
          const portScreenX = cardRect.left + cardRect.width / 2;
          const portScreenY = cardRect.top;
          const portCanvasX = (portScreenX - cyRect.left - cyPan.x) / cyZoom;
          const portCanvasY = (portScreenY - cyRect.top - cyPan.y) / cyZoom;
          portNode.position({ x: portCanvasX, y: portCanvasY });
        }
      }
    }
    const portIdBottom = this.getAttribute('data-port-id-bottom');
    if (portIdBottom && (window as any).cytoscapeInstance) {
      const cy = (window as any).cytoscapeInstance;
      const portNode = cy.getElementById(portIdBottom);
      if (portNode && portNode.length > 0) {
        const cardRect = this.getBoundingClientRect();
        const cyContainer = cy.container();
        if (cyContainer) {
          const cyRect = cyContainer.getBoundingClientRect();
          const cyZoom = cy.zoom();
          const cyPan = cy.pan();
          const portScreenX = cardRect.left + cardRect.width / 2;
          const portScreenY = cardRect.bottom;
          const portCanvasX = (portScreenX - cyRect.left - cyPan.x) / cyZoom;
          const portCanvasY = (portScreenY - cyRect.top - cyPan.y) / cyZoom;
          portNode.position({ x: portCanvasX, y: portCanvasY });
        }
      }
    }
  };

  static get observedAttributes() {
    return ['value'];
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (name === 'value' && this.valueInput) {
      this.valueInput.value = newValue;
    }
  }

  get value() {
    return this.valueInput.value;
  }
  set value(val: string) {
    this.valueInput.value = val;
    this.setAttribute('value', val);
  }

  // Simple profanity filter (expand as needed)
  public containsProfanity(text: string): boolean {
    const profanities = ['badword', 'damn', 'shit', 'hell']; // Add more as needed
    const lower = text.toLowerCase();
    return profanities.some(word => lower.includes(word));
  }

  public createOrUpdateBottomPort() {
    if ((window as any).cytoscapeInstance) {
      const cy = (window as any).cytoscapeInstance;
      const portId = this.getAttribute('data-port-id-bottom') || `port-filterNode-bottom-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      // Create or update port node
      const cardRect = this.getBoundingClientRect();
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
          console.log('[FilterNodeCard] Updated port node position:', portId, portCanvasX, portCanvasY);
        } else {
          cy.add({
            group: 'nodes',
            data: {
              id: portId,
              label: '',
              portOf: 'filterNode',
              isPort: true,
              portPosition: 'bottom',
            },
            grabbable: false,
            position: { x: portCanvasX, y: portCanvasY },
          });
          this.setAttribute('data-port-id-bottom', portId);
          cy.style().selector('node[isPort]').style({
            'width': 16,
            'height': 16,
            'background-color': '#fbc02d',
            'border-width': 2,
            'border-color': '#fff',
            'shape': 'ellipse',
            'z-index': 9999,
            'cursor': 'pointer',
          }).update();
          console.log('[FilterNodeCard] Created port node:', portId, portCanvasX, portCanvasY);
        }
      }
    }
  }
}

customElements.define('filter-node-card', FilterNodeCard); 