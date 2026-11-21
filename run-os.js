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
      isoName.textContent = selectedIsoFile.name + " · " +
        (selectedIsoFile.size / (1024 * 1024)).toFixed(1) + " MiB";
      detail.textContent = "Your chosen ISO will be attached as a virtual DVD in this browser VM on the next start.";
    } else {
      isoName.textContent = "Restore Lab installer ISO · size checked at start";
      detail.textContent = "The same Restore-Lab-Installer-amd64.iso used by Rufus is streamed here as a virtual DVD.";
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

  function selectedBootMedia(remoteIsoSize) {
    if (selectedIsoFile) {
      return { buffer: selectedIsoFile, async: true };
    }
    return {
      url: "/api/restore-lab-iso",
      size: remoteIsoSize,
      async: true
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

      const remoteIsoSize = selectedIsoFile ? null : await getRemoteIsoSize();
      setStatus("Creating the virtual PC…", "busy");
      detail.textContent = "Attaching the same published installer ISO and a blank 16 GiB virtual hard disk.";

      emulator = new window.V86({
        wasm_path: "/api/vm-assets/v86.wasm",
        memory_size: 1024 * 1024 * 1024,
        vga_memory_size: 16 * 1024 * 1024,
        screen_container: screenContainer,
        bios: { url: "/api/vm-assets/seabios.bin" },
        vga_bios: { url: "/api/vm-assets/vgabios.bin" },
        cdrom: selectedBootMedia(remoteIsoSize),
        hda: {
          url: "/api/blank-disk",
          size: VIRTUAL_DISK_SIZE,
          async: true
        },
        fdc: {
          fda: { drive_type: 0 },
          fdb: { drive_type: 0 }
        },
        boot_order: 0x123,
        acpi: true,
        disable_speaker: true,
        autostart: true
      });

      emulator.add_listener("emulator-ready", () => {
        placeholder.hidden = true;
        setStatus("Virtual PC ready — starting boot…", "busy");
        detail.textContent = "The published installer ISO is connected as a virtual DVD, with a temporary 16 GiB virtual hard disk.";
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
        setStatus("Could not load VM media", "error");
        detail.textContent = "Failed to load " + name + ". Check the connection, then power off and retry.";
      });

      setControls();
      screenContainer.focus();
    } catch (error) {
      emulator = null;
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

    screenContainer.querySelectorAll("canvas").forEach((canvas) => {
      if (canvas.id === "vga") {
        canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
      }
    });

    placeholder.hidden = false;
    setStatus("Virtual PC powered off", "ready");
    detail.textContent = "The session ended. The temporary 16 GiB virtual disk is cleared when you power off.";
    setControls();
  }

  isoInput.addEventListener("change", () => {
    const file = isoInput.files && isoInput.files[0];
    if (file && !/\.(iso|img)$/i.test(file.name)) {
      isoInput.value = "";
      showSelectedIso(null);
      setStatus("Choose an ISO or IMG file", "error");
      detail.textContent = "Select a bootable .iso or .img file.";
      return;
    }
    showSelectedIso(file);
    setStatus(file ? "Custom installer media selected" : "Ready — press Start OS", "ready");
  });

  clearIsoButton.addEventListener("click", () => {
    isoInput.value = "";
    showSelectedIso(null);
    setStatus("Using the same online installer ISO", "ready");
  });

  startButton.addEventListener("click", startVm);
  pauseButton.addEventListener("click", togglePause);
  stopButton.addEventListener("click", stopVm);

  restartButton.addEventListener("click", () => {
    if (!emulator) return;
    emulator.restart();
    pauseButton.textContent = "Pause";
    setStatus("Restarting the virtual PC…", "busy");
    detail.textContent = "The computer is rebooting from the virtual CD/DVD.";
  });

  fullscreenButton.addEventListener("click", async () => {
    try {
      await screenContainer.requestFullscreen();
    } catch (error) {
      setStatus("Fullscreen is unavailable in this browser", "error");
    }
  });

  showSelectedIso(null);
  setControls();
})();
