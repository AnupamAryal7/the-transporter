import { useState } from "react";
import {
  downloadFile,
  getFileMetadata,
  FileMetadata,
} from "@/lib/download-utils";

export function useDownload() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<FileMetadata | null>(null);

  const fetchMetadata = async (linkId: string) => {
    try {
      setError(null);
      const fileMetadata = await getFileMetadata(linkId);
      setMetadata(fileMetadata);
      return fileMetadata;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch file information";
      setError(message);
      throw err;
    }
  };

  const download = async (linkId: string, filename?: string) => {
    try {
      setIsDownloading(true);
      setError(null);

      // First get metadata to check if file is valid
      const fileMetadata = await fetchMetadata(linkId);

      if (fileMetadata.isExpired) {
        throw new Error("This link has expired");
      }

      if (fileMetadata.viewsExceeded) {
        throw new Error("Maximum downloads reached for this file");
      }

      // Proceed with download
      await downloadFile(linkId, filename || fileMetadata.name);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Download failed";
      setError(message);
      throw err;
    } finally {
      setIsDownloading(false);
    }
  };

  return {
    download,
    fetchMetadata,
    isDownloading,
    error,
    metadata,
    resetError: () => setError(null),
  };
}
