# Restore Lab Live

This folder contains the configuration for a bootable Debian-based live desktop.

## Included in the image

- XFCE desktop
- Firefox ESR browser
- Thunar file manager
- Network Manager
- Calamares graphical installer
- Dark desktop styling and Restore Lab wallpaper

## What it is — and is not

Restore Lab Live is a Linux operating system. It is not Windows and does not contain Windows 11, 10, 7, Vista or XP. Those names are only used for optional visual theme ideas on the website. It cannot run every Windows application.

The live desktop can be started from USB without installing to the internal drive. Installing with Calamares can modify or erase the selected disk. Back up first and carefully review every disk and partition selection.

The ISO is built automatically by GitHub Actions from the configuration in `config/`.
