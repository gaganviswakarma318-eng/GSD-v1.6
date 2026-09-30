import {
  customToggle,
  customPanel,
  downloadType,
  downloadFormat,
  downloadQuality,
} from "./dom.js";
import { createSelectOptions } from "./utils.js";
import { DOWNLOAD_OPTIONS } from "./constants.js";

export function initializeCustomDownload() {
  if (!customToggle || !customPanel || !downloadType) return;

  createSelectOptions(downloadFormat, DOWNLOAD_OPTIONS.audio.formats);
  createSelectOptions(
    downloadQuality,
    DOWNLOAD_OPTIONS.audio.qualities.map((value) => ({ value, label: value })),
  );

  customToggle.addEventListener("click", () => {
    const isOpen = customPanel.classList.contains("open");

    if (isOpen) {
      customPanel.classList.remove("open");
      customPanel.classList.add("closing");

      window.clearTimeout(customPanel._closingTimer);
      customPanel._closingTimer = window.setTimeout(() => {
        customPanel.classList.remove("closing");
      }, 250);
    } else {
      customPanel.classList.remove("closing");
      customPanel.classList.add("open");
    }

    customToggle.classList.toggle("active");
    customToggle.setAttribute("aria-expanded", String(!isOpen));
    customPanel.setAttribute("aria-hidden", String(isOpen));
  });

  downloadType.addEventListener("change", (event) => {
    const type = event.target.value;
    const config = DOWNLOAD_OPTIONS[type];
    createSelectOptions(downloadFormat, config.formats);
    createSelectOptions(
      downloadQuality,
      config.qualities.map((value) => ({ value, label: value })),
    );
  });
}
