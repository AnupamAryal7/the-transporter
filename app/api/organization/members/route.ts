import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID required" },
        { status: 400 }
      );
    }

    // Get organization members
    const { data: members, error } = await supabase
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

    return NextResponse.json({ members });
  } catch (error: any) {
    console.error("Error fetching members:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
