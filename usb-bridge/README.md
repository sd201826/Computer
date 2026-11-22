RESTORE LAB USB BRIDGE — WINDOWS x64

PURPOSE
This companion app lets the Restore Lab website read a Rufus-written USB disk as a virtual hard drive. The bridge is read-only: it opens the selected physical disk with GENERIC_READ and contains no disk-write, partition, format, or erase endpoint.

RUN
1. Download RestoreLabUsbBridge-win-x64.zip from the Restore Lab GitHub release.
2. Extract the ZIP.
3. Double-click RestoreLabUsbBridge.exe and approve the Windows administrator prompt.
4. Keep its console window open.
5. Visit https://restore-lab.pages.dev/run.html.
6. Click Connect Windows USB Bridge, select the USB disk, and choose Boot USB in the virtual PC.

SAFETY
- The server listens only on 127.0.0.1, not on your Wi-Fi or public network.
- Only USB disks are listed.
- Physical disks are opened with read-only access.
- There are no write, format, delete, or partition-changing API routes.
- The virtual PC may write temporary changes to its in-memory overlay, but those writes are never sent to the physical USB.
- Close the console window to stop the local bridge.
- The bridge only accepts requests from https://restore-lab.pages.dev.

BROWSER STORAGE
The website can optionally save a complete copy in the browser's Origin Private File System (OPFS). This is browser-local storage for large files; localStorage is not suitable for multi-gigabyte disk images. Available quota depends on the browser and free disk space.

LIMITS
The virtual PC uses SeaBIOS. USB images that require UEFI-only boot may not start. Large disks may take a long time to copy into browser storage. You can boot directly from the USB while it remains plugged in and the bridge app stays open.

The executable is self-contained and does not require a separate .NET installation.
