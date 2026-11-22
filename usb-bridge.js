(() => {
  "use strict";

  const BRIDGE_BASE = "http://127.0.0.1:17841";
  const CACHE_FILE = "restore-lab-rufus-usb.img";
  const CACHE_META_KEY = "restoreLabUsbImageMeta";
  const COPY_CHUNK_SIZE = 8 * 1024 * 1024;

  const connectButton = document.getElementById("bridgeConnectBtn");
  const refreshButton = document.getElementById("bridgeRefreshBtn");
  const diskSelect = document.getElementById("bridgeDiskSelect");
  const diskSize = document.getElementById("bridgeDiskSize");
  const bootButton = document.getElementById("bridgeBootBtn");
  const saveButton = document.getElementById("bridgeSaveBtn");
  const bootSavedButton = document.getElementById("bridgeBootSavedBtn");
  const deleteSavedButton = document.getElementById("bridgeDeleteSavedBtn");
  const status = document.getElementById("bridgeStatus");
  const savedInfo = document.getElementById("bridgeSavedInfo");
  const progressWrap = document.getElementById("bridgeProgressWrap");
  const progress = document.getElementById("bridgeProgress");
  const progressText = document.getElementById("bridgeProgressText");
  const progressPercent = document.getElementById("bridgeProgressPercent");

  if (!connectButton) return;

  let connected = false;
  let disks = [];
  let selectedDisk = null;
  let savedFile = null;
  let savedUrl = null;
  const activeSessions = new Set();

  function setStatus(message, kind = "info") {
    status.textContent = message;
    status.dataset.kind = kind;
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return "—";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit++;
    }
    return value.toFixed(value >= 100 ? 0 : 1) + " " + units[unit];
  }

  async function readJson(response) {
    let body = null;
    try { body = await response.json(); } catch (error) {}
    if (!response.ok) {
      const message = body && (body.detail || body.error || body.title)
        ? (body.detail || body.error || body.title)
        : "The Windows USB Bridge returned HTTP " + response.status + ".";
      throw new Error(message);
    }
    return body;
  }

  async function bridgeGet(path, options = {}) {
    const response = await fetch(BRIDGE_BASE + path, {
      method: options.method || "GET",
      headers: options.headers || {},
      cache: "no-store",
      credentials: "omit",
      mode: "cors"
    });
    return response;
  }

  async function closeSession(sessionId) {
    if (!sessionId) return;
    activeSessions.delete(sessionId);
    try {
      await bridgeGet("/api/sessions/" + encodeURIComponent(sessionId), { method: "DELETE" });
    } catch (error) {
      // The bridge will release all handles when it closes.
    }
  }

  function updateButtons() {
    const hasDisk = Boolean(selectedDisk);
    diskSelect.disabled = !connected || disks.length === 0;
    refreshButton.disabled = !connected;
    bootButton.disabled = !hasDisk;
    saveButton.disabled = !hasDisk || !("storage" in navigator) || !navigator.storage.getDirectory;
    bootSavedButton.disabled = !savedFile;
    deleteSavedButton.disabled = !savedFile;
  }

  function setSelectedDisk() {
    const index = Number(diskSelect.value);
    selectedDisk = disks.find((disk) => disk.index === index) || null;
    diskSize.textContent = selectedDisk ? selectedDisk.size : "—";
    updateButtons();
  }

  async function refreshDisks() {
    setStatus("Looking for USB storage devices…", "busy");
    const response = await bridgeGet("/api/disks");
    const data = await readJson(response);
    disks = Array.isArray(data.disks) ? data.disks : [];
    diskSelect.replaceChildren();

    if (!disks.length) {
      diskSelect.add(new Option("No USB disk detected", ""));
      selectedDisk = null;
      diskSize.textContent = "—";
      setStatus("Bridge connected, but Windows did not report a USB storage disk. Plug in the Rufus USB and refresh.", "warning");
      updateButtons();
      return;
    }

    for (const disk of disks) {
      const label = disk.model + " — " + disk.size + " (Disk " + disk.index + ")";
      diskSelect.add(new Option(label, String(disk.index)));
    }

    diskSelect.selectedIndex = 0;
    setSelectedDisk();
    setStatus(disks.length + " USB disk" + (disks.length === 1 ? "" : "s") + " detected. Select your Rufus USB.", "ok");
  }

  async function connectBridge() {
    connectButton.disabled = true;
    setStatus("Connecting to the Windows helper. Chrome may ask for loopback-network permission…", "busy");

    try {
      const response = await bridgeGet("/api/status");
      const health = await readJson(response);
      if (!health.ok || !health.readOnly) {
        throw new Error("The local helper did not return the expected read-only status.");
      }
      connected = true;
      await refreshDisks();
    } catch (error) {
      connected = false;
      updateButtons();
      const extra = error instanceof TypeError
        ? " Start RestoreLabUsbBridge.exe as administrator, keep its window open, then allow Chrome's Loopback network permission for Restore Lab and retry."
        : " Keep RestoreLabUsbBridge.exe running and retry.";
      setStatus((error.message || "Could not connect to the local helper.") + extra, "error");
    } finally {
      connectButton.disabled = false;
    }
  }

  async function openSelectedSession() {
    if (!selectedDisk) throw new Error("Select a USB disk first.");
    const response = await bridgeGet("/api/disks/" + encodeURIComponent(selectedDisk.index) + "/open");
    const data = await readJson(response);
    if (!data.sessionId || !Number.isSafeInteger(data.sizeBytes) || data.sizeBytes <= 0) {
      throw new Error("The helper returned incomplete USB disk information.");
    }
    return data;
  }

  function dispatchBootImage(image) {
    document.dispatchEvent(new CustomEvent("restore-lab:boot-usb", { detail: image }));
  }

  async function bootSelectedUsb() {
    if (!selectedDisk) return;
    bootButton.disabled = true;
    setStatus("Opening the USB in read-only mode…", "busy");

    try {
      const session = await openSelectedSession();
      const imageUrl = BRIDGE_BASE + "/api/sessions/" + session.sessionId + "/image";
      dispatchBootImage({
        url: imageUrl,
        size: session.sizeBytes,
        name: session.model + " — Rufus USB",
        source: "Live USB (read-only)",
        isUsbImage: true,
        sessionId: session.sessionId
      });
      setStatus("USB attached to the virtual PC. The helper must stay open while it runs.", "ok");
    } catch (error) {
      setStatus((error.message || "Could not open the selected USB.") + " Check that the USB is still connected.", "error");
    } finally {
      updateButtons();
    }
  }

  async function loadSavedCopy() {
    try {
      const metaText = localStorage.getItem(CACHE_META_KEY);
      if (!metaText || !navigator.storage || !navigator.storage.getDirectory) return;
      const meta = JSON.parse(metaText);
      const root = await navigator.storage.getDirectory();
      const handle = await root.getFileHandle(CACHE_FILE);
      const file = await handle.getFile();
      if (file.size > 0 && file.size === meta.sizeBytes) {
        savedFile = file;
        savedInfo.textContent = "Saved USB image: " + formatBytes(file.size) + " · " + (meta.model || "USB disk") + " · stored in this browser.";
      }
    } catch (error) {
      savedFile = null;
      try { localStorage.removeItem(CACHE_META_KEY); } catch (ignored) {}
    }
    updateButtons();
  }

  async function saveCopyToBrowser() {
    if (!selectedDisk) return;
    if (!navigator.storage || !navigator.storage.getDirectory) {
      setStatus("This browser does not support the private file storage needed for large USB images.", "error");
      return;
    }

    saveButton.disabled = true;
    progressWrap.hidden = false;
    progress.value = 0;
    progressPercent.textContent = "0%";
    progressText.textContent = "Checking browser storage…";

    let writable = null;
    let completed = false;
    let copySessionId = null;
    try {
      const session = await openSelectedSession();
      copySessionId = session.sessionId;
      activeSessions.add(copySessionId);
      const estimate = await navigator.storage.estimate();
      const free = Number.isFinite(estimate.quota) && Number.isFinite(estimate.usage)
        ? Math.max(0, estimate.quota - estimate.usage)
        : null;

      if (free !== null && free < session.sizeBytes * 1.01) {
        throw new Error("Not enough browser storage. The USB image needs about " + formatBytes(session.sizeBytes) +
          ", while this browser reports about " + formatBytes(free) + " available. You can still boot directly from the USB.");
      }

      let persisted = false;
      try {
        persisted = await navigator.storage.persist();
      } catch (error) {}

      const root = await navigator.storage.getDirectory();
      const handle = await root.getFileHandle(CACHE_FILE, { create: true });
      writable = await handle.createWritable({ keepExistingData: false });
      await writable.truncate(session.sizeBytes);

      let offset = 0;
      while (offset < session.sizeBytes) {
        const length = Math.min(COPY_CHUNK_SIZE, session.sizeBytes - offset);
        const end = offset + length - 1;
        const response = await bridgeGet(
          "/api/sessions/" + session.sessionId + "/image",
          { headers: { Range: "bytes=" + offset + "-" + end } }
        );

        if (response.status !== 206) {
          throw new Error("The helper did not return the expected USB data range (HTTP " + response.status + ").");
        }

        const bytes = await response.arrayBuffer();
        if (bytes.byteLength !== length) {
          throw new Error("A USB data block was incomplete. Please retry the copy.");
        }

        await writable.write({ type: "write", position: offset, data: bytes });
        offset += length;
        const percent = Math.min(100, Math.floor((offset / session.sizeBytes) * 100));
        progress.value = percent;
        progressPercent.textContent = percent + "%";
        progressText.textContent = "Saving USB image · " + formatBytes(offset) + " / " + formatBytes(session.sizeBytes);
      }

      await writable.close();
      writable = null;
      const file = await handle.getFile();
      if (file.size !== session.sizeBytes) {
        throw new Error("The browser saved a file with an unexpected size. The copy was not marked as complete.");
      }

      savedFile = file;
      try {
        localStorage.setItem(CACHE_META_KEY, JSON.stringify({
          sizeBytes: file.size,
          model: session.model,
          savedAt: new Date().toISOString()
        }));
      } catch (error) {}

      completed = true;
      savedInfo.textContent = "Saved USB image: " + formatBytes(file.size) + " · " + session.model + " · " +
        (persisted ? "persistent browser storage" : "browser-managed storage");
      progressText.textContent = "USB copy saved in this browser.";
      progressPercent.textContent = "100%";
      progress.value = 100;
      setStatus("USB image copied to browser storage. You can boot the saved copy later without the USB plugged in.", "ok");
    } catch (error) {
      if (writable) {
        try { await writable.abort(); } catch (ignored) {}
      }
      try {
        const root = await navigator.storage.getDirectory();
        await root.removeEntry(CACHE_FILE);
      } catch (ignored) {}
      savedFile = null;
      try { localStorage.removeItem(CACHE_META_KEY); } catch (ignored) {}
      setStatus(error.message || "Could not save the USB image.", "error");
      progressText.textContent = "Copy did not finish.";
    } finally {
      if (copySessionId) await closeSession(copySessionId);
      if (!completed) progressWrap.hidden = true;
      updateButtons();
    }
  }

  async function bootSavedCopy() {
    if (!savedFile) {
      await loadSavedCopy();
    }
    if (!savedFile) {
      setStatus("No complete USB image is saved in this browser yet.", "warning");
      return;
    }

    try {
      if (savedUrl) URL.revokeObjectURL(savedUrl);
      savedUrl = URL.createObjectURL(savedFile);
      dispatchBootImage({
        url: savedUrl,
        size: savedFile.size,
        name: CACHE_FILE,
        source: "Saved browser copy",
        isUsbImage: true,
        objectUrl: true
      });
      setStatus("Saved USB image attached to the virtual PC. The physical USB is not needed.", "ok");
    } catch (error) {
      setStatus("Could not open the saved browser copy: " + error.message, "error");
    }
  }

  async function deleteSavedCopy() {
    if (!window.confirm("Delete the saved USB image from this browser? This does not change the physical USB.")) return;
    try {
      const root = await navigator.storage.getDirectory();
      try { await root.removeEntry(CACHE_FILE); } catch (error) {}
      localStorage.removeItem(CACHE_META_KEY);
      if (savedUrl) URL.revokeObjectURL(savedUrl);
      savedUrl = null;
      savedFile = null;
      savedInfo.textContent = "No saved USB image in this browser.";
      setStatus("Saved browser copy deleted. The physical USB was not changed.", "ok");
    } catch (error) {
      setStatus("Could not delete the saved browser copy: " + error.message, "error");
    }
    updateButtons();
  }

  window.RestoreLabUsbBridge = { closeSession };

  connectButton.addEventListener("click", connectBridge);
  refreshButton.addEventListener("click", async () => {
    try { await refreshDisks(); }
    catch (error) { setStatus("Could not refresh USB disks: " + error.message, "error"); }
  });
  diskSelect.addEventListener("change", setSelectedDisk);
  bootButton.addEventListener("click", bootSelectedUsb);
  saveButton.addEventListener("click", saveCopyToBrowser);
  bootSavedButton.addEventListener("click", bootSavedCopy);
  deleteSavedButton.addEventListener("click", deleteSavedCopy);

  window.addEventListener("pagehide", () => {
    if (savedUrl) URL.revokeObjectURL(savedUrl);
  });

  updateButtons();
  loadSavedCopy();
})();