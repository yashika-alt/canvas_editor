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

        .navbar ul {
          display: flex;
          justify-content: center;
          align-items: center;
          margin: 0;
          padding: 0;
          list-style: none;
          height: 50px;
          gap: 32px;
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
      </style>

      <nav class="navbar">
        <ul>
          <li><a href="/canvas" data-target="canvas">Canvas</a></li>
          <li><a href="/editor" data-target="editor">Code Editor</a></li>
          <li><a href="/import" data-target="import">Import File</a></li>
        </ul>
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
  }
}

customElements.define("nav-bar", NavBar);
