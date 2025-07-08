class EditableLabel extends HTMLElement {
  private input: HTMLInputElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      .label-edit-input {
        position: absolute;
        background: white;
        border: 2px solid #007acc;
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 10px;
        font-family: inherit;
        z-index: 1000;
        min-width: 60px;
        text-align: center;
        outline: none;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }

      .label-edit-input:focus {
        border-color: #005a9e;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
      }
    `;

    this.shadowRoot?.append(style);
  }

  public startEdit(node: any, cy: any, onSave?: (newLabel: string) => void) {
    const position = node.position();
    const zoom = cy.zoom();
    const pan = cy.pan();
    const container = cy.container();
    
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const currentLabel = node.data('label') || '';

    // Create input element
    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.value = currentLabel;
    this.input.className = 'label-edit-input';
    
    // Position the input over the node
    const x = (position.x * zoom + pan.x + rect.left);
    const y = (position.y * zoom + pan.y + rect.top - 20); // Offset above node
    
    this.input.style.left = `${x}px`;
    this.input.style.top = `${y}px`;
    
    // Add to DOM
    document.body.appendChild(this.input);
    this.input.focus();
    this.input.select();

    // Handle input events
    const handleInput = () => {
      const newLabel = this.input?.value.trim() || '';
      if (newLabel !== currentLabel) {
        node.data('label', newLabel);
        if (onSave) {
          onSave(newLabel);
        }
      }
      this.cleanup();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleInput();
      } else if (e.key === 'Escape') {
        this.cleanup();
      }
    };

    const handleBlur = () => {
      handleInput();
    };

    this.input.addEventListener('keydown', handleKeyDown);
    this.input.addEventListener('blur', handleBlur);
  }

  private cleanup() {
    if (this.input) {
      if (document.body.contains(this.input)) {
        document.body.removeChild(this.input);
      }
      this.input = null;
    }
  }

  public destroy() {
    this.cleanup();
  }
}

customElements.define("editable-label", EditableLabel); 