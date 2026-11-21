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

  let emulator = null;
  let enginePromise = null;

  document.getElementById("year").textContent = new Date().getFullYear();

  function setStatus(message, mode = "ready") {
    statusText.textContent = message;
    statusBox.classList.toggle("is-busy", mode === "busy");
    statusBox.classList.toggle("is-error", mode === "error");
  }

  function setControls(running) {
    pauseButton.disabled = !emulator;
    restartButton.disabled = !emulator;
    fullscreenButton.disabled = !emulator;
    stopButton.disabled = !emulator;
    pauseButton.textContent = running ? "Pause" : "Resume";
    startButton.disabled = Boolean(emulator);
  }

  function loadEngine() {
    if (window.V86) return Promise.resolve();
    if (enginePromise) return enginePromise;

    enginePromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/api/vm-assets/v86_all.js";
      script.async = true;
      script.onload = () => {
        if (typeof window.V86 === "function") {
          resolve();
        } else {
          reject(new Error("The emulator library loaded, but its V86 interface was not found."));
        }
      };
      script.onerror = () => reject(new Error("Could not load the browser emulator. Check your connection and try again."));
      document.head.appendChild(script);
    });

    return enginePromise;
  }

  async function startVm() {
    if (emulator) return;

    startButton.disabled = true;
    setStatus("Loading the browser virtual PC engine…", "busy");
    detail.textContent = "Loading the emulator engine and firmware.";
    placeholder.hidden = false;

    try {
      await loadEngine();

      setStatus("Starting the virtual computer…", "busy");
      detail.textContent = "The Debian ISO is streamed from the Restore Lab release as the virtual PC reads it.";

      emulator = new window.V86({
        wasm_path: "/api/vm-assets/v86.wasm",
        memory_size: 1024 * 1024 * 1024,
        vga_memory_size: 16 * 1024 * 1024,
        screen_container: screenContainer,
        bios: { url: "/api/vm-assets/seabios.bin" },
        vga_bios: { url: "/api/vm-assets/vgabios.bin" },
        cdrom: { url: "/api/restore-lab-iso", async: true, size: 782237696 },
        boot_order: 0x123,
        acpi: true,
        disable_speaker: true,
        autostart: true
      });

      emulator.add_listener("emulator-ready", () => {
        placeholder.hidden = true;
        setStatus("Virtual PC ready — booting Debian…", "busy");
        detail.textContent = "Firmware loaded. Waiting for the Debian live system to start.";
      });

      emulator.add_listener("emulator-started", () => {
        placeholder.hidden = true;
        setStatus("Restore Lab is running", "ready");
        detail.textContent = "Click the virtual screen to send keyboard and mouse input.";
        setControls(true);
      });

      emulator.add_listener("emulator-stopped", () => {
        if (emulator) {
          setStatus("Virtual PC paused", "ready");
          setControls(false);
        }
      });

      emulator.add_listener("ide-read-start", () => {
        detail.textContent = "Reading the live ISO from the release server…";
      });

      emulator.add_listener("download-progress", (event) => {
        if (event && event.file_name && event.lengthComputable && event.total > 0) {
          const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
          detail.textContent = "Loading " + event.file_name + " — " + percent + "%";
        }
      });

      emulator.add_listener("download-error", (event) => {
        const name = event && event.file_name ? event.file_name : "a virtual machine file";
        setStatus("A VM file could not be loaded", "error");
        detail.textContent = "Failed to load " + name + ". Check the network and refresh this page.";
      });

      setControls(true);
      screenContainer.focus();
    } catch (error) {
      emulator = null;
      setControls(false);
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
        detail.textContent = "The guest is paused. Press Resume to continue.";
        setControls(false);
      } else {
        await emulator.run();
        pauseButton.textContent = "Pause";
        setStatus("Restore Lab is running", "ready");
        setControls(true);
      }
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
    detail.textContent = "Closing the temporary live session.";

    try {
      await current.stop();
      await current.destroy();
    } catch (error) {
      // The emulator may already have stopped while the browser was closing it.
    }

    screenContainer.querySelectorAll("canvas").forEach((canvas) => {
      if (canvas.id === "vga") canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    });
    placeholder.hidden = false;
    setStatus("Virtual PC powered off", "ready");
    detail.textContent = "The temporary session has ended. Start OS to boot it again.";
    setControls(false);
    startButton.disabled = false;
  }

  startButton.addEventListener("click", startVm);
  pauseButton.addEventListener("click", togglePause);
  restartButton.addEventListener("click", () => {
    if (!emulator) return;
    emulator.restart();
    pauseButton.textContent = "Pause";
    setStatus("Restarting Restore Lab…", "busy");
    detail.textContent = "The virtual PC is rebooting from the live ISO.";
  });
  fullscreenButton.addEventListener("click", async () => {
    try {
      await screenContainer.requestFullscreen();
    } catch (error) {
      setStatus("Fullscreen is unavailable in this browser", "error");
    }
  });
  stopButton.addEventListener("click", stopVm);

  setControls(false);
})();
