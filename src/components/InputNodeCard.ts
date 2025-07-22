// InputNode.ts
// Purpose: Entry point for user input or external data.
// Data: Raw prompt, question, text input, or structured data (must be a string).
// Output: Sends data to the next node.
// Example: "What's the weather like today in Paris?"
// Flows to → ProcessNode or directly to FilterNode if no pre-processing is needed.

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
    <input class="label-input" value="Input Node" readonly />
    <div class="desc">Entry point for user input or external data.</div>
    <input class="value-input" placeholder="Ask question" />
    <div class="output">Output: Sends data to the next node.</div>
    <div class="warning" style="display:none;color:#d32f2f;font-size:12px;margin-top:4px;">Only string values are allowed.</div>
  </div>
`;

export class InputNodeCard extends HTMLElement {
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

    // Always show 'Input Node' as label, do not allow editing
    this.labelInput.value = 'Input Node';
    this.labelInput.readOnly = true;
    if (this.hasAttribute('value')) {
      this.valueInput.value = this.getAttribute('value')!;
    }

    // Remove label input event, label is not editable
    this.valueInput.addEventListener('input', () => {
      // Only allow string values (block numbers, booleans, etc)
      // In HTML input, all values are strings, but let's block if the user tries to enter only numbers or boolean literals
      const val = this.valueInput.value;
      if (/^\s*-?\d+(\.\d+)?\s*$/.test(val) || val.trim() === 'true' || val.trim() === 'false') {
        warning.style.display = 'block';
        this.valueInput.classList.add('invalid');
        return;
      } else {
        warning.style.display = 'none';
        this.valueInput.classList.remove('invalid');
      }
      this.setAttribute('value', val);
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

    // Optionally, add a style for invalid input
    const style = document.createElement('style');
    style.textContent = `.invalid { border-color: #d32f2f !important; }`;
    shadow.appendChild(style);
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
    const portId = this.getAttribute('data-port-id');
    if (portId && (window as any).cytoscapeInstance) {
      const cy = (window as any).cytoscapeInstance;
      const portNode = cy.getElementById(portId);
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
}

customElements.define('input-node-card', InputNodeCard);
export default InputNodeCard; 