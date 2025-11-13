import { createClient } from "./supabase/server";

/**
 * Check if a user can access an organization file
 */
export async function canAccessOrganizationFile(
  userId: string,
  fileOrganizationId: string
) {
  if (!userId || !fileOrganizationId) return false;

  const supabase = await createClient();

  // Check if user is a member of the file's organization
  const { data: membership, error } = await supabase
    .from("organization_members")
    .select("id")
    .eq("user_id", userId)
    .eq("organization_id", fileOrganizationId)
    .single();

  if (error) {
    console.error("Error checking organization access:", error);
    return false;
  }

  return !!membership;
}

/**
 * Check organization file access by link ID
 */
export async function canAccessOrganizationFileByLinkId(
  userId: string,
  linkId: string
) {
  if (!userId || !linkId) return false;

  const supabase = await createClient();

  // Get the file's organization_id first
  const { data: file, error } = await supabase
    .from("shared_files")
    .select("organization_id")
    .eq("link_id", linkId)
    .single();

  if (error || !file) {
    console.error("Error fetching file:", error);
    return false;
  }

  // If it's not an organization file, allow access (personal file)
  if (!file.organization_id) {
    return true;
  }

  // Check organization membership
  return canAccessOrganizationFile(userId, file.organization_id);
}
