import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { canAccessOrganizationFileByLinkId } from "@/lib/organization-access";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get("linkId");

    if (!linkId) {
      return NextResponse.json(
        { message: "Link ID is required" },
        { status: 400 }
      );
    }

    // This endpoint supports both authenticated and anonymous users
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
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
      }
    );

    // Get the authenticated user (if any) - anonymous users will have null session
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    // Get file metadata
    const { data: file, error } = await supabase
      .from("shared_files")
      .select("*")
      .eq("link_id", linkId)
      .single();

    if (error || !file) {
      return NextResponse.json({ message: "Link not found" }, { status: 404 });
    }

    // ORGANIZATION ACCESS CHECK - Add this section
    if (file.organization_id) {
      // This is an organization file - check if user has access
      if (!userId) {
        console.log("Organization file requires authentication");
        return NextResponse.json(
          {
            message: "Authentication required for organization files",
            error: "AUTHENTICATION_REQUIRED",
          },
          { status: 401 }
        );
      }

      // Check if user can access this organization file
      const canAccess = await canAccessOrganizationFileByLinkId(userId, linkId);
      if (!canAccess) {
        console.log("User does not have access to this organization file");
        return NextResponse.json(
          {
            message: "Access denied to organization file",
            error: "ORGANIZATION_ACCESS_DENIED",
          },
          { status: 403 }
        );
      }
    }

    // Check if link is expired
    const now = new Date();
    const expiresAt = new Date(file.expires_at);
    const isExpired = now > expiresAt || file.views >= file.max_views;

    // If the request is from the dashboard (authenticated user), verify ownership
    const isFromDashboard = searchParams.get("source") === "dashboard";
    if (isFromDashboard && userId && file.user_id !== userId) {
      return NextResponse.json(
        {
          message:
            "Unauthorized: You don't have permission to access this file",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      fileName: file.file_name,
      fileSize: file.file_size,
      expiresAt: file.expires_at,
      maxViews: file.max_views,
      views: file.views,
      isExpired,
      isOrganizationFile: !!file.organization_id, // Add this field
      // Only include owner-specific information if the user is the owner
      isOwner: userId === file.user_id,
    });
  } catch (error: any) {
    console.error("Validate link error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to validate link" },
      { status: 500 }
    );
  }
}
