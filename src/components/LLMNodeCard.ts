// LLMNodeCard.ts
// Purpose: Main language model operation node for the flow.
// Similar to InputNodeCard, but for LLM tasks.

const template = document.createElement('template');
template.innerHTML = `
  <style>
    .card {
      background: #fff;
      border: 1px solid #90b4fa;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      padding: 18px;
      min-width: 240px;
      max-width: 320px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
      font-family: 'Segoe UI', Arial, sans-serif;
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
  </style>
  <div class="card">
    <input class="label-input" value="LLM Node" readonly />
    <div class="desc">Main language model operation. Use for prompt-based LLM tasks.</div>
    <input class="value-input" placeholder="Enter prompt or question..." />
    <div class="output">Output: LLM result will appear here.</div>
  </div>
`;

export class LLMNodeCard extends HTMLElement {
  private labelInput!: HTMLInputElement;
  private valueInput!: HTMLInputElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));

    this.labelInput = shadow.querySelector('.label-input') as HTMLInputElement;
    this.valueInput = shadow.querySelector('.value-input') as HTMLInputElement;
    this.labelInput.value = 'LLM Node';
    this.labelInput.readOnly = true;
    if (this.hasAttribute('value')) {
      this.valueInput.value = this.getAttribute('value')!;
    }
    this.valueInput.addEventListener('input', () => {
      this.setAttribute('value', this.valueInput.value);
    });

    // Make the card draggable (except when clicking inputs)
    const card = shadow.querySelector('.card') as HTMLElement;
    card.addEventListener('mousedown', (e: MouseEvent) => {
      // Prevent drag if clicking on an input
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

  static get observedAttributes() {
    return ['label', 'value'];
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

  // Drag logic
  private isDragging = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;

  private handleDrag = (e: MouseEvent) => {
    if (!this.isDragging) return;
    this.style.left = `${e.clientX - this.dragOffsetX}px`;
    this.style.top = `${e.clientY - this.dragOffsetY}px`;
    // --- Sync top port node position if attached ---
    const portIdTop = this.getAttribute('data-port-id-top');
    if (portIdTop && (window as any).cytoscapeInstance) {
      const cy = (window as any).cytoscapeInstance;
      const portNode = cy.getElementById(portIdTop);
      if (portNode && portNode.length > 0) {
        // Place port at top border, centered horizontally
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
    // --- Sync bottom port node position if attached ---
    const portIdBottom = this.getAttribute('data-port-id-bottom');
    if (portIdBottom && (window as any).cytoscapeInstance) {
      const cy = (window as any).cytoscapeInstance;
      const portNode = cy.getElementById(portIdBottom);
      if (portNode && portNode.length > 0) {
        // Place port at bottom border, centered horizontally
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

  private stopDrag = () => {
    this.isDragging = false;
    document.removeEventListener('mousemove', this.handleDrag);
    document.removeEventListener('mouseup', this.stopDrag);
  };

  private syncPortsToCardPosition = () => {
    const portIdTop = this.getAttribute('data-port-id-top');
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
}

customElements.define('llm-node-card', LLMNodeCard);
export default LLMNodeCard; 