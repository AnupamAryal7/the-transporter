import { type NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-utils";

export const GET = withAdminAuth(
  async (req: NextRequest, _context, { supabase }) => {
    try {
      // Add cache control headers
      const headers = new Headers({
        "Cache-Control": "public, max-age=300, s-maxage=300", // Cache for 5 minutes
      });

      // Get all files
      const { data: files, error: filesError } = await supabase
        .from("shared_files")
        .select("file_name, file_size");

      if (filesError) throw filesError;

      // Extract file types and calculate statistics
      const fileTypes: Record<string, { count: number; totalSize: number }> =
        {};
      let totalFiles = 0;
      let totalSize = 0;

      files?.forEach((file: { file_size: number; file_name: string }) => {
        totalFiles++;
        totalSize += file.file_size;

        // Extract file extension
        const extension =
          file.file_name.split(".").pop()?.toLowerCase() || "unknown";

        if (!fileTypes[extension]) {
          fileTypes[extension] = { count: 0, totalSize: 0 };
        }

        fileTypes[extension].count++;
        fileTypes[extension].totalSize += file.file_size;
      });

      // Convert to array and sort by count
      const fileTypeStats = Object.entries(fileTypes)
        .map(([type, stats]) => ({
          type,
          count: stats.count,
          totalSize: stats.totalSize,
          percentage: Math.round((stats.count / totalFiles) * 100) || 0,
          sizePercentage: Math.round((stats.totalSize / totalSize) * 100) || 0,
        }))
        .sort((a, b) => b.count - a.count);

      return NextResponse.json(
        {
          fileTypeStats,
          totalFiles,
          totalSize,
        },
        { headers }
      );
    } catch (error: any) {
      console.error("Error fetching file stats:", error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch file statistics" },
        { status: 500 }
      );
    }
  }
);
