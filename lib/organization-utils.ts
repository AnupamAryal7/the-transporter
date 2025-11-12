import { createClient } from "./supabase/server";

export interface Organization {
  id: string;
  name: string;
  description?: string;
  secret_key: string;
  max_members: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: "office-admin" | "office-member";
  joined_at: string;
  user_profiles?: {
    email: string;
  };
}

export interface Notice {
  id: string;
  organization_id: string;
  title: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  user_profiles?: {
    email: string;
  };
}

// Generate 6-digit alphanumeric secret key
function generateSecretKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Create a new organization
export async function createOrganization(
  name: string,
  description: string,
  maxMembers: number,
  userId: string
) {
  const supabase = await createClient();

  const secretKey = generateSecretKey();

  const { data, error } = await supabase
    .from("organizations")
    .insert([
      {
        name,
        description,
        secret_key: secretKey,
        max_members: maxMembers,
        created_by: userId,
      },
    ])
    .select()
    .single();

  if (error) throw error;

  // Add creator as office-admin
  const { error: memberError } = await supabase
    .from("organization_members")
    .insert([
      {
        organization_id: data.id,
        user_id: userId,
        role: "office-admin",
      },
    ]);

  if (memberError) throw memberError;

  return data;
}

// Join an existing organization
export async function joinOrganization(secretKey: string, userId: string) {
  const supabase = await createClient();

  // Get organization by secret key
  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .select("*")
    .eq("secret_key", secretKey)
    .single();

  if (orgError) throw new Error("Invalid organization code");

  // Check if user is already in an organization
  const { data: existingMembership } = await supabase
    .from("organization_members")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (existingMembership) {
    throw new Error("You are already a member of an organization");
  }

  // Check member limit
  const { data: members, error: countError } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", organization.id);

  if (countError) throw countError;

  if (members.length >= organization.max_members) {
    throw new Error("Organization member limit reached");
  }

  // Add user as member
  const { error: joinError } = await supabase
    .from("organization_members")
    .insert([
      {
        organization_id: organization.id,
        user_id: userId,
        role: "office-member",
      },
    ]);

  if (joinError) throw joinError;

  return organization;
}

// Get user's current organization
export async function getUserOrganization(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organization_members")
    .select(
      `
      organization_id,
      role,
      organizations (*)
    `
    )
    .eq("user_id", userId)
    .single();

  if (error) return null;

  return {
    ...data.organizations,
    userRole: data.role,
  };
}

// Leave organization
export async function leaveOrganization(userId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("user_id", userId);

  if (error) throw error;
}

// Get organization members
export async function getOrganizationMembers(organizationId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organization_members")
    .select(
      `
      *,
      user_profiles (email)
    `
    )
    .eq("organization_id", organizationId)
    .order("joined_at", { ascending: true });

  if (error) throw error;
  return data;
}

// Get member count for an organization
export async function getOrganizationMemberCount(organizationId: string) {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("organization_members")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  if (error) throw error;
  return count || 0;
}

// Check if user can access organization file
export async function canAccessOrganizationFile(
  userId: string,
  fileOrganizationId: string | null
) {
  if (!fileOrganizationId) return true; // Personal file - use existing logic

  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", fileOrganizationId)
    .eq("user_id", userId)
    .single();

  return !!membership;
}

// Get user's organization ID
export async function getUserOrganizationId(userId: string) {
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .single();

  return membership?.organization_id || null;
}
