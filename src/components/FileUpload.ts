class FileUpload extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      .upload-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 20px;
        border: 2px dashed #007acc;
        border-radius: 10px;
        background-color: #f9f9f9;
        color: #333;
        font-family: sans-serif;
        transition: background-color 0.3s ease;
        width: 100%;
        max-width: 400px;
        margin: auto;
      }

      .upload-wrapper:hover {
        background-color: #e6f2ff;
      }

      label {
        cursor: pointer;
        font-weight: bold;
        margin-bottom: 10px;
      }

      input[type="file"] {
        display: none;
      }

      .file-name {
        margin-top: 10px;
        font-size: 0.9rem;
        color: #555;
        word-break: break-all;
      }
    `;

    const wrapper = document.createElement("div");
    wrapper.classList.add("upload-wrapper");

    wrapper.innerHTML = `
      <label for="file-upload">📁 Click to upload BPMN file</label>
      <input type="file" id="file-upload"/>
      <div class="file-name" id="file-name">No file selected</div>
    `;

    shadow.appendChild(style);
    shadow.appendChild(wrapper);

    const input = shadow.querySelector("#file-upload") as HTMLInputElement;
    const fileName = shadow.querySelector("#file-name") as HTMLDivElement;

    input.addEventListener("change", () => {
      if (input.files?.[0]) {
        const file = input.files[0];
        const fileExtension = file.name.split(".").pop()?.toLowerCase();

        // File extension validation
        if (!fileExtension || !["bpmn", "xml"].includes(fileExtension)) {
          fileName.textContent = "❌ Unsupported file type";
          return; // ❌ Stop dispatching event
        }

        // File size validation (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (file.size > maxSize) {
          fileName.textContent = "❌ File too large (max 5MB)";
          return;
        }

        // File name validation (prevent empty or very long names)
        if (file.name.length === 0 || file.name.length > 255) {
          fileName.textContent = "❌ Invalid file name";
          return;
        }

        fileName.textContent = file.name;

        // ✅ Only dispatch if file is valid
        const event = new CustomEvent("file-selected", {
          detail: { file },
          bubbles: true,
          composed: true,
        });
        this.dispatchEvent(event);
      }
    });
  }
}

customElements.define("file-upload", FileUpload);
