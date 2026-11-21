# Restore Lab — Installable Live USB

Restore Lab is a Debian-based Linux system with an XFCE desktop, a Windows-inspired visual demo, and a graphical installer. The website is hosted on Cloudflare Pages; GitHub Actions builds the ISO on GitHub's cloud runners. The build does not run on your PC.

Website: https://restore-lab.pages.dev

## What the USB does

- Boots a Debian Trixie live system on 64-bit PCs.
- Lets you try the live desktop without installing anything.
- Offers a graphical Calamares installer to install Restore Lab onto a selected internal or external drive.
- Includes Firefox ESR, a file manager, and Windows-inspired desktop themes.
- Includes the original Windows-style setup simulator as an optional visual demo.

**Restore Lab is NOT Microsoft Windows.** It does not contain Windows installation files, Windows drivers, activation, or a Windows installer. The Windows 11/10/7/Vista/XP screens are only a visual demonstration.

## Important installation warning

Installing Restore Lab changes the drive you choose. Some partition options can erase the existing operating system and personal files, including Windows. Back up important files first. Read the drive model, size, and partition list carefully. If you are unsure which drive to choose, stop and ask a trusted adult or an experienced technician to help.

The USB that you booted from is the installation source and should not be selected as the destination. Use the computer's internal SSD/HDD, or a separate spare drive if you are testing. Do not unplug the installer USB while the installer is running.

## Create the USB with Rufus

1. Download Restore-Lab-Installer-amd64.iso from the [Restore Lab release](https://github.com/sd201826/Computer/releases/tag/restore-lab-live-latest).
2. Open [Rufus](https://rufus.ie/) on Windows, select the correct USB device, and select the downloaded ISO.
3. Start writing the image. Rufus erases the selected USB, so copy any files you need before starting.
4. Restart the PC and use its one-time boot menu to select the USB.
5. Choose **Install Restore Lab to a selected drive** to open the graphical installer, or choose the live demo to try Restore Lab without installing.

The ISO is intended for BIOS/UEFI boot on 64-bit x86 PCs. Hardware compatibility can vary.

## Run the live OS in your browser

Open the [Restore Lab Browser VM](https://restore-lab.pages.dev/run.html) to try the emulated system. Browser virtualization is separate from booting a physical USB and may be slow or incompatible on some devices. The VM does not access your computer's real internal drives or physical USB devices.

## Build in the cloud

1. Open the [GitHub Actions workflow](https://github.com/sd201826/Computer/actions/workflows/build-live-os.yml).
2. Choose **Build Restore Lab Installer ISO** or use the latest successful run.
3. The workflow publishes the ISO and a SHA256 checksum to the [Restore Lab release](https://github.com/sd201826/Computer/releases/tag/restore-lab-live-latest).

GitHub Actions downloads packages and builds the image remotely. No Node.js, Python, Visual Studio, or local ISO build software is required on your PC.

## Actual Microsoft Windows installation

For a real Windows installation, use Microsoft's genuine installation media:
- [Windows 11](https://www.microsoft.com/software-download/windows11)
- [Windows 10](https://www.microsoft.com/software-download/windows10)

Restore Lab is independent and is not affiliated with Microsoft. It does not distribute Windows installation images.
