import { useQuery } from "@tanstack/react-query";
import { createBrowserClient } from "@supabase/ssr";
import { useOrganization } from "./use-organization";

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
