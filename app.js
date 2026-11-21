const systems = {
  win11: {
    title: "Windows 11",
    icon: "▦",
    eyebrow: "OFFICIAL INSTALLATION MEDIA",
    description: "Use Microsoft's official page to create installation media or download an ISO. Check Windows 11 hardware requirements before installing.",
    warning: "Back up important files first. Creating a bootable USB erases the USB drive.",
    link: "https://www.microsoft.com/software-download/windows11",
    linkText: "Open Microsoft",
    note: "Opens the official download page"
  },
  win10: {
    title: "Windows 10",
    icon: "▦",
    eyebrow: "MICROSOFT DOWNLOAD PAGE",
    description: "Microsoft's Windows 10 download page is the official starting point for available installation media. Windows 10 support ended on October 14, 2025, so plan for a supported system where possible.",
    warning: "Check your licence and back up your files. A clean installation can remove data from the selected disk.",
    link: "https://www.microsoft.com/software-download/windows10",
    linkText: "Open Microsoft",
    note: "Availability and options are controlled by Microsoft"
  },
  win7: {
    title: "Windows 7",
    icon: "✦",
    eyebrow: "LEGACY SYSTEM",
    description: "Windows 7 is no longer supported. This project does not host Windows 7 installation files. Use original media you are licensed to use and check the PC manufacturer's driver support.",
    warning: "Old systems may lack modern storage, USB 3 and network drivers. Avoid using an unsupported system online.",
    link: "",
    linkText: "",
    note: "No ISO is hosted by Restore Lab"
  },
  vista: {
    title: "Windows Vista",
    icon: "◈",
    eyebrow: "LEGACY SYSTEM",
    description: "Vista is an unsupported legacy operating system. Use your own original licensed installation media and verify that the hardware has compatible drivers.",
    warning: "Do not use random ISO or driver downloads. Unsupported operating systems are not safe for everyday internet use.",
    link: "",
    linkText: "",
    note: "No ISO is hosted by Restore Lab"
  },
  xp: {
    title: "Windows XP",
    icon: "✳",
    eyebrow: "LEGACY SYSTEM",
    description: "Windows XP is an unsupported legacy operating system. This site does not distribute XP files. Use only original media you are licensed to use, preferably in an offline virtual machine.",
    warning: "Modern hardware may not support XP setup. Keep XP offline because it no longer receives security updates.",
    link: "",
    linkText: "",
    note: "No ISO is hosted by Restore Lab"
  }
};

const cards = document.querySelectorAll("[data-system]");
const detailIcon = document.getElementById("detail-icon");
const detailEyebrow = document.getElementById("detail-eyebrow");
const detailTitle = document.getElementById("detail-title");
const detailDescription = document.getElementById("detail-description");
const detailWarning = document.getElementById("detail-warning");
const detailLink = document.getElementById("detail-link");
const detailLinkNote = document.getElementById("detail-link-note");

function selectSystem(key) {
  const item = systems[key];
  if (!item) return;

  cards.forEach((card) => {
    const active = card.dataset.system === key;
    card.classList.toggle("selected", active);
    card.setAttribute("aria-pressed", String(active));
  });

  detailIcon.textContent = item.icon;
  detailEyebrow.textContent = item.eyebrow;
  detailTitle.textContent = item.title;
  detailDescription.textContent = item.description;
  detailWarning.textContent = item.warning;

  if (item.link) {
    detailLink.href = item.link;
    detailLink.hidden = false;
    detailLink.textContent = item.linkText + " ↗";
    detailLinkNote.textContent = item.note;
  } else {
    detailLink.hidden = true;
    detailLink.removeAttribute("href");
    detailLinkNote.textContent = item.note;
  }
}

cards.forEach((card) => {
  card.addEventListener("click", () => selectSystem(card.dataset.system));
});

document.getElementById("year").textContent = new Date().getFullYear();
