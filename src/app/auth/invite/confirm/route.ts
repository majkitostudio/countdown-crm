import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

function result(status: number, error?: string) {
  return NextResponse.json(
    error ? { error } : { ok: true },
    { status, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } },
  );
}

export async function POST(request: NextRequest) {
  // A cross-origin form must not be able to replace the browser's session.
  if (request.headers.get("origin") !== request.nextUrl.origin ||
      !request.headers.get("content-type")?.startsWith("application/json")) {
    return result(403, "invalid_request");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return result(400, "invalid_link");
  }
  const token = typeof body === "object" && body !== null && "token_hash" in body
    ? body.token_hash : null;
  if (typeof token !== "string" || token.length === 0 || token.length > 256 ||
      /[^a-f0-9]/i.test(token) ||
      Object.keys(body as object).some((key) => key !== "token_hash")) {
    return result(400, "invalid_link");
  }

  const response = result(200);
  try {
    const { url, anonKey } = getSupabasePublicConfig();
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    const { data, error: userError } = await supabase.auth.getUser();
    if (data.user) return result(409, "already_signed_in");
    // An invalid or absent session is expected; a verified user must never be replaced.
    if (userError && userError.name !== "AuthSessionMissingError") return result(400, "invalid_link");
    const { error } = await supabase.auth.verifyOtp({ token_hash: token, type: "invite" });
    if (error) return result(400, "invalid_link");
    return response;
  } catch {
    return result(400, "invalid_link");
  }
}
