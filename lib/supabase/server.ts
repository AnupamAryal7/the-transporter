import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies(); // Await the cookies() call

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          const allCookies = await cookieStore.getAll(); // Await getAll
          return allCookies.map((cookie: { name: string; value: string }) => ({
            name: cookie.name,
            value: cookie.value,
          }));
        },
        async setAll(cookies: { name: string; value: string }[]) {
          for (const cookie of cookies) {
            await cookieStore.set({
              name: cookie.name,
              value: cookie.value,
              path: "/",
            }); // Await set
          }
        },
      },
    }
  );
}
