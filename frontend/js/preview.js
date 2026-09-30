import { getInfoFromApi } from "./api.js";
import { titleEl, thumbnailEl, previewPanel, urlInput } from "./dom.js";
import { updateProgress } from "./status.js";
import { isValidUrl, clearElementText } from "./utils.js";

let activePreviewRequestId = 0;

function updatePreviewVisibility() {
  if (!previewPanel) return;

  const hasTitle = titleEl && titleEl.textContent.trim();
  const hasThumbnail =
    thumbnailEl &&
    thumbnailEl.getAttribute("src") &&
    thumbnailEl.getAttribute("src").trim() !== "";

  previewPanel.style.display = hasTitle || hasThumbnail ? "block" : "none";
}

function showSkeleton() {
  titleEl?.classList.add("skeleton", "skeleton-title");
  thumbnailEl?.classList.add("skeleton", "skeleton-thumb");
}

function hideSkeleton() {
  titleEl?.classList.remove("skeleton", "skeleton-title");
  thumbnailEl?.classList.remove("skeleton", "skeleton-thumb");
}

export async function getInfo() {
  const url = urlInput?.value?.trim();
  const requestId = ++activePreviewRequestId;

  if (!url) {
    updateProgress("❌ Enter a URL");
    clearElementText(titleEl);
    thumbnailEl?.removeAttribute("src");
    updatePreviewVisibility();
    return;
  }

  if (!isValidUrl(url)) {
    updateProgress("❌ Invalid URL");
    clearElementText(titleEl);
    thumbnailEl?.removeAttribute("src");
    updatePreviewVisibility();
    return;
  }

  try {
    if (previewPanel) {
      previewPanel.style.display = "block";
    }

    clearElementText(titleEl);
    thumbnailEl?.removeAttribute("src");

    showSkeleton();
    updateProgress("⏳ Fetching info...");

    const data = await getInfoFromApi(url);

    if (requestId !== activePreviewRequestId) {
      return;
    }

    hideSkeleton();

    titleEl.innerText = data.title || "";
    thumbnailEl.src = data.thumbnail || "";

    updatePreviewVisibility();
    updateProgress("");
  } catch (error) {
    if (requestId !== activePreviewRequestId) {
      return;
    }

    console.error(error);
    hideSkeleton();
    clearElementText(titleEl);
    thumbnailEl?.removeAttribute("src");
    updatePreviewVisibility();
    updateProgress("❌ Failed to fetch info");
  }
}
