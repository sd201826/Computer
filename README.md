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

## Run the same installer on the website

Open the [Restore Lab Browser VM](https://restore-lab.pages.dev/run.html). It streams the exact same published Restore-Lab-Installer-amd64.iso that you download for Rufus, attaching it as a virtual DVD inside an emulated x86-64 PC. The browser VM has a temporary 16 GiB virtual hard disk so you can explore the installer in a sandbox. This virtual disk is cleared when you power off; it is not your real Windows drive and it does not write to a physical USB.

## Boot the same ISO from a real USB

Download Restore-Lab-Installer-amd64.iso from the [release page](https://github.com/sd201826/Computer/releases/tag/restore-lab-live-latest), select it in Rufus, and write it to your USB drive. Rufus erases the selected USB. Restart the computer, boot from that USB, then choose the live desktop or **Install Restore Lab**. The live USB runs on your real PC; the installer can install to a selected internal or external drive. Back up important files first and carefully check the destination drive.

The browser VM and the physical USB use the same ISO, but they operate in different places: the browser is an isolated virtual computer, while the USB boots your actual computer. The browser cannot use a physical USB drive or modify your computer's Windows installation.

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
