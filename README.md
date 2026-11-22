# Restore Lab — USB Workspace & Browser OS

Website: https://restore-lab.pages.dev

Restore Lab can browse an ordinary Windows-mounted USB folder and boot a Rufus-written USB disk inside a browser-based virtual PC. The virtual PC is separate from Windows on your laptop, so it does not restart or replace your real operating system.

## Use a Rufus-written USB

1. Download the Restore Lab ISO and burn it to a USB with Rufus as usual.
2. Plug the USB into your Windows computer.
3. Download **RestoreLabUsbBridge-win-x64.zip** from the [Restore Lab GitHub release](https://github.com/sd201826/Computer/releases/tag/restore-lab-live-latest).
4. Extract the ZIP and run **RestoreLabUsbBridge.exe**. Approve the Windows administrator prompt.
5. Keep the helper's console window open.
6. Open the [Browser OS page](https://restore-lab.pages.dev/run.html).
7. Click **Connect Windows USB Bridge**, approve Chrome's Loopback network permission if prompted, and select your Rufus USB.
8. Click **Boot selected USB**. The virtual PC reads the USB image in chunks while the helper remains open.

The helper is a self-contained Windows x64 executable; no separate .NET installation is required.

## Save the USB in browser storage

On the Browser OS page, click **Save a copy in browser storage**. Restore Lab checks the available browser storage and copies the complete USB image to the browser's Origin Private File System (OPFS). After the copy finishes, use **Boot saved copy**. The saved image remains in this browser until you delete it or clear the site's data.

The browser localStorage API is not suitable for multi-gigabyte images, so the actual image is stored in OPFS. A small metadata record is kept in localStorage. Browser quota varies by device and free space.

## Read-only safety

- The helper binds only to 127.0.0.1; it does not expose the USB bridge to your Wi-Fi or the public internet.
- It lists USB storage devices and opens the selected physical disk with read-only access.
- The helper has no disk-write, formatting, partitioning, or erase endpoint.
- The virtual machine reads the USB as an asynchronous, read-only image URL. Guest write attempts remain in the emulator's temporary memory overlay and are never sent to the physical USB.
- The helper must remain running while booting directly from a USB. Close its console window to stop it.
- The browser bridge accepts requests only from https://restore-lab.pages.dev.

## Compatibility notes

The virtual PC uses SeaBIOS (legacy BIOS). Images that require UEFI-only boot may not start. Large USBs can be booted directly without first copying the whole disk into browser storage. Saving a copy requires enough available browser storage for the full physical disk size.

## Ordinary USB folder reader

The home page's **Connect USB folder** button still uses the browser folder picker for normal files and folders. That is separate from the raw-disk bridge used for Rufus USBs.

## Built-in Restore Lab system

The built-in Restore Lab ISO is a Debian-based Linux live system. It is not Microsoft Windows. The Windows-inspired setup screen is a visual demo only.
