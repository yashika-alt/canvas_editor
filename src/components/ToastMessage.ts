class ToastMessage extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      .toast {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #333;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.2);
        font-family: sans-serif;
        z-index: 9999;
        opacity: 0;
        transition: opacity 0.3s ease-in-out;
      }
      .toast.success {
        background: #4CAF50;
      }
      .toast.error {
        background: #f44336;
      }
    `;

    const wrapper = document.createElement('div');
    wrapper.className = 'toast';
    wrapper.id = 'toast';

    shadow.append(style, wrapper);
  }

  show(message: string, type: 'error' | 'success' = 'error') {
    const wrapper = this.shadowRoot?.getElementById('toast');
    if (!wrapper) return;

    wrapper.textContent = message;
    wrapper.className = `toast ${type}`;
    wrapper.style.opacity = '1';

    setTimeout(() => {
      if (wrapper) wrapper.style.opacity = '0';
    }, 3000);
  }
}

customElements.define('toast-message', ToastMessage);
