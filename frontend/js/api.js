import { API_BASE } from "./constants.js";

export async function getInfoFromApi(url) {
  const response = await fetch(
    `${API_BASE}/info?url=${encodeURIComponent(url)}`,
  );
  return response.json();
}

export async function startDownloadSession({ url, type, format, quality }) {
  const response = await fetch(`${API_BASE}/start-download`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, type, format, quality }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "Failed to start download");
  }

  const { downloadId } = await response.json();
  return downloadId;
}

export async function controlDownload(downloadId, action) {
  const response = await fetch(
    `${API_BASE}/api/download/${encodeURIComponent(downloadId)}/${action}`,
    { method: "POST" },
  );

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `Failed to ${action} download`);
  }

  return body;
}
