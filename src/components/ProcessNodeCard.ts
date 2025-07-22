// ProcessNodeCard.ts
// Purpose: Represents a processing step in the flow.
// Data: Accepts a string input to be processed.
// Output: Sends processed data to the next node.

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
    <input class="label-input" value="Process Node" readonly />
    <div class="desc">Processing step: accepts and processes a string input.</div>
    <input class="value-input" placeholder="Enter data to process..." />
    <div class="output">Output: Sends processed data to the next node.</div>
    <div class="warning">Only string values are allowed.</div>
  </div>
`;

export class ProcessNodeCard extends HTMLElement {
  private labelInput!: HTMLInputElement;
  private valueInput!: HTMLInputElement;
  private isDragging = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;

  constructor() {
    super();
    console.log('ProcessNodeCard: constructor called');
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));

    this.labelInput = shadow.querySelector('.label-input') as HTMLInputElement;
    this.valueInput = shadow.querySelector('.value-input') as HTMLInputElement;
    const warning = shadow.querySelector('.warning') as HTMLDivElement;

    // Always show 'Process Node' as label, do not allow editing
    this.labelInput.value = 'Process Node';
    this.labelInput.readOnly = true;
    if (this.hasAttribute('value')) {
      this.valueInput.value = this.getAttribute('value')!;
    }

    // Attach the event handler in both constructor and connectedCallback
    if (this.valueInput) {
      this.valueInput.addEventListener('input', this.handleInput);
    }

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

  connectedCallback() {
    this.attachInputHandler();
    // Watch for changes in the shadow DOM
    if (this.shadowRoot) {
      const observer = new MutationObserver(() => {
        this.attachInputHandler();
      });
      observer.observe(this.shadowRoot, { childList: true, subtree: true });
    }
    // Attach handler on focus as well
    const input = this.shadowRoot?.querySelector('.value-input');
    if (input) {
      input.addEventListener('focus', () => this.attachInputHandler());
    }
  }

  private attachInputHandler() {
    const input = this.shadowRoot?.querySelector('.value-input');
    if (input && !(input as any).__handlerAttached) {
      input.addEventListener('input', this.handleInput);
      (input as any).__handlerAttached = true; // Prevent double-attachment
      console.log('Attaching input handler to', input);
    }
  }

  private handleInput = () => {
    const val = this.valueInput.value;
    let invalid = false;
    let profanity = false;
    const warning = this.shadowRoot?.querySelector('.warning') as HTMLDivElement;
    if (/^\s*-?\d+(\.\d+)?\s*$/.test(val) || val.trim() === 'true' || val.trim() === 'false') {
      warning.style.display = 'block';
      this.valueInput.classList.add('invalid');
      invalid = true;
    } else {
      warning.style.display = 'none';
      this.valueInput.classList.remove('invalid');
    }
    // Profanity check (same as in CanvasToolbar)
    const offensiveWords = ['damn', 'stupid', 'hell', 'screwed'];
    if (!val.trim() || offensiveWords.some(word => val.toLowerCase().includes(word))) {
      profanity = true;
    }
    // Remove edge and clear filter node if invalid or profanity (REMOVE THIS LOGIC)
    // (No edge removal, no input node clearing, no focusing)
    this.setAttribute('value', val);
  }

  private handleDrag = (e: MouseEvent) => {
    if (!this.isDragging) return;
    this.style.left = `${e.clientX - this.dragOffsetX}px`;
    this.style.top = `${e.clientY - this.dragOffsetY}px`;
    // --- Sync top port node position if attached ---
    const portId = this.getAttribute('data-port-id');
    if (portId && (window as any).cytoscapeInstance) {
      const cy = (window as any).cytoscapeInstance;
      const portNode = cy.getElementById(portId);
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
      const portNodeBottom = cy.getElementById(portIdBottom);
      if (portNodeBottom && portNodeBottom.length > 0) {
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
          portNodeBottom.position({ x: portCanvasX, y: portCanvasY });
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
    console.log('ProcessNodeCard: value setter called', val);
    this.valueInput.value = val;
    this.setAttribute('value', val);
  }
}

customElements.define('process-node-card', ProcessNodeCard);
export default ProcessNodeCard; 