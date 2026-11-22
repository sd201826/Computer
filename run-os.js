(() => {
  const statusBox = document.getElementById("vmStatus");
  const statusText = document.getElementById("vmStatusText");
  const detail = document.getElementById("vmDetail");
  const screenContainer = document.getElementById("screen_container");
  const placeholder = document.getElementById("vmScreenPlaceholder");

  const startButton = document.getElementById("startVm");
  const pauseButton = document.getElementById("pauseVm");
  const restartButton = document.getElementById("restartVm");
  const fullscreenButton = document.getElementById("fullscreenVm");
  const stopButton = document.getElementById("stopVm");

  const isoInput = document.getElementById("isoFile");
  const isoName = document.getElementById("isoName");
  const clearIsoButton = document.getElementById("clearIso");

  const VIRTUAL_DISK_SIZE = 16 * 1024 * 1024 * 1024;

  let emulator = null;
  let enginePromise = null;
  let selectedIsoFile = null;
  let selectedUsbImage = null;

  document.getElementById("year").textContent = new Date().getFullYear();

  function setStatus(message, mode = "ready") {
    statusText.textContent = message;
    statusBox.classList.toggle("is-busy", mode === "busy");
    statusBox.classList.toggle("is-error", mode === "error");
  }

  function setControls() {
    const active = Boolean(emulator);
    pauseButton.disabled = !active;
    restartButton.disabled = !active;
    fullscreenButton.disabled = !active;
    stopButton.disabled = !active;
    isoInput.disabled = active;
    clearIsoButton.disabled = active;
    startButton.disabled = active;
  }

  function showSelectedIso(file) {
    selectedIsoFile = file || null;
    if (selectedIsoFile) {
      const size = (selectedIsoFile.size / (1024 * 1024)).toFixed(1) + " MiB";
      if (selectedIsoFile.name.toLowerCase().endsWith(".img")) {
        isoName.textContent = selectedIsoFile.name + " · " + size + " · virtual hard disk";
        detail.textContent = "This IMG file will be attached as the virtual hard drive and booted inside the browser.";
      } else {
        isoName.textContent = selectedIsoFile.name + " · " + size + " · virtual DVD";
        detail.textContent = "This ISO file will be attached as a virtual DVD and booted inside the browser.";
      }
    } else {
      isoName.textContent = "Restore-Lab-Installer-amd64.iso · online image";
      detail.textContent = "The built-in Restore Lab image is streamed into this virtual PC. No physical USB is required.";
    }
  }

  function loadEngine() {
    if (typeof window.V86 === "function") return Promise.resolve();
    if (enginePromise) return enginePromise;

    enginePromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/api/vm-assets/libv86.js";
      script.async = true;
      script.onload = () => {
        if (typeof window.V86 === "function") {
          resolve();
        } else {
          enginePromise = null;
          reject(new Error("The v86 library loaded, but its V86 constructor was not exposed."));
        }
      };
      script.onerror = () => {
        enginePromise = null;
        reject(new Error("Could not load the VM engine. Refresh the page and try again."));
      };
      document.head.appendChild(script);
    });

    return enginePromise;
  }

  async function getRemoteIsoSize() {
    const response = await fetch("/api/restore-lab-iso", {
      method: "HEAD",
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error("Could not check the installer ISO size. Try again or download it for Rufus.");
    }
    const size = Number(response.headers.get("Content-Length"));
    if (!Number.isSafeInteger(size) || size <= 0) {
      throw new Error("The installer host did not return a valid ISO size.");
    }
    return size;
  }

  function buildStorageOptions(remoteIsoSize) {
    if (selectedUsbImage) {
      const diskSource = selectedUsbImage.buffer
        ? { buffer: selectedUsbImage.buffer, async: true }
        : { url: selectedUsbImage.url, size: selectedUsbImage.size, async: true };
      return {
        hda: diskSource,
        cdrom: undefined,
        boot_order: 0x132
      };
    }

    const localDiskImage = Boolean(selectedIsoFile && selectedIsoFile.name.toLowerCase().endsWith(".img"));
    const localImage = selectedIsoFile ? { buffer: selectedIsoFile } : null;

    return {
      hda: localDiskImage ? localImage : {
        url: "/api/blank-disk",
        size: VIRTUAL_DISK_SIZE,
        async: true
      },
      cdrom: localDiskImage ? undefined : (localImage || {
        url: "/api/restore-lab-iso",
        size: remoteIsoSize,
        async: true
      }),
      boot_order: localDiskImage ? 0x132 : 0x123
    };
  }

  async function startVm() {
    if (emulator) return;

    startButton.disabled = true;
    setStatus("Loading the VM engine…", "busy");
    detail.textContent = "Loading the browser emulator library.";
    placeholder.hidden = false;

    try {
      await loadEngine();

      const remoteIsoSize = (selectedIsoFile || selectedUsbImage) ? null : await getRemoteIsoSize();
      setStatus("Creating the virtual PC…", "busy");
      const storage = buildStorageOptions(remoteIsoSize);
      detail.textContent = selectedUsbImage
        ? "Connecting the Rufus-written USB as a read-only virtual hard disk."
        : selectedIsoFile
          ? "Attaching your selected ISO / IMG file to the virtual PC."
          : "Streaming the Restore Lab ISO as a virtual DVD and attaching a temporary 16 GiB virtual hard disk.";

      emulator = new window.V86({
        wasm_path: "/api/vm-assets/v86.wasm",
        memory_size: 1024 * 1024 * 1024,
        vga_memory_size: 16 * 1024 * 1024,
        screen_container: screenContainer,
        bios: { url: "/api/vm-assets/seabios.bin" },
        vga_bios: { url: "/api/vm-assets/vgabios.bin" },
        hda: storage.hda,
        cdrom: storage.cdrom,
        fdc: {
          fda: { drive_type: 0 },
          fdb: { drive_type: 0 }
        },
        boot_order: storage.boot_order,
        acpi: true,
        disable_speaker: true,
        autostart: true
      });

      emulator.add_listener("emulator-ready", () => {
        placeholder.hidden = true;
        setStatus("Virtual PC ready — starting boot…", "busy");
        detail.textContent = selectedUsbImage
          ? "The USB image is connected in read-only mode. Guest changes cannot be written to the physical USB."
          : selectedIsoFile
            ? "Your selected local image is connected inside the virtual PC."
            : "The online Restore Lab ISO and temporary virtual hard disk are connected.";
      });

      emulator.add_listener("emulator-started", () => {
        placeholder.hidden = true;
        setStatus("Virtual PC is running", "ready");
        detail.textContent = "Click inside the virtual screen to use the keyboard and mouse.";
        setControls();
      });

      emulator.add_listener("emulator-stopped", () => {
        if (emulator) {
          setStatus("Virtual PC paused", "ready");
          setControls();
        }
      });

      emulator.add_listener("ide-read-start", () => {
        detail.textContent = "Reading boot media…";
      });

      emulator.add_listener("download-progress", (event) => {
        if (event && event.file_name && event.lengthComputable && event.total > 0) {
          const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
          detail.textContent = "Loading " + event.file_name + " — " + percent + "%";
        }
      });

      emulator.add_listener("download-error", (event) => {
        const name = event && event.file_name ? event.file_name : "a VM image";
        const failed = emulator;
        emulator = null;
        placeholder.hidden = false;
        setControls();
        setStatus("Could not load VM media", "error");
        detail.textContent = "Failed to load " + name + ". For a live USB, check that the USB is connected and Restore Lab USB Bridge is still running.";
        if (failed) {
          Promise.resolve().then(() => failed.stop()).then(() => failed.destroy()).catch(() => {});
        }
      });

      setControls();
      screenContainer.focus();
    } catch (error) {
      const failed = emulator;
      emulator = null;
      if (failed) {
        try { await failed.stop(); } catch (stopError) {}
        try { await failed.destroy(); } catch (destroyError) {}
      }
      placeholder.hidden = false;
      setControls();
      setStatus("Could not start the virtual PC", "error");
      detail.textContent = error && error.message ? error.message : "An unexpected error occurred.";
      startButton.disabled = false;
    }
  }

  async function togglePause() {
    if (!emulator) return;

    try {
      if (emulator.is_running()) {
        await emulator.stop();
        pauseButton.textContent = "Resume";
        setStatus("Virtual PC paused", "ready");
        detail.textContent = "The VM is paused. Press Resume to continue.";
      } else {
        await emulator.run();
        pauseButton.textContent = "Pause";
        setStatus("Virtual PC is running", "ready");
        detail.textContent = "Click inside the virtual screen to use the keyboard and mouse.";
      }
      setControls();
    } catch (error) {
      setStatus("Unable to change VM state", "error");
      detail.textContent = error && error.message ? error.message : "The VM control failed.";
    }
  }

  async function stopVm() {
    if (!emulator) return;

    const current = emulator;
    emulator = null;
    setStatus("Powering off the virtual PC…", "busy");
    detail.textContent = "Closing the temporary virtual session.";

    try {
      await current.stop();
      await current.destroy();
    } catch (error) {
      // The VM may already have stopped while the browser was closing it.
    }

    if (selectedUsbImage && selectedUsbImage.sessionId &&
        window.RestoreLabUsbBridge && typeof window.RestoreLabUsbBridge.closeSession === "function") {
      await window.RestoreLabUsbBridge.closeSession(selectedUsbImage.sessionId);
      selectedUsbImage.sessionId = null;
    }

    screenContainer.querySelectorAll("canvas").forEach((canvas) => {
      if (canvas.id === "vga") {
        canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
      }
    });

    placeholder.hidden = false;
    setStatus("Virtual PC powered off", "ready");
    detail.textContent = selectedUsbImage ? "The virtual session ended. The physical USB was not modified." : "The session ended. Changes to the temporary virtual disk are cleared when you power off.";
    setControls();
  }

  isoInput.addEventListener("change", () => {
    const file = isoInput.files && isoInput.files[0];
    if (selectedUsbImage && selectedUsbImage.objectUrl) URL.revokeObjectURL(selectedUsbImage.url);
    selectedUsbImage = null;

    if (file && !/\.(iso|img)$/i.test(file.name)) {
      isoInput.value = "";
      showSelectedIso(null);
      setStatus("Choose an ISO or IMG file", "error");
      detail.textContent = "Select a bootable .iso or .img file.";
      return;
    }

    showSelectedIso(file);
    setStatus(file ? "Local disk image selected" : "Ready — press Start OS", "ready");
  });

  clearIsoButton.addEventListener("click", () => {
    isoInput.value = "";
    if (selectedUsbImage && selectedUsbImage.objectUrl) URL.revokeObjectURL(selectedUsbImage.url);
    selectedUsbImage = null;
    showSelectedIso(null);
    setStatus("Using the built-in Restore Lab image", "ready");
  });

  startButton.addEventListener("click", startVm);
  pauseButton.addEventListener("click", togglePause);
  stopButton.addEventListener("click", stopVm);

  restartButton.addEventListener("click", () => {
    if (!emulator) return;
    emulator.restart();
    pauseButton.textContent = "Pause";
    setStatus("Restarting the virtual PC…", "busy");
    detail.textContent = selectedUsbImage ? "The virtual PC is rebooting from the attached USB disk." : "The virtual PC is rebooting from the selected boot image.";
  });

  fullscreenButton.addEventListener("click", async () => {
    try {
      await screenContainer.requestFullscreen();
    } catch (error) {
      setStatus("Fullscreen is unavailable in this browser", "error");
    }
  });

  document.addEventListener("restore-lab:boot-usb", async (event) => {
    const image = event.detail;
    const hasUrl = image && typeof image.url === "string";
    const hasFileBuffer = image && typeof File !== "undefined" && image.buffer instanceof File;
    if (!image || (!hasUrl && !hasFileBuffer) || !Number.isSafeInteger(image.size) || image.size <= 0) {
      setStatus("Invalid USB image", "error");
      detail.textContent = "The USB Bridge did not provide a valid disk image.";
      return;
    }

    if (emulator) {
      await stopVm();
    }
    if (selectedUsbImage && selectedUsbImage.objectUrl && selectedUsbImage.url !== image.url) {
      URL.revokeObjectURL(selectedUsbImage.url);
    }

    selectedUsbImage = image;
    selectedIsoFile = null;
    isoInput.value = "";
    isoName.textContent = image.name + " · " + (image.source || "USB disk") + " · " + (image.size / (1024 * 1024 * 1024)).toFixed(2) + " GiB";
    setStatus("Rufus USB selected — starting the virtual PC…", "busy");
    detail.textContent = "The USB will be attached as a read-only virtual hard disk.";
    await startVm();
  });

  showSelectedIso(null);
  setControls();
})();
