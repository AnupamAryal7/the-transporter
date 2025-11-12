import { createClient } from "./supabase/server";

/**
 * Check if a user can access a specific file
 */
export async function canAccessFile(userId: string, fileId: string) {
  const supabase = await createClient();

  // Get the file and its organization
  const { data: file, error } = await supabase
    .from("shared_files")
    .select("organization_id, user_id")
    .eq("id", fileId)
    .single();

  if (error) {
    console.error("Error fetching file:", error);
    return false;
  }

  // If user owns the file, always allow access
  if (file.user_id === userId) {
    return true;
  }

  // If file doesn't belong to any organization, deny access (only owner can access personal files)
  if (!file.organization_id) {
    return false;
  }

  // Check if user is member of the file's organization
  const { data: membership } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", file.organization_id)
    .eq("user_id", userId)
    .single();

  return !!membership;
}

/**
 * Check if user can access a file by link ID
 */
export async function canAccessFileByLinkId(userId: string, linkId: string) {
  const supabase = await createClient();

  // Get the file and its organization
  const { data: file, error } = await supabase
    .from("shared_files")
    .select("organization_id, user_id")
    .eq("link_id", linkId)
    .single();

  if (error) {
    console.error("Error fetching file:", error);
    return false;
  }

  // If user owns the file, always allow access
  if (file.user_id === userId) {
    return true;
  }

  // If file doesn't belong to any organization, deny access
  if (!file.organization_id) {
    return false;
  }

  // Check if user is member of the file's organization
  const { data: membership } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", file.organization_id)
    .eq("user_id", userId)
    .single();

  return !!membership;
}

/**
 * Get file information with access check
 */
export async function getFileWithAccessCheck(userId: string, linkId: string) {
  const supabase = await createClient();

  const { data: file, error } = await supabase
    .from("shared_files")
    .select("*")
    .eq("link_id", linkId)
    .single();

  if (error) {
    return { file: null, error: "File not found" };
  }

  // Check access
  const canAccess = await canAccessFileByLinkId(userId, linkId);
  if (!canAccess) {
    return { file: null, error: "Access denied" };
  }

  return { file, error: null };
}
