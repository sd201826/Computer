# Restore Lab — PC Recovery Workspace

A GitHub Pages website for comparing Windows installation options, understanding USB/Rufus preparation, and booting a harmless setup-style simulator.

## Important distinction

The **Restore Lab Setup Simulator ISO is not Windows**. It contains a small GRUB boot menu with visual setup previews for Windows 11, 10, 7, Vista and XP. It does not contain Microsoft Windows files, install an operating system, format a drive, or modify files on the computer.

For real Windows installation media, use Microsoft's official download pages:
- [Windows 11](https://www.microsoft.com/software-download/windows11)
- [Windows 10](https://www.microsoft.com/software-download/windows10)

This project does not distribute Windows XP, Vista or Windows 7 ISO files. Use original licensed media for those legacy systems.

## Website

The site is static HTML, CSS and JavaScript. It can be hosted with GitHub Pages:

1. Open the repository's **Settings**.
2. Open **Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select branch **main** and folder **/(root)**, then save.
5. Open the Pages URL shown in that settings screen.

## Build the bootable demo ISO

The GitHub Actions workflow `.github/workflows/build-demo-iso.yml` builds a hybrid BIOS/UEFI GRUB ISO when the boot files change or when manually started.

- Open the **Actions** tab.
- Select **Build bootable setup simulator**.
- A successful run publishes a rolling release named `simulator-latest`.
- The workflow also uploads the ISO as a short-lived Actions artifact.

The ISO can be selected in Rufus for a visual boot test. It is not usable to install Windows.

## Browser and USB limitations

A normal website cannot directly enumerate, format or write raw USB mass-storage drives. Use Windows File Explorer and Rufus for actual USB device selection and writing. Rufus warns that writing an image erases the selected USB drive.

## Project scope

- Windows 11 and Windows 10 official download links.
- Legacy Windows compatibility notes.
- Rufus preparation guidance and restore checklist.
- Safe visual boot simulator ISO.
