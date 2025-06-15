import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get("linkId");
    const isPreview = searchParams.get("preview") === "true";
    const isMobile = searchParams.get("mobile") === "true";
    const forceDownload = searchParams.get("download") === "true";
    const requestedFilename = searchParams.get("filename");
    const debug = searchParams.get("debug") === "true";

    if (!linkId) {
      return NextResponse.json(
        { message: "Link ID is required" },
        { status: 400 }
      );
    }

    // Check if environment variables are defined
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error("Supabase environment variables are not defined");
      return NextResponse.json(
        { message: "Server configuration error. Please contact support." },
        { status: 500 }
      );
    }

    // Get the authenticated user (if any)
    const cookieStore = await cookies();
    const authClient = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    });

    const {
      data: { session },
    } = await authClient.auth.getSession();
    const userId = session?.user?.id;

    // Create a Supabase client with service role for admin access
    const supabaseAdmin = createServerClient(supabaseUrl, supabaseServiceKey, {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // No-op for admin client
        },
      },
      auth: {
        persistSession: false,
      },
    });

    // Get file metadata using admin client
    const { data: file, error: fileError } = await supabaseAdmin
      .from("shared_files")
      .select("*")
      .eq("link_id", linkId)
      .single();

    if (fileError || !file) {
      console.error("Error fetching file metadata:", fileError);
      return NextResponse.json({ message: "Link not found" }, { status: 404 });
    }

    // If this is a preview and the user is logged in, verify ownership
    if (isPreview && userId && file.user_id !== userId) {
      // For previews, we only allow the file owner to preview
      return NextResponse.json(
        {
          message:
            "Unauthorized: You don't have permission to preview this file",
        },
        { status: 403 }
      );
    }

    // For non-preview (actual downloads), anyone with the link can download
    // Check if link is expired
    const now = new Date();
    const expiresAt = new Date(file.expires_at);
    if (now > expiresAt || file.views >= file.max_views) {
      return NextResponse.json(
        { message: "Link expired or maximum views reached" },
        { status: 410 }
      );
    }

    // Only increment view count if it's not a preview
    if (!isPreview) {
      const { error: updateError } = await supabaseAdmin
        .from("shared_files")
        .update({ views: file.views + 1 })
        .eq("id", file.id);

      if (updateError) {
        console.error("Error updating view count:", updateError);
      }
    }

    // Get the file directly
    const { data: fileData, error: fileDataError } = await supabaseAdmin.storage
      .from("secure-files")
      .download(file.file_path);

    if (fileDataError || !fileData) {
      console.error("Error downloading file:", fileDataError);
      throw fileDataError || new Error("Failed to download file");
    }

    // Convert the file to a buffer
    const buffer = await fileData.arrayBuffer();

    // Determine the content type
    const contentType = getContentType(file.file_name);

    // Use the requested filename if provided, otherwise use the original
    const filename = requestedFilename || file.file_name;

    // For direct download (mobile or forced download)
    if (isMobile || forceDownload || !isPreview) {
      // If debug mode is enabled, return information about the file
      if (debug) {
        return NextResponse.json({
          message: "Debug information",
          filename,
          contentType,
          fileSize: file.file_size,
          headers: {
            "Content-Type": contentType,
            "Content-Disposition": `attachment; filename="${encodeURIComponent(
              filename
            )}"`,
            "Content-Length": file.file_size.toString(),
            "Cache-Control": "no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }

      // Return the file as a direct download with appropriate headers
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${encodeURIComponent(
            filename
          )}"`,
          "Content-Length": file.file_size.toString(),
          "Cache-Control": "no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
          // Add additional headers to help with mobile downloads
          "X-Content-Type-Options": "nosniff",
          // Add CORS headers
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    } else {
      // For preview, just return the file with inline disposition
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `inline; filename="${encodeURIComponent(
            filename
          )}"`,
          "Content-Length": file.file_size.toString(),
          "Cache-Control": "no-store, must-revalidate",
          // Add CORS headers
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }
  } catch (error: any) {
    console.error("Download error:", error);
    return NextResponse.json(
      {
        message: error.message || "Failed to generate download link",
        // Only include stack trace in development
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// Helper function to format file size
function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + " bytes";
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB";
  else return (bytes / 1073741824).toFixed(1) + " GB";
}

// Helper function to determine content type based on file extension
function getContentType(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";

  const mimeTypes: Record<string, string> = {
    // Images
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    bmp: "image/bmp",
    ico: "image/x-icon",
    tiff: "image/tiff",
    tif: "image/tiff",

    // Documents
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    rtf: "application/rtf",

    // Text
    txt: "text/plain",
    csv: "text/csv",
    html: "text/html",
    htm: "text/html",
    css: "text/css",
    js: "text/javascript",
    json: "application/json",
    xml: "application/xml",
    md: "text/markdown",

    // Audio
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    m4a: "audio/mp4",
    flac: "audio/flac",
    aac: "audio/aac",

    // Video
    mp4: "video/mp4",
    webm: "video/webm",
    avi: "video/x-msvideo",
    mov: "video/quicktime",
    wmv: "video/x-ms-wmv",
    mkv: "video/x-matroska",
    flv: "video/x-flv",

    // Archives
    zip: "application/zip",
    rar: "application/x-rar-compressed",
    "7z": "application/x-7z-compressed",
    tar: "application/x-tar",
    gz: "application/gzip",

    // Other common types
    exe: "application/octet-stream",
    dll: "application/octet-stream",
    apk: "application/vnd.android.package-archive",
    ipa: "application/octet-stream",
  };

  return mimeTypes[extension] || "application/octet-stream";
}
