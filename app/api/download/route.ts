import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  // Declare wantsJson early so it's available in catch block
  let wantsJson = false;

  try {
    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get("linkId");
    const isPreview = searchParams.get("preview") === "true";
    const isMobile = searchParams.get("mobile") === "true";
    const forceDownload = searchParams.get("download") === "true";
    const requestedFilename = searchParams.get("filename");
    const debug = searchParams.get("debug") === "true";
    const jsonResponse = searchParams.get("json") === "true";

    console.log("Download request params:", {
      linkId,
      isPreview,
      isMobile,
      forceDownload,
      requestedFilename,
      debug,
      jsonResponse,
    });

    // Check if client wants JSON response
    const acceptHeader = request.headers.get("accept");
    wantsJson =
      jsonResponse || acceptHeader?.includes("application/json") || debug;

    if (!linkId) {
      return wantsJson
        ? NextResponse.json({ message: "Link ID is required" }, { status: 400 })
        : NextResponse.redirect(
            new URL("/error?message=Link+ID+required", request.url)
          );
    }

    // Check if environment variables are defined
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error("Supabase environment variables are not defined");
      return wantsJson
        ? NextResponse.json(
            { message: "Server configuration error" },
            { status: 500 }
          )
        : NextResponse.redirect(
            new URL("/error?message=Server+error", request.url)
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
      return wantsJson
        ? NextResponse.json({ message: "Link not found" }, { status: 404 })
        : NextResponse.redirect(
            new URL("/error?message=Link+not+found", request.url)
          );
    }

    console.log("File metadata found:", {
      fileName: file.file_name,
      fileSize: file.file_size,
      views: file.views,
      maxViews: file.max_views,
    });

    // If this is a preview and the user is logged in, verify ownership
    if (isPreview && userId && file.user_id !== userId) {
      return wantsJson
        ? NextResponse.json(
            { message: "Unauthorized to preview this file" },
            { status: 403 }
          )
        : NextResponse.redirect(
            new URL("/error?message=Unauthorized", request.url)
          );
    }

    // For JSON responses, return file metadata without downloading
    if (wantsJson && !forceDownload) {
      return NextResponse.json({
        file: {
          name: file.file_name,
          size: file.file_size,
          type: getContentType(file.file_name),
          expiresAt: file.expires_at,
          views: file.views,
          maxViews: file.max_views,
          isExpired: new Date() > new Date(file.expires_at),
          viewsExceeded: file.views >= file.max_views,
        },
      });
    }

    // For non-preview (actual downloads), anyone with the link can download
    // Check if link is expired
    const now = new Date();
    const expiresAt = new Date(file.expires_at);
    if (now > expiresAt || file.views >= file.max_views) {
      return wantsJson
        ? NextResponse.json(
            { message: "Link expired or maximum views reached" },
            { status: 410 }
          )
        : NextResponse.redirect(
            new URL("/error?message=Link+expired", request.url)
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

    console.log("Attempting to download file from storage:", file.file_path);

    // Get the file directly
    const { data: fileData, error: fileDataError } = await supabaseAdmin.storage
      .from("secure-files")
      .download(file.file_path);

    if (fileDataError || !fileData) {
      console.error("Error downloading file from storage:", fileDataError);
      return wantsJson
        ? NextResponse.json(
            { message: "Failed to retrieve file from storage" },
            { status: 500 }
          )
        : NextResponse.redirect(
            new URL("/error?message=File+not+found", request.url)
          );
    }

    console.log("File downloaded from storage successfully");

    // Convert the file to a buffer
    const buffer = await fileData.arrayBuffer();
    console.log("File converted to buffer, size:", buffer.byteLength);

    // Determine the content type
    const contentType = getContentType(file.file_name);
    console.log("Determined content type:", contentType);

    // Use the requested filename if provided, otherwise use the original
    const filename = requestedFilename || file.file_name;

    console.log("Returning file as attachment download with headers:", {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(
        filename
      )}"`,
      "Content-Length": buffer.byteLength.toString(),
    });

    // Return the file as a direct download with appropriate headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          filename
        )}"`,
        "Content-Length": buffer.byteLength.toString(),
        "Cache-Control": "no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: any) {
    console.error("Download error:", error);

    // Return appropriate error format based on what client expects
    if (wantsJson) {
      return NextResponse.json(
        {
          message: error.message || "Failed to download file",
          error: error.toString(),
          stack:
            process.env.NODE_ENV === "development" ? error.stack : undefined,
        },
        { status: 500 }
      );
    } else {
      // For blob requests, redirect to error page instead of returning JSON
      return NextResponse.redirect(
        new URL(
          `/error?message=${encodeURIComponent(
            error.message || "Download failed"
          )}`,
          request.url
        )
      );
    }
  }
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

    // Code
    java: "text/x-java-source",
    py: "text/x-python",
    c: "text/x-c",
    cpp: "text/x-c++",
    h: "text/x-c",
    cs: "text/x-csharp",
    php: "application/x-php",
    rb: "application/x-ruby",
    go: "application/x-go",
    swift: "text/x-swift",

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

    // Other usual types
    exe: "application/octet-stream",
    dll: "application/octet-stream",
    apk: "application/vnd.android.package-archive",
    ipa: "application/octet-stream",
  };

  return mimeTypes[extension] || "application/octet-stream";
}
