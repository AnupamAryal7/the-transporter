import { type NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-utils";

export const GET = withAdminAuth(
  async (req: NextRequest, _context, { supabase }) => {
    try {
      // Get total users count
      const { count: totalUsers, error: usersError } = await supabase
        .from("user_profiles")
        .select("*", { count: "exact", head: true });

      if (usersError) throw usersError;

      // Get total files count
      const { count: totalFiles, error: filesError } = await supabase
        .from("shared_files")
        .select("*", { count: "exact", head: true });

      if (filesError) throw filesError;

      // Get total storage used
      const { data: storageData, error: storageError } = await supabase
        .from("shared_files")
        .select("file_size");

      if (storageError) throw storageError;

      const totalStorage =
        storageData?.reduce(
          (sum: any, file: { file_size: any }) => sum + (file.file_size || 0),
          0
        ) || 0;

      // Get total downloads
      const { data: downloadsData, error: downloadsError } = await supabase
        .from("shared_files")
        .select("views");

      if (downloadsError) throw downloadsError;

      const totalDownloads =
        downloadsData?.reduce(
          (sum: any, file: { views: any }) => sum + (file.views || 0),
          0
        ) || 0;

      // Get recent activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { count: recentUsers, error: recentUsersError } = await supabase
        .from("user_profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo.toISOString());

      if (recentUsersError) throw recentUsersError;

      const { count: recentFiles, error: recentFilesError } = await supabase
        .from("shared_files")
        .select("*", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo.toISOString());

      if (recentFilesError) throw recentFilesError;

      // Get admin count
      const { count: adminCount, error: adminError } = await supabase
        .from("user_profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");

      if (adminError) throw adminError;

      return NextResponse.json({
        totalUsers: totalUsers || 0,
        totalFiles: totalFiles || 0,
        totalStorage,
        totalDownloads,
        recentUsers: recentUsers || 0,
        recentFiles: recentFiles || 0,
        adminCount: adminCount || 0,
      });
    } catch (error: any) {
      console.error("Error fetching admin stats:", error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch statistics" },
        { status: 500 }
      );
    }
  }
);
