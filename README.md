# Restore Lab — USB Browser & Virtual PC

Website: https://restore-lab.pages.dev

Restore Lab is a browser workspace for reading files from a USB folder and running a disk image inside an emulated computer. The website runs from Cloudflare Pages; it does not require a local Node.js, Python, or Visual Studio installation.

## USB Reader

1. Plug in a USB drive and wait for Windows to show it in File Explorer.
2. Open https://restore-lab.pages.dev and choose **Connect USB folder**.
3. In the browser folder picker, select the USB drive or a folder on it.
4. Browse files and folders, search names, and preview supported text and image files.

Access is read-only. The site reads only the folder you choose; it does not upload file contents to Restore Lab. If the folder picker is unavailable, use the fallback folder picker.

## Run an OS in the website

Open the [Browser OS](https://restore-lab.pages.dev/run.html).

- The built-in Restore Lab ISO is streamed from the [GitHub release](https://github.com/sd201826/Computer/releases/tag/restore-lab-live-latest).
- To run another image, click **Choose ISO / IMG from USB or PC** and select an ISO or IMG file from the USB drive or computer.
- ISO files are connected as a virtual DVD. IMG files are connected as a virtual hard disk.
- The browser VM has an isolated temporary virtual hard disk. Changes to that disk are cleared when you power off the VM.

## Important browser limits

A normal website cannot take over a physical USB mass-storage device or read raw USB sectors and boot sectors. The USB Reader can browse files only from a Windows-mounted folder that you explicitly select. A USB made bootable by Rufus is not an ISO file, so the website cannot attach that entire physical USB as a raw device. To run an OS in the browser, choose its original ISO or a compatible IMG file.

The browser VM runs separately from your real Windows session. It does not restart your PC, access your internal Windows drive, or install an OS onto your physical USB.

Restore Lab is Debian-based Linux, not Microsoft Windows. Windows-style setup screens included in the image are visual previews only.
