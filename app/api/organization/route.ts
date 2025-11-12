import { NextRequest, NextResponse } from "next/server";
import {
  createOrganization,
  joinOrganization,
  getUserOrganization,
  leaveOrganization,
} from "@/lib/organization-utils";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient(); // Add await here
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organization = await getUserOrganization(user.id);
    return NextResponse.json({ organization });
  } catch (error) {
    console.error("Error fetching organization:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient(); // Add await here
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, name, description, maxMembers, secretKey } =
      await request.json();

    if (action === "create") {
      if (!name || !maxMembers) {
        return NextResponse.json(
          { error: "Name and max members are required" },
          { status: 400 }
        );
      }
      const organization = await createOrganization(
        name,
        description || "",
        maxMembers,
        user.id
      );
      return NextResponse.json({ organization });
    } else if (action === "join") {
      if (!secretKey) {
        return NextResponse.json(
          { error: "Secret key is required" },
          { status: 400 }
        );
      }
      const organization = await joinOrganization(secretKey, user.id);
      return NextResponse.json({ organization });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Organization action error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient(); // Add await here
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await leaveOrganization(user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error leaving organization:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
