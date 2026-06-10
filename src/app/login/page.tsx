"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";

const SHELL_LOGIN_URL =
  process.env.NEXT_PUBLIC_SHELL_LOGIN_URL || "https://os.ventogroup.co/login";

function normalizeReturnTo(value: string | null) {
  const v = (value ?? "").trim();
  if (!v) return "";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  if (!v.startsWith("/")) return "";
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${v}`;
}

export default function LoginPage() {
  const searchParams = useSearchParams();

  const loginUrl = useMemo(() => {
    const url = new URL(SHELL_LOGIN_URL);
    const fromQuery = normalizeReturnTo(searchParams.get("returnTo"));
    const fallback =
      typeof window !== "undefined" ? `${window.location.origin}/` : "";
    const returnTo = fromQuery || fallback;
    if (returnTo) {
      url.searchParams.set("returnTo", returnTo);
    }
    return url.toString();
  }, [searchParams]);

  useEffect(() => {
    window.location.replace(loginUrl);
  }, [loginUrl]);

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="ui-panel w-full max-w-md text-center">
        <h1 className="ui-h1">Redirigiendo al inicio de sesion</h1>
        <p className="mt-2 ui-body-muted">
          Si no pasa nada en unos segundos, abre el login manualmente.
        </p>
        <div className="mt-4">
          <a href={loginUrl} className="ui-btn ui-btn--brand">
            Ir a Vento OS
          </a>
        </div>
        <p className="mt-4 ui-caption">
          Si ya iniciaste sesion,{" "}
          <Link href="/" className="text-[var(--ui-brand-600)] hover:underline">
            vuelve al panel
          </Link>
          .
        </p>
      </div>
    </div>
  );
}


