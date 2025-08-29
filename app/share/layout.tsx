"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Download,
  AlertCircle,
  Loader2,
  FileText,
  Eye,
  Calendar,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useDownload } from "@/hooks/use-download";
import { formatFileSize } from "@/lib/download-utils";
import { TERMS } from "@/lib/constants";

export default function SharePage() {
  const params = useParams();
  const linkId = params.linkid as string;
  const { download, fetchMetadata, isDownloading, error, metadata } =
    useDownload();
  const [isMetadataLoaded, setIsMetadataLoaded] = useState(false);

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        await fetchMetadata(linkId);
      } catch (err) {
        console.error("Failed to load file metadata:", err);
      } finally {
        setIsMetadataLoaded(true);
      }
    };

    if (linkId) {
      loadMetadata();
    }
  }, [linkId, fetchMetadata]);

  const handleDownload = async () => {
    try {
      await download(linkId);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  const formatExpirationDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiration = new Date(expiresAt);
    const diffMs = expiration.getTime() - now.getTime();

    if (diffMs <= 0) return "Expired";

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0)
      return `${diffDays} day${diffDays !== 1 ? "s" : ""} remaining`;
    if (diffHours > 0)
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} remaining`;

    return "Less than 1 hour remaining";
  };

  if (!isMetadataLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading file information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mx-auto max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!metadata) {
    return (
      <Alert variant="destructive" className="mx-auto max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>File Not Found</AlertTitle>
        <AlertDescription>
          The requested file could not be found or has been removed.
        </AlertDescription>
      </Alert>
    );
  }

  const isExpired = metadata.isExpired || metadata.viewsExceeded;
  const timeRemaining = getTimeRemaining(metadata.expiresAt);

  return (
    <div className="space-y-6">
      <Card className="mx-auto max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-6">
            {/* File Icon and Name */}
            <div className="space-y-3">
              <div className="flex justify-center">
                <div className="rounded-full bg-primary/10 p-4">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
              </div>

              <h1 className="text-2xl font-bold break-words">
                {metadata.name}
              </h1>

              <div className="flex justify-center">
                <Badge variant="secondary" className="text-sm">
                  {formatFileSize(metadata.size)}
                </Badge>
              </div>
            </div>

            {/* File Metadata */}
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Downloads
                </span>
                <span className="font-medium">
                  {metadata.views} / {metadata.maxViews}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Expires
                </span>
                <span className="font-medium">
                  {formatExpirationDate(metadata.expiresAt)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Status
                </span>
                <span className="font-medium">{timeRemaining}</span>
              </div>
            </div>

            {/* Download Button or Error */}
            {isExpired ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>
                  {metadata.isExpired
                    ? "Link Expired"
                    : "Download Limit Reached"}
                </AlertTitle>
                <AlertDescription>
                  {metadata.isExpired
                    ? "This download link has expired and is no longer available."
                    : "The maximum number of downloads has been reached for this file."}
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
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
                      Download {TERMS.file.toLowerCase()}
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground">
                  This {TERMS.file.toLowerCase()} will be downloaded directly to
                  your device.
                </p>
              </div>
            )}

            {/* Security Notice */}
            {!isExpired && (
              <Alert className="bg-muted/50">
                <AlertTitle className="text-sm">Security Notice</AlertTitle>
                <AlertDescription className="text-xs">
                  Only download files from sources you trust. This{" "}
                  {TERMS.file.toLowerCase()} will expire after{" "}
                  {timeRemaining.toLowerCase()}.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
