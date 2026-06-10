import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const DEBUG_AUTH = process.env.NEXT_PUBLIC_DEBUG_AUTH === "1";
const COOKIE_DOMAIN = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || process.env.COOKIE_DOMAIN;

function buildLoginRedirect(request: NextRequest) {
  const target = new URL("/login", request.url);
  target.searchParams.set("returnTo", request.url);
  return NextResponse.redirect(target);
}

function withCookieDomain(options?: Record<string, unknown>) {
  if (!COOKIE_DOMAIN) return options;
  return { ...(options ?? {}), domain: COOKIE_DOMAIN };
}

function hasSupabaseCookies(request: NextRequest) {
  return request.cookies.getAll().some((cookie) => cookie.name.startsWith("sb-"));
}

function clearSupabaseCookies(request: NextRequest, response: NextResponse) {
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith("sb-")) {
      response.cookies.set(cookie.name, "", withCookieDomain({ path: "/", maxAge: 0 }));
    }
  }
}

function withDebugHeaders(response: NextResponse, request: NextRequest, status: string) {
  if (!DEBUG_AUTH) return response;

  const cookieNames = request.cookies.getAll().map((cookie) => cookie.name).join(",");
  response.headers.set("x-vento-auth-debug", "1");
  response.headers.set("x-vento-auth-status", status);
  response.headers.set("x-vento-host", request.headers.get("host") ?? "");
  response.headers.set("x-vento-path", request.nextUrl.pathname);
  response.headers.set("x-vento-cookie-count", String(request.cookies.getAll().length));
  response.headers.set("x-vento-cookie-names", cookieNames.slice(0, 512));
  return response;
}

export const config = {
  matcher: ["/((?!_next|login|no-access|favicon.ico|logos|images|fonts|api).*)"],
};

export async function middleware(request: NextRequest) {
  if (!hasSupabaseCookies(request)) {
    return withDebugHeaders(buildLoginRedirect(request), request, "no-cookies");
  }

  const response = NextResponse.next();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";

  if (!url || !key) {
    return withDebugHeaders(buildLoginRedirect(request), request, "no-config");
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, withCookieDomain(options));
        });
      },
    },
  });

  let data: { user: unknown | null } | null = null;
  try {
    const result = await supabase.auth.getUser();
    data = result.data;
  } catch {
    const redirect = buildLoginRedirect(request);
    clearSupabaseCookies(request, redirect);
    return withDebugHeaders(redirect, request, "auth-error");
  }

  if (!data.user) {
    const redirect = buildLoginRedirect(request);
    clearSupabaseCookies(request, redirect);
    return withDebugHeaders(redirect, request, "no-user");
  }

  return withDebugHeaders(response, request, "ok");
}
