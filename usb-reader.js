(() => {
  "use strict";

  const connectButton = document.getElementById("connectUsb");
  const chooseFiles = document.getElementById("chooseUsbFallback");
  const fallbackInput = document.getElementById("usbFolderInput");
  const backButton = document.getElementById("usbBack");
  const refreshButton = document.getElementById("usbRefresh");
  const clearButton = document.getElementById("usbDisconnect");
  const searchInput = document.getElementById("usbSearch");
  const list = document.getElementById("usbFileList");
  const status = document.getElementById("usbStatus");
  const driveName = document.getElementById("usbDriveName");
  const breadcrumb = document.getElementById("usbBreadcrumb");
  const countLabel = document.getElementById("usbCount");
  const preview = document.getElementById("usbPreview");
  const year = document.getElementById("year");

  let rootHandle = null;
  let folderStack = [];
  let fallbackFiles = null;
  let fallbackRootName = "";
  let currentEntries = [];
  let previewUrl = null;

  if (year) year.textContent = new Date().getFullYear();

  function setStatus(message, kind) {
    status.textContent = message;
    status.dataset.kind = kind || "info";
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return "—";
    if (bytes < 1024) return bytes + " B";
    const units = ["KB", "MB", "GB", "TB"];
    let value = bytes / 1024;
    let index = 0;
    while (value >= 1024 && index < units.length - 1) {
      value /= 1024;
      index++;
    }
    return value.toFixed(value >= 100 ? 0 : 1) + " " + units[index];
  }

  function extension(name) {
    const index = name.lastIndexOf(".");
    return index > 0 ? name.slice(index + 1).toLowerCase() : "";
  }

  function revokePreviewUrl() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }

  function showEmptyPreview(message) {
    revokePreviewUrl();
    preview.replaceChildren();
    const p = document.createElement("p");
    p.className = "usb-preview-empty";
    p.textContent = message;
    preview.appendChild(p);
  }

  function createText(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function currentFolder() {
    return folderStack[folderStack.length - 1] || null;
  }

  function updatePath() {
    const names = folderStack.map((folder) => folder.name);
    breadcrumb.textContent = names.join("  /  ");
    driveName.textContent = rootHandle ? rootHandle.name : fallbackRootName;
    backButton.disabled = Boolean(rootHandle && folderStack.length <= 1);
  }

  function createEntryButton(entry, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "usb-entry";
    button.addEventListener("click", onClick);

    const icon = createText("span", "usb-entry-icon", entry.kind === "directory" ? "▰" : "▤");
    const name = createText("span", "usb-entry-name", entry.name);
    const type = createText("span", "usb-entry-type", entry.kind === "directory" ? "Folder" : (extension(entry.name).toUpperCase() || "File"));
    const size = createText("span", "usb-entry-size", entry.kind === "directory" ? "—" : formatBytes(entry.size));

    button.append(icon, name, type, size);
    return button;
  }

  function filteredEntries() {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) return currentEntries;
    return currentEntries.filter((entry) =>
      entry.name.toLowerCase().includes(query) ||
      extension(entry.name).includes(query)
    );
  }

  function renderEntries() {
    list.replaceChildren();
    const entries = filteredEntries();
    countLabel.textContent = entries.length + (entries.length === 1 ? " item" : " items");

    if (!entries.length) {
      list.appendChild(createText("p", "usb-list-empty", currentEntries.length ? "No matching files or folders." : "This folder is empty, or its contents could not be read."));
      return;
    }

    for (const entry of entries) {
      if (entry.kind === "directory") {
        list.appendChild(createEntryButton(entry, () => openFolder(entry.handle)));
      } else {
        list.appendChild(createEntryButton(entry, () => previewFile(entry.file)));
      }
    }
  }

  async function readCurrentFolder() {
    const folder = currentFolder();
    if (!folder) return;

    setStatus("Reading the selected folder…", "busy");
    refreshButton.disabled = true;
    list.replaceChildren(createText("p", "usb-list-empty", "Reading folder contents…"));

    try {
      const entries = [];
      for await (const handle of folder.values()) {
        if (handle.kind === "directory") {
          entries.push({
            kind: "directory",
            name: handle.name,
            size: 0,
            handle
          });
        } else if (handle.kind === "file") {
          const file = await handle.getFile();
          entries.push({
            kind: "file",
            name: file.name,
            size: file.size,
            file
          });
        }
        if (entries.length >= 2500) break;
      }

      entries.sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
      });

      currentEntries = entries;
      renderEntries();
      updatePath();
      setStatus("Connected in read-only mode. Files stay on this computer.", "ok");
    } catch (error) {
      currentEntries = [];
      renderEntries();
      setStatus("Could not read this folder. Reconnect it or choose another folder.", "error");
    } finally {
      refreshButton.disabled = false;
    }
  }

  async function openFolder(handle) {
    folderStack.push(handle);
    searchInput.value = "";
    showEmptyPreview("Choose a file to preview it. The website only reads files you select.");
    await readCurrentFolder();
  }

  async function connectUsb() {
    if (typeof window.showDirectoryPicker !== "function") {
      fallbackInput.click();
      return;
    }

    try {
      const handle = await window.showDirectoryPicker({ mode: "read" });
      rootHandle = handle;
      fallbackFiles = null;
      fallbackRootName = "";
      folderStack = [handle];
      searchInput.value = "";
      clearButton.disabled = false;
      showEmptyPreview("Choose a file to preview it. Nothing is uploaded to a server.");
      await readCurrentFolder();
    } catch (error) {
      if (error && error.name === "AbortError") return;
      setStatus("Folder access was not granted. Try selecting the USB drive again.", "error");
    }
  }

  function renderFallbackFiles() {
    const query = searchInput.value.trim().toLowerCase();
    const files = Array.from(fallbackFiles || []);
    const visible = files.filter((file) => {
      const path = file.webkitRelativePath || file.name;
      return !query || path.toLowerCase().includes(query);
    }).sort((a, b) => {
      return (a.webkitRelativePath || a.name).localeCompare(
        b.webkitRelativePath || b.name,
        undefined,
        { numeric: true, sensitivity: "base" }
      );
    });

    currentEntries = visible.map((file) => ({
      kind: "file",
      name: file.webkitRelativePath || file.name,
      size: file.size,
      file
    }));

    list.replaceChildren();
    countLabel.textContent = visible.length + (visible.length === 1 ? " file" : " files");
    if (!visible.length) {
      list.appendChild(createText("p", "usb-list-empty", "No matching files."));
      return;
    }

    for (const entry of currentEntries) {
      const button = createEntryButton(entry, () => previewFile(entry.file));
      list.appendChild(button);
    }
  }

  function previewFile(file) {
    if (!file) return;
    revokePreviewUrl();
    preview.replaceChildren();

    const title = createText("h3", "usb-preview-title", file.name);
    const metadata = createText("p", "usb-preview-meta", formatBytes(file.size) + " · " + (file.type || "Unknown file type"));
    preview.append(title, metadata);
    previewUrl = URL.createObjectURL(file);

    const ext = extension(file.name);
    const isText = /^(txt|md|log|ini|cfg|conf|json|xml|csv|html|htm|css|js|mjs|yaml|yml|toml|sh|bat|ps1|reg|nfo|desktop)$/i.test(ext) ||
      (file.type && (file.type.startsWith("text/") || file.type === "application/json" || file.type.endsWith("+xml")));

    if (isText && file.size <= 1024 * 1024) {
      const pre = createText("pre", "usb-text-preview", "Loading preview…");
      preview.appendChild(pre);
      file.text().then((value) => {
        pre.textContent = value.slice(0, 50000);
        if (value.length > 50000) {
          pre.textContent += "\n\n[Preview shortened. The original file was not changed.]";
        }
      }).catch(() => {
        pre.textContent = "This file could not be previewed.";
      });
    } else if (/^(png|jpe?g|gif|webp|bmp|svg)$/i.test(ext) || (file.type && file.type.startsWith("image/"))) {
      const image = document.createElement("img");
      image.className = "usb-image-preview";
      image.alt = file.name;
      image.src = previewUrl;
      preview.appendChild(image);
    } else if (ext === "iso" || ext === "img") {
      preview.appendChild(createText("p", "usb-preview-note", "This looks like a disk image. Open Browser OS and select this same file in its ISO / IMG picker to boot it in the virtual computer."));
      const link = createText("a", "button button-primary usb-run-link", "Open Browser OS");
      link.href = "run.html";
      preview.appendChild(link);
    } else {
      preview.appendChild(createText("p", "usb-preview-note", "This file can be read by the browser, but there is no safe built-in preview for this file type."));
    }

    const download = document.createElement("a");
    download.className = "usb-download-link";
    download.href = previewUrl;
    download.download = file.name.split("/").pop() || "usb-file";
    download.textContent = "Save a copy";
    preview.appendChild(download);
  }

  backButton.addEventListener("click", async () => {
    if (!rootHandle || folderStack.length <= 1) return;
    folderStack.pop();
    searchInput.value = "";
    showEmptyPreview("Choose a file to preview it.");
    await readCurrentFolder();
  });

  connectButton.addEventListener("click", connectUsb);
  chooseFiles.addEventListener("click", () => fallbackInput.click());
  fallbackInput.addEventListener("change", () => {
    const files = fallbackInput.files;
    if (!files || !files.length) return;
    rootHandle = null;
    folderStack = [];
    fallbackFiles = files;
    fallbackRootName = (files[0].webkitRelativePath || files[0].name).split("/")[0];
    clearButton.disabled = false;
    backButton.disabled = true;
    refreshButton.disabled = false;
    updatePath();
    renderFallbackFiles();
    setStatus("Folder selected. Browser fallback shows selected files only.", "ok");
    showEmptyPreview("Choose a file to preview it. Files are read locally in this tab.");
  });

  refreshButton.addEventListener("click", () => {
    if (rootHandle) readCurrentFolder();
    else if (fallbackFiles) {
      renderFallbackFiles();
      setStatus("Folder view refreshed.", "ok");
    }
  });

  clearButton.addEventListener("click", () => {
    rootHandle = null;
    folderStack = [];
    fallbackFiles = null;
    fallbackRootName = "";
    currentEntries = [];
    fallbackInput.value = "";
    searchInput.value = "";
    clearButton.disabled = true;
    backButton.disabled = true;
    refreshButton.disabled = true;
    driveName.textContent = "No drive selected";
    breadcrumb.textContent = "Connect a USB folder to begin";
    countLabel.textContent = "0 items";
    list.replaceChildren(createText("p", "usb-list-empty", "No USB folder connected."));
    showEmptyPreview("Select a USB folder, then choose a file to view it.");
    setStatus("No USB folder selected.", "info");
  });

  searchInput.addEventListener("input", () => {
    if (rootHandle) renderEntries();
    else if (fallbackFiles) renderFallbackFiles();
  });

  refreshButton.disabled = true;
  list.replaceChildren(createText("p", "usb-list-empty", "No USB folder connected."));
  showEmptyPreview("Select a USB folder, then choose a file to view it.");
})();