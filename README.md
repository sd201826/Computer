# Restore Lab — Windows-Style Setup Preview

Restore Lab is a website and a cloud-built bootable USB demo. The website is hosted on Cloudflare Pages; GitHub Actions builds the ISO on GitHub's cloud runners. The build does not run on your PC.

Website: https://restore-lab.pages.dev

## What the USB does

- Boots a small Debian Linux live system on 64-bit PCs.
- Automatically opens an original, clearly labelled Windows-style setup simulator.
- Lets you preview Windows 11, Windows 10, Windows 7, Windows Vista and Windows XP setup-inspired screens.
- Includes Firefox ESR and a file manager.
- Does not install any operating system, write to internal disks, format partitions, or alter files on the computer.

**This is a fake visual demonstration, not Microsoft Windows.** It does not contain Windows files, Windows drivers, activation, or a real Windows installer. The selected version is only a visual preview. Do not use this ISO as a Windows installation or recovery disk.

## One ISO, compact target

The workflow produces one bootable hybrid ISO named `Restore-Lab-Setup-Preview-amd64.iso`. It compresses the live filesystem and checks that the final ISO is no larger than 2 GiB. The intended size is around 1–2 GB, but the actual size is only known after a successful build.

## Build in the cloud

1. Open the GitHub Actions page.
2. Choose **Build Restore Lab Setup Preview ISO**.
3. Wait for the workflow to complete successfully.
4. The workflow publishes the single ISO and a SHA256 checksum to the [Restore Lab release](https://github.com/sd201826/Computer/releases/tag/restore-lab-live-latest).

GitHub Actions downloads packages and builds the image remotely. No Node.js, Python, Visual Studio, or local ISO build software is required on your PC.

## Using the ISO

To boot the demonstration, download the one ISO from the release page and write it to a USB using a USB image writer such as Rufus. This writing step is done on your PC because a normal website cannot directly access a raw USB drive. Writing the image erases the selected USB, so back up its contents first.

The ISO is designed for BIOS/UEFI boot on 64-bit x86 PCs. Hardware compatibility can vary.

## Real Windows installation

For an actual Windows installation, use Microsoft's genuine installation media:
- [Windows 11](https://www.microsoft.com/software-download/windows11)
- [Windows 10](https://www.microsoft.com/software-download/windows10)

Restore Lab is independent and is not affiliated with Microsoft. It does not distribute Windows installation images.
