import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

interface Organization {
  id: string;
  name: string;
  description?: string;
  secret_key: string;
  max_members: number;
  created_by: string;
  userRole: "office-admin" | "office-member";
}

interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: "office-admin" | "office-member";
  joined_at: string;
  user_profiles?: {
    email: string;
  };
}

interface Notice {
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

export interface OrganizationFile {
  id: string;
  user_id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  link_id: string;
  expires_at: string;
  max_views: number;
  views: number;
  created_at: string;
  organization_id: string;
}

// Get user's organization
export function useOrganization() {
  return useQuery({
    queryKey: ["organization"],
    queryFn: async (): Promise<Organization | null> => {
      const response = await fetch("/api/organization");
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error("Failed to fetch organization");
      }
      const data = await response.json();
      return data.organization;
    },
  });
}

// Create organization mutation
export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      description,
      maxMembers,
    }: {
      name: string;
      description: string;
      maxMembers: number;
    }) => {
      const response = await fetch("/api/organization", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "create",
          name,
          description,
          maxMembers,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create organization");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization"] });
    },
  });
}

// Join organization mutation
export function useJoinOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ secretKey }: { secretKey: string }) => {
      const response = await fetch("/api/organization", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "join",
          secretKey,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to join organization");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization"] });
    },
  });
}

// Leave organization mutation
export function useLeaveOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/organization", {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to leave organization");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization"] });
    },
  });
}

// Get organization members
export function useOrganizationMembers(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["organization-members", organizationId],
    queryFn: async (): Promise<OrganizationMember[]> => {
      if (!organizationId) return [];

      const response = await fetch(
        `/api/organization/members?organizationId=${organizationId}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch organization members");
      }
      const data = await response.json();
      return data.members || [];
    },
    enabled: !!organizationId,
  });
}

// Get organization notices
export function useNotices(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["notices", organizationId],
    queryFn: async (): Promise<Notice[]> => {
      if (!organizationId) return [];

      const response = await fetch(
        `/api/organization/notices?organizationId=${organizationId}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch notices");
      }
      const data = await response.json();
      return data.notices || [];
    },
    enabled: !!organizationId,
  });
}

// Get organization files
export function useOrganizationFiles() {
  const { data: organization } = useOrganization();

  return useQuery<OrganizationFile[]>({
    queryKey: ["organization-files", organization?.id],
    queryFn: async (): Promise<OrganizationFile[]> => {
      if (!organization?.id) return [];

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: files, error } = await supabase
        .from("shared_files")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return files || [];
    },
    enabled: !!organization?.id,
  });
}

// Create notice mutation
export function useCreateNotice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      title,
      content,
    }: {
      organizationId: string;
      title: string;
      content: string;
    }) => {
      const response = await fetch("/api/organization/notices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId,
          title,
          content,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create notice");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["notices", variables.organizationId],
      });
    },
  });
}

// Hook for organization modals state
export function useOrganizationModals() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  return {
    showCreateModal,
    setShowCreateModal,
    showJoinModal,
    setShowJoinModal,
  };
}
