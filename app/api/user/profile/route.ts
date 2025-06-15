import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Use getUser() instead of getSession() for security
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get user profile from user_profiles table
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError);

      // If profile doesn't exist, create it
      if (profileError.code === "PGRST116") {
        // No rows returned
        const { data: newProfile, error: createError } = await supabase
          .from("user_profiles")
          .insert({
            id: user.id,
            email: user.email,
            role: "user",
          })
          .select()
          .single();

        if (createError) {
          console.error("Profile creation error:", createError);
          return NextResponse.json(
            { error: "Failed to create user profile" },
            { status: 500 }
          );
        }

        return NextResponse.json(newProfile);
      }

      return NextResponse.json(
        { error: "Failed to fetch user profile" },
        { status: 500 }
      );
    }

    return NextResponse.json(profile);
  } catch (error: any) {
    console.error("User profile API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
