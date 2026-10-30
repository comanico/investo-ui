import { NextResponse, type NextRequest } from "next/server";
import { gateRequest } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/construction" || pathname.startsWith("/construction/")) {
    return NextResponse.next();
  }
  return gateRequest(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.svg|og.jpg).*)"],
};
