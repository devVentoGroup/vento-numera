"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  PRIVILEGED_ROLE_OVERRIDES,
  ROLE_OPTIONS,
  ROLE_OVERRIDE_COOKIE,
} from "@/lib/auth/role-override-config";

type ProfileMenuProps = {
  name?: string;
  role?: string;
  email?: string | null;
  sites?: Array<{ id: string; name: string | null }>;
  activeSiteId?: string;
};

const SITE_OVERRIDE_COOKIE = "numera_site_override_id";

function initialsFrom(value?: string) {
  const text = (value ?? "").trim();
  if (!text) return "VG";
  const parts = text.split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");
  return letters.join("") || "VG";
}

export function ProfileMenu({ name, role, email, sites, activeSiteId: baseActiveSiteId }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isRefreshingApp, setIsRefreshingApp] = useState(false);
  const [overrideRole, setOverrideRole] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initials = useMemo(() => initialsFrom(name || email || "Vento"), [name, email]);
  const displayName = name || "Usuario";
  const shellLoginUrl =
    process.env.NEXT_PUBLIC_SHELL_LOGIN_URL || "https://os.ventogroup.co/login";
  const canSwitchRole = role ? PRIVILEGED_ROLE_OVERRIDES.has(role) : false;
  const roleLabelMap = useMemo(
    () => new Map(ROLE_OPTIONS.map((item) => [item.value, item.label])),
    []
  );
  const activeSiteId = searchParams.get("site_id") ?? baseActiveSiteId ?? "";

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      const supabase = createClient();
      await supabase.auth.signOut();
    } finally {
      const returnTo = encodeURIComponent(window.location.origin);
      window.location.href = `${shellLoginUrl}?returnTo=${returnTo}`;
    }
  };

  const setCookieValue = (value: string | null) => {
    if (typeof document === "undefined") return;
    if (!value) {
      document.cookie = `${ROLE_OVERRIDE_COOKIE}=; path=/; max-age=0`;
      return;
    }
    const maxAge = 60 * 60 * 24 * 30;
    document.cookie = `${ROLE_OVERRIDE_COOKIE}=${value}; path=/; max-age=${maxAge}`;
  };

  const setSiteCookieValue = (value: string | null) => {
    if (typeof document === "undefined") return;
    if (!value) {
      document.cookie = `${SITE_OVERRIDE_COOKIE}=; path=/; max-age=0`;
      return;
    }
    const maxAge = 60 * 60 * 24 * 30;
    document.cookie = `${SITE_OVERRIDE_COOKIE}=${value}; path=/; max-age=${maxAge}`;
  };

  const handleRoleOverride = (value: string | null) => {
    setOverrideRole(value);
    setCookieValue(value);
    router.refresh();
  };

  const handleSiteChange = async (nextSiteId: string) => {
    setSiteCookieValue(nextSiteId || null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase.from("employee_settings").upsert(
        {
          employee_id: user.id,
          selected_site_id: nextSiteId || null,
        },
        { onConflict: "employee_id" }
      );
    }

    const params = new URLSearchParams(searchParams.toString());
    if (nextSiteId) {
      params.set("site_id", nextSiteId);
    } else {
      params.delete("site_id");
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    setOpen(false);
  };

  const handleRefreshApp = async () => {
    if (typeof window === "undefined") return;
    try {
      setIsRefreshingApp(true);
      try {
        window.localStorage.clear();
      } catch {
        // ignore storage errors
      }
      try {
        window.sessionStorage.clear();
      } catch {
        // ignore storage errors
      }
      try {
        if ("caches" in window) {
          const cacheKeys = await window.caches.keys();
          await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
        }
      } catch {
        // ignore cache API errors
      }
      try {
        if ("indexedDB" in window && "databases" in indexedDB) {
          const dbs = await (indexedDB as IDBFactory & { databases?: () => Promise<Array<{ name?: string }>> })
            .databases?.();
          await Promise.all(
            (dbs ?? [])
              .map((db) => db?.name)
              .filter((name): name is string => Boolean(name))
              .map(
                (name) =>
                  new Promise<void>((resolve) => {
                    const req = indexedDB.deleteDatabase(name);
                    req.onsuccess = () => resolve();
                    req.onerror = () => resolve();
                    req.onblocked = () => resolve();
                  })
              )
          );
        }
      } catch {
        // ignore indexedDB errors
      }
    } finally {
      window.location.reload();
    }
  };

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!open) return;
      const t = e.target as Node;
      if (rootRef.current && !rootRef.current.contains(t)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const entry = document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith(`${ROLE_OVERRIDE_COOKIE}=`));
    if (entry) {
      const value = entry.split("=")[1] ?? "";
      setOverrideRole(value || null);
    }
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-xl bg-[var(--ui-surface)] h-12 px-4 text-base font-semibold text-[var(--ui-text)] ring-1 ring-inset ring-[var(--ui-border)] hover:bg-[var(--ui-surface-2)]"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ui-brand)] text-sm font-semibold text-[var(--ui-on-primary)]">
          {initials}
        </span>
        <span className="hidden sm:inline">Perfil</span>
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] backdrop-blur-xl p-4 shadow-[var(--ui-shadow-2)]">
          <div className="text-sm font-semibold text-[var(--ui-text)]">{displayName}</div>
          {role ? (
            <div className="mt-1 text-xs text-[var(--ui-muted)]">
              Rol: {roleLabelMap.get(role) ?? role}
            </div>
          ) : null}
          {email ? <div className="mt-2 text-xs text-[var(--ui-muted)]">Email: {email}</div> : null}
          <div className="mt-3 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-2)] px-3 py-2 text-xs text-[var(--ui-muted)]">
            Sesion activa en NUMERA.
          </div>
          {canSwitchRole ? (
            <div className="mt-3 space-y-3 rounded-xl border border-[var(--ui-brand-600)] bg-[var(--ui-brand-soft)] px-3 py-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--ui-brand-600)]">
                Modo prueba
              </div>
              <div className="text-xs text-[var(--ui-text)]">
                Rol activo:{" "}
                <span className="font-semibold">
                  {overrideRole ? roleLabelMap.get(overrideRole) ?? overrideRole : "Real"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {ROLE_OPTIONS.map((option) => {
                  const isActive = overrideRole === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleRoleOverride(option.value)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        isActive
                          ? "bg-[var(--ui-brand)] text-[var(--ui-on-primary)]"
                          : "bg-[var(--ui-surface)] text-[var(--ui-brand-600)] ring-1 ring-inset ring-[var(--ui-brand-600)]"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => handleRoleOverride(null)}
                className="text-xs font-semibold text-[var(--ui-brand-600)] hover:text-[var(--ui-brand-700)]"
              >
                Usar rol real
              </button>
            </div>
          ) : null}
          {canSwitchRole && sites?.length ? (
            <div className="mt-3 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--ui-muted)]">
                Sede activa
              </div>
              <select
                className="h-12 w-full rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] px-3 text-base"
                value={activeSiteId}
                onChange={(e) => handleSiteChange(e.target.value)}
              >
                <option value="">Sin sede</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name ?? site.id}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <button
            type="button"
            onClick={handleRefreshApp}
            disabled={isRefreshingApp || isSigningOut}
            className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-2)] px-3 text-base font-semibold text-[var(--ui-text)] hover:bg-[var(--ui-surface)] disabled:opacity-60"
          >
            {isRefreshingApp ? "Actualizando..." : "Actualizar app (sin cerrar sesion)"}
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-xl bg-[var(--ui-primary)] px-3 text-base font-semibold text-[var(--ui-on-primary)] hover:bg-[var(--ui-primary-hover)] disabled:opacity-60"
          >
            {isSigningOut ? "Cerrando..." : "Cerrar sesion"}
          </button>
        </div>
      ) : null}
    </div>
  );
}




