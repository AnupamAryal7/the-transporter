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

    // Get notices for the organization
    const { data: notices, error } = await supabase
      .from("notices")
      .select(
        `
        *,
        user_profiles (email)
      `
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ notices });
  } catch (error: any) {
    console.error("Error fetching notices:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId, title, content } = await request.json();

    if (!organizationId || !title || !content) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if user is admin of the organization
    const { data: membership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .single();

    if (!membership || membership.role !== "office-admin") {
      return NextResponse.json(
        { error: "Only organization admins can create notices" },
        { status: 403 }
      );
    }

    // Create the notice
    const { data: notice, error } = await supabase
      .from("notices")
      .insert([
        {
          organization_id: organizationId,
          title,
          content,
          created_by: user.id,
        },
      ])
      .select(
        `
        *,
        user_profiles (email)
      `
      )
      .single();

    if (error) throw error;

    return NextResponse.json({ notice });
  } catch (error: any) {
    console.error("Error creating notice:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
