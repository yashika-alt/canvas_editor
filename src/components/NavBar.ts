export class NavBar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this.shadowRoot!.innerHTML = `
      <style>
        .navbar {
          background: rgb(86, 164, 202);
          border-bottom: 1px solid #e0e0e0;
          position: sticky;
          top: 0;
          z-index: 1000;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .navbar-content {
          display: flex;
          align-items: center;
          position: relative;
          height: 50px;
        }

        .navbar ul {
          display: flex;
          justify-content: center;
          align-items: center;
          margin: 0;
          padding: 0;
          list-style: none;
          height: 50px;
          gap: 32px;
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          top: 0;
          bottom: 0;
        }

        .navbar a {
          text-decoration: none;
          color: #333;
          font-weight: 500;
          padding: 6px 12px;
          border-radius: 6px;
          transition: background-color 0.3s, color 0.3s;
        }

        .navbar a:hover {
          background-color: #f0f0ff;
          color: #2f3be4;
        }

        .navbar a.active {
          background-color: #e4e8ff;
          color: #2f3be4;
          font-weight: 600;
        }

        .download-btn {
          position: absolute;
          right: 24px;
          top: 50%;
          transform: translateY(-50%);
          background: #1976d2;
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 8px 14px;
          font-size: 14px;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: background 0.2s;
        }
        .download-btn:hover {
          background: #1565c0;
        }
        .download-btn svg {
          width: 18px;
          height: 18px;
        }
      </style>

      <nav class="navbar">
        <div class="navbar-content">
          <ul>
            <li><a href="/canvas" data-target="canvas">Canvas</a></li>
            <li><a href="/editor" data-target="editor">Code Editor</a></li>
            <li><a href="/import" data-target="import">Import File</a></li>
          </ul>
          <button class="download-btn graph-btn" title="Download SVG" style="display:none">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
           
          </button>
          <button class="download-btn code-btn" title="Download Code" style="display:none">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
            
          </button>
        </div>
      </nav>
    `;
  }

  connectedCallback() {
    const navLinks = this.shadowRoot!.querySelectorAll<HTMLAnchorElement>('a');
    const sections = document.querySelectorAll<HTMLElement>('.section');

    const showSection = (targetId: string) => {
      // Update nav active class
      navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('data-target') === targetId);
      });

      // Show the matching section
      sections.forEach(sec => {
        sec.classList.toggle('visible', sec.id === targetId);
      });
    };

    // Detect path on load
    const path = window.location.pathname.slice(1); // removes leading slash
    const defaultSection = path || 'canvas';
    showSection(defaultSection);

    // Handle clicks
    navLinks.forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const targetId = link.getAttribute('data-target');
        if (targetId) {
          window.history.pushState({}, "", `/${targetId}`);
          showSection(targetId);
        }
      });
    });

    // Handle browser back/forward
    window.addEventListener("popstate", () => {
      const currentPath = window.location.pathname.slice(1) || 'canvas';
      showSection(currentPath);
    });

    // Show/hide download buttons based on section
    const updateDownloadButtons = () => {
      const visibleSection = document.querySelector('.section.visible');
      const graphBtn = this.shadowRoot!.querySelector<HTMLButtonElement>(".graph-btn");
      const codeBtn = this.shadowRoot!.querySelector<HTMLButtonElement>(".code-btn");
      if (!visibleSection) return;
      if (visibleSection.id === 'canvas') {
        graphBtn!.style.display = '';
        codeBtn!.style.display = 'none';
      } else if (visibleSection.id === 'editor') {
        graphBtn!.style.display = 'none';
        codeBtn!.style.display = '';
      } else {
        graphBtn!.style.display = 'none';
        codeBtn!.style.display = 'none';
      }
    };
    updateDownloadButtons();
    // Update on navigation
    navLinks.forEach(link => {
      link.addEventListener('click', () => setTimeout(updateDownloadButtons, 0));
    });
    window.addEventListener("popstate", () => setTimeout(updateDownloadButtons, 0));

    // Download Graph button logic
    const graphBtn = this.shadowRoot!.querySelector<HTMLButtonElement>(".graph-btn");
    graphBtn?.addEventListener('click', () => {
      const toast = document.querySelector('toast-message') as any;
      const canvas = document.querySelector('cytoscape-editor') as any;
      if (canvas && typeof canvas.getCy === 'function') {
        const cy = canvas.getCy?.();
        if (cy) {
          if (cy.elements().length === 0) {
            toast?.show?.('Nothing on canvas to download.', 'error');
            return;
          }
          let svgContent = cy.svg({ scale: 1, full: true });
          if (!svgContent) {
            toast?.show?.('No SVG content found to download.', 'error');
            return;
          }
          
          const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
          const svgUrl = URL.createObjectURL(svgBlob);
          const aSvg = document.createElement('a');
          aSvg.href = svgUrl;
          aSvg.download = 'diagram.svg';
          document.body.appendChild(aSvg);
          aSvg.click();
          setTimeout(() => {
            document.body.removeChild(aSvg);
            URL.revokeObjectURL(svgUrl);
          }, 100);
          toast?.show?.('SVG file downloaded successfully.', 'success');
        } else {
          toast?.show?.('No SVG content found to download.', 'error');
        }
      } else {
        toast?.show?.('No SVG content found to download.', 'error');
      }
    });
    // Download Code button logic
    const codeBtn = this.shadowRoot!.querySelector<HTMLButtonElement>(".code-btn");
    codeBtn?.addEventListener('click', () => {
      const toast = document.querySelector('toast-message') as any;
      const monacoEl = document.querySelector('monaco-editor') as any;
      if (monacoEl && typeof monacoEl.getContent === 'function') {
        const xml = monacoEl.getContent();
        if (!xml || !xml.trim()) {
          toast?.show?.('No code found to download.', 'error');
          return;
        }
        const codeBlob = new Blob([xml], { type: 'application/xml' });
        const codeUrl = URL.createObjectURL(codeBlob);
        const aCode = document.createElement('a');
        aCode.href = codeUrl;
        aCode.download = 'diagram.bpmn';
        document.body.appendChild(aCode);
        aCode.click();
        setTimeout(() => {
          document.body.removeChild(aCode);
          URL.revokeObjectURL(codeUrl);
        }, 100);
        toast?.show?.('Code file downloaded successfully.', 'success');
      } else {
        toast?.show?.('No code found to download.', 'error');
      }
    });
  }
}

customElements.define("nav-bar", NavBar);
