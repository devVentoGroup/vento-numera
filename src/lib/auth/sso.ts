import { headers } from "next/headers";

const SHELL_LOGIN_URL =
  process.env.NEXT_PUBLIC_SHELL_LOGIN_URL ||
  "https://os.ventogroup.co/login";

function normalizeReturnTo(value?: string) {
  const v = (value ?? "").trim();
  if (!v) return "/";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  if (!v.startsWith("/")) return "/";
  return v;
}

export async function buildShellLoginUrl(returnTo?: string) {
  const normalized = normalizeReturnTo(returnTo);
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    const qs = new URLSearchParams();
    qs.set("returnTo", normalized);
    return `${SHELL_LOGIN_URL}?${qs.toString()}`;
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "numera.ventogroup.co";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const absolute = `${proto}://${host}${normalized}`;

  const qs = new URLSearchParams();
  qs.set("returnTo", absolute);
  return `${SHELL_LOGIN_URL}?${qs.toString()}`;
}

