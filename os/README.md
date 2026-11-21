# Restore Lab Setup Preview

This folder documents the small, bootable Debian-based live system used to launch the Restore Lab setup simulator.

## What is included

- Lean XFCE graphical desktop
- Firefox ESR browser
- Thunar file manager with removable-drive support
- Network Manager
- Original Windows-style setup preview page
- Desktop theme presets inspired by Windows 11, 10, 7, Vista and XP

## What it does

The computer boots into a real Debian Linux live session from USB. The setup-preview page opens in full-screen mode. Its screens are an interactive visual demonstration only.

It does **not** contain or install Microsoft Windows. It does not install, repair, activate, or recover Windows. It does not format or modify internal disks, and the build intentionally includes no disk installer.

The single ISO is built on GitHub Actions cloud runners, not on the user's PC. The workflow checks that the ISO does not exceed 2 GiB before publishing. The intended target is around 1–2 GB; the final size must be confirmed by a successful build.

For an actual Windows installation, use genuine installation media from Microsoft.
