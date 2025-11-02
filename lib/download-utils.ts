export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  expiresAt: string;
  views: number;
  maxViews: number;
  isExpired: boolean;
  viewsExceeded: boolean;
}

export async function getFileMetadata(linkId: string): Promise<FileMetadata> {
  const response = await fetch(
    `/api/download?linkId=${linkId}&json=true`
  );

  if (!response.ok) {
    throw new Error(`Failed to get file metadata: ${response.statusText}`);
  }

  const data = await response.json();
  return data.file;
}

export async function downloadFile(
  linkId: string,
  filename?: string
): Promise<void> {
  // Build query params
  const params = new URLSearchParams({ linkId });
  if (filename) {
    params.set("filename", filename);
  }

  // Use relative URL to ensure it uses the current origin (localhost in dev)
  const downloadUrl = `/api/download?${params.toString()}`;

  // Use traditional anchor download for better reliability
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = filename || "download";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export function isFileTypeSupported(filename: string): boolean {
  const extension = filename.split(".").pop()?.toLowerCase();
  const unsupportedTypes = ["exe", "dll", "bat", "cmd", "sh", "msi"];
  return !unsupportedTypes.includes(extension || "");
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " bytes";
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB";
  else return (bytes / 1073741824).toFixed(1) + " GB";
}
