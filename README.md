# Restore Lab — PC Recovery Workspace

A GitHub Pages project for PC recovery learning, Windows installation guidance, and a bootable Linux live desktop.

## Restore Lab Live OS

The new **Restore Lab Live** image is a Debian-based Linux operating system for 64-bit PCs. It includes:

- XFCE graphical desktop
- Firefox ESR web browser
- Thunar file manager
- Network Manager
- Calamares graphical installer
- Windows-inspired desktop appearance presets (11, 10, 7, Vista and XP styles)

It boots from USB as a live session, so you can try the desktop without installing it to the internal drive. The optional installer can install Linux to a selected disk.

**This is not Microsoft Windows.** It does not include Windows 11, 10, 7, Vista or XP, and it cannot run every Windows program. The theme presets only change the Linux desktop's appearance.

### Build and download

GitHub Actions workflow: `.github/workflows/build-live-os.yml`

- Open the repository's **Actions** tab and choose **Build Restore Lab Live OS**.
- A successful build publishes the ISO to the [Restore Lab Live release](https://github.com/sd201826/Computer/releases/tag/restore-lab-live-latest).
- The workflow also uploads an ISO and SHA256 checksum as an Actions artifact.

The ISO is intended for USB boot. A normal website cannot directly enumerate or write raw USB drives; use a suitable USB image writer. Writing an image erases the selected USB drive.

### Installation safety

The live desktop can be tested without installing it. If you launch Calamares, it can change disk partitions and erase data on the disk you select. Back up important files first and carefully review the target disk. Do not continue if you are unsure which disk is selected.

## Windows installation information

For genuine Windows installation media, use Microsoft's official pages:

- [Windows 11](https://www.microsoft.com/software-download/windows11)
- [Windows 10](https://www.microsoft.com/software-download/windows10)

This project does not distribute Windows XP, Vista or Windows 7 ISO files. Use original licensed media for those legacy systems.

## Website hosting

The site is static HTML, CSS and JavaScript and can be hosted with GitHub Pages:

1. Open repository **Settings**.
2. Open **Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select branch **main** and folder **/(root)**, then save.
5. Open the Pages URL shown there.

## Safe visual simulator

The older `simulator-latest` ISO is only a GRUB setup-style menu demo. It is not Windows and cannot install an operating system.
