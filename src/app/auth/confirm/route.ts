import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

function redirect(request: NextRequest, invalidLink = false) {
  const destination = new URL("/auth/update-password", request.url);
  if (invalidLink) destination.searchParams.set("error", "invalid_link");

  const response = NextResponse.redirect(destination, 303);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return redirect(request, true);

  const response = redirect(request);
  try {
    const { url, anonKey } = getSupabasePublicConfig();
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      response.headers.set(
        "Location",
        new URL("/auth/update-password?error=invalid_link", request.url).toString(),
      );
    }
  } catch {
    response.headers.set(
      "Location",
      new URL("/auth/update-password?error=invalid_link", request.url).toString(),
    );
  }

  return response;
}
