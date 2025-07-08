"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  FileIcon,
  Clock,
  Eye,
  AlertTriangle,
  Loader2,
  Download,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { TERMS } from "@/lib/constants";

type FileMetadata = {
  fileName: string;
  fileSize: number;
  expiresAt: string;
  maxViews: number;
  views: number;
  isExpired: boolean;
};

export default function SharePage() {
  const params = useParams<{ linkId: string }>();
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  const {
    data: fileMetadata,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["file-metadata", params.linkId],
    queryFn: async () => {
      const response = await fetch(`/api/validateLink?linkId=${params.linkId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `Failed to validate ${TERMS.link.toLowerCase()}`
        );
      }
      return response.json() as Promise<FileMetadata>;
    },
  });

  // Format file size helper
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " bytes";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB";
    else return (bytes / 1073741824).toFixed(1) + " GB";
  };

  const handleDownload = async () => {
    if (isDownloading) return;

    setIsDownloading(true);

    try {
      console.log("Starting download for linkId:", params.linkId);

      const response = await fetch(`/api/download?linkId=${params.linkId}`, {
        method: "GET",
        headers: {
          Accept: "application/octet-stream, */*",
        },
      });

      console.log("Response status:", response.status);
      console.log(
        "Response headers:",
        Object.fromEntries(response.headers.entries())
      );

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        let errorMessage = `Failed to download file (status ${response.status})`;

        if (contentType && contentType.includes("application/json")) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch (jsonError) {
            console.error("Failed to parse error response as JSON:", jsonError);
          }
        } else {
          const errorText = await response.text();
          errorMessage = `Server error: ${errorText.substring(0, 100)}`;
        }

        throw new Error(errorMessage);
      }

      const contentType = response.headers.get("content-type");
      console.log("Response content-type:", contentType);

      if (contentType && contentType.includes("application/json")) {
        throw new Error("Server returned JSON instead of file data.");
      }

      const blob = await response.blob();
      console.log("Blob created - size:", blob.size, "type:", blob.type);

      if (blob.size === 0) {
        throw new Error("Downloaded file is empty");
      }

      let filename = fileMetadata?.fileName || "download";
      const contentDisposition = response.headers.get("content-disposition");
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(
          /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
        );
        if (filenameMatch && filenameMatch[1]) {
          filename = decodeURIComponent(filenameMatch[1].replace(/['"]/g, ""));
        }
      }

      console.log("Using filename for download:", filename);

      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: "Download successful",
        description: "File downloaded successfully.",
      });

      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (error) {
      console.error("Download error:", error);

      toast({
        title: "Download failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to download the file",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error || !fileMetadata ? (
        <div className="text-center py-12 border rounded-lg">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-xl font-medium mb-2">
            {TERMS.link} not found or expired
          </h3>
          <p className="text-muted-foreground mb-6">
            This {TERMS.link.toLowerCase()} may have expired, reached its
            maximum {TERMS.views.toLowerCase()} limit, or never existed.
          </p>
          <Link href="/">
            <Button>Go to homepage</Button>
          </Link>
        </div>
      ) : fileMetadata.isExpired ? (
        <div className="text-center py-12 border rounded-lg">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-xl font-medium mb-2">{TERMS.link} expired</h3>
          <p className="text-muted-foreground mb-6">
            This {TERMS.link.toLowerCase()} has expired or reached its maximum{" "}
            {TERMS.views.toLowerCase()} limit.
          </p>
          <Link href="/">
            <Button>Go to homepage</Button>
          </Link>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="p-6 bg-muted/30">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-primary/10 p-4">
                <FileIcon className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="text-xl font-semibold text-center mb-1 break-words">
              {fileMetadata.fileName}
            </h1>
            <p className="text-center text-muted-foreground">
              {formatFileSize(fileMetadata.fileSize)}
            </p>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center gap-1 p-3 rounded-lg border">
                <Clock className="h-5 w-5 text-muted-foreground mb-1" />
                <span className="text-xs text-muted-foreground">
                  {TERMS.expires} on
                </span>
                <span className="text-sm font-medium">
                  {format(new Date(fileMetadata.expiresAt), "MMM d, yyyy")}
                </span>
              </div>
              <div className="flex flex-col items-center gap-1 p-3 rounded-lg border">
                <Eye className="h-5 w-5 text-muted-foreground mb-1" />
                <span className="text-xs text-muted-foreground">
                  {TERMS.views}
                </span>
                <span className="text-sm font-medium">
                  {fileMetadata.views} of {fileMetadata.maxViews}
                </span>
              </div>
            </div>

            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full"
              size="lg"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              This {TERMS.file.toLowerCase()} is {TERMS.transport.toLowerCase()}
              ed securely via The Transporter. The{" "}
              {TERMS.download.toLowerCase()} {TERMS.link.toLowerCase()} will
              expire after {fileMetadata.maxViews} {TERMS.views.toLowerCase()}{" "}
              or on {format(new Date(fileMetadata.expiresAt), "MMMM d, yyyy")}.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
