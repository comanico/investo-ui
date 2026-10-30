import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAllowedUser } from "@/lib/access";

export async function gateRequest(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return redirectToConstruction(request);
  }

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isAllowedUser(user?.id)) return response;
  return redirectToConstruction(request, response);
}

function redirectToConstruction(request: NextRequest, cookies?: NextResponse) {
  const url = request.nextUrl.clone();
  url.pathname = "/construction";
  url.search = "";
  const redirect = NextResponse.redirect(url);
  if (cookies) {
    cookies.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  }
  return redirect;
}
