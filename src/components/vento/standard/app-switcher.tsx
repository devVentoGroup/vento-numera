"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type AppStatus = "active" | "soon";
type AppAccess = "enabled" | "disabled" | "soon";

type AppSwitcherItem = {
  id: string;
  name: string;
  description: string;
  href: string;
  logoSrc: string;
  brandColor: string;
  status: AppStatus;
  access: AppAccess;
  group: "Workspace" | "Operacion" | "Proximamente";
};

type SiteOption = {
  id: string;
  name: string | null;
  site_type?: string | null;
};

type AppSwitcherProps = {
  sites?: SiteOption[];
  activeSiteId?: string;
  appSwitcherItems: AppSwitcherItem[];
};

function DotsIcon() {
  return (
    <span className="grid grid-cols-3 gap-0.5">
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} className="h-1.5 w-1.5 rounded-sm bg-[var(--ui-muted)]" />
      ))}
    </span>
  );
}

function AppLogosPreloader({ logoSources }: { logoSources: string[] }) {
  if (!logoSources.length) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed -left-[10000px] top-0 h-px w-px overflow-hidden opacity-0"
    >
      {logoSources.map((logoSrc) => (
        <Image
          key={logoSrc}
          src={logoSrc}
          alt=""
          width={40}
          height={40}
          priority
          unoptimized
          className="h-px w-px"
        />
      ))}
    </div>
  );
}

function StatusPill({ access }: { access: AppAccess }) {
  const label =
    access === "enabled"
      ? "Activo"
      : access === "disabled"
        ? "Sin acceso"
        : "Proximamente";

  const cls =
    access === "enabled"
      ? "ui-app-status ui-app-status--active"
      : "ui-app-status ui-app-status--soon";

  return <span className={cls}>{label}</span>;
}

function AppTile({
  app,
  onNavigate,
}: {
  app: AppSwitcherItem;
  onNavigate: () => void;
}) {
  const isEnabled = app.access === "enabled";
  const isHub = app.id === "hub";
  const [logoError, setLogoError] = useState(false);
  const fallback = app.name.slice(0, 1);

  const iconWrapStyle = isHub
    ? { width: 92, height: 50, maxWidth: "100%" }
    : undefined;

  const logoWidth = isHub ? 84 : 40;
  const logoHeight = isHub ? 44 : 40;

  const logoClassName =
    app.access === "enabled"
      ? "ui-app-icon"
      : "ui-app-icon opacity-35 grayscale";

  const fallbackClassName =
    app.access === "enabled"
      ? "ui-app-icon-fallback"
      : "ui-app-icon-fallback opacity-35 grayscale";

  const logoNode = logoError ? (
    <div
      className={fallbackClassName}
      style={isHub ? { width: logoWidth, height: logoHeight } : undefined}
    >
      {fallback}
    </div>
  ) : (
    <Image
      src={app.logoSrc}
      alt={`Logo ${app.name}`}
      className={logoClassName}
      width={logoWidth}
      height={logoHeight}
      unoptimized
      style={isHub ? { width: logoWidth, height: logoHeight, objectFit: "contain" } : undefined}
      onError={() => setLogoError(true)}
    />
  );

  if (!isEnabled) {
    return (
      <div
        className="ui-app-glyph ui-app-glyph--soon cursor-not-allowed"
        aria-disabled="true"
        title={
          app.access === "disabled"
            ? "Tu rol no tiene acceso a esta aplicacion."
            : app.description
        }
      >
        <div className="ui-app-glyph-icon-wrap" style={iconWrapStyle}>{logoNode}</div>
        <div className="ui-app-glyph-name">{app.name}</div>

        <div className="mt-1">
          <StatusPill access={app.access} />
        </div>
      </div>
    );
  }

  return (
    <a
      href={app.href}
      onClick={onNavigate}
      className="ui-app-glyph ui-app-glyph--active"
    >
      <div className="ui-app-glyph-icon-wrap" style={iconWrapStyle}>{logoNode}</div>
      <div className="ui-app-glyph-name">{app.name}</div>

      <div className="mt-1">
        <StatusPill access={app.access} />
      </div>
    </a>
  );
}

export function AppSwitcher({ appSwitcherItems }: AppSwitcherProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const apps = appSwitcherItems ?? [];
  const logoSources = Array.from(
    new Set(
      apps
        .map((app) => String(app.logoSrc ?? "").trim())
        .filter((logoSrc) => logoSrc.length > 0)
    )
  );

  const workspace = apps.filter((app) => app.group === "Workspace");
  const operacion = apps.filter((app) => app.group === "Operacion");
  const proximamente = apps.filter((app) => app.group === "Proximamente");

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!open) return;

      const target = event.target as Node;

      if (rootRef.current && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocClick);

    return () => {
      document.removeEventListener("mousedown", onDocClick);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <AppLogosPreloader logoSources={logoSources} />

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-12 items-center gap-2 rounded-xl bg-[var(--ui-surface)] px-4 text-base font-semibold text-[var(--ui-text)] ring-1 ring-inset ring-[var(--ui-border)] hover:bg-[var(--ui-surface-2)]"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Abrir launcher de apps"
      >
        <DotsIcon />
        Apps
      </button>

      {open ? (
        <div className="ui-app-launcher absolute right-0 z-50 mt-2 w-[min(92vw,380px)] animate-[launcherIn_160ms_ease-out] rounded-2xl">
          <div className="ui-app-launcher-header">
            <div>
              <div className="text-sm font-semibold text-[var(--ui-text)]">
                Apps del ecosistema
              </div>

              <div className="text-xs text-[var(--ui-muted)]">
                Accede rapido a cada modulo del ecosistema.
              </div>
            </div>
          </div>

          <div className="ui-app-launcher-scroll ui-scrollbar-subtle max-h-[min(74vh,560px)] space-y-5 overflow-y-auto p-4">
            {workspace.length > 0 ? (
              <section>
                <div className="mb-2 text-xs font-semibold tracking-wide text-[var(--ui-muted)]">
                  WORKSPACE
                </div>

                <div className="ui-app-launcher-grid">
                  {workspace.map((app) => (
                    <AppTile
                      key={app.id}
                      app={app}
                      onNavigate={() => setOpen(false)}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {operacion.length > 0 ? (
              <section>
                <div className="mb-2 text-xs font-semibold tracking-wide text-[var(--ui-muted)]">
                  OPERACION
                </div>

                <div className="ui-app-launcher-grid">
                  {operacion.map((app) => (
                    <AppTile
                      key={app.id}
                      app={app}
                      onNavigate={() => setOpen(false)}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {proximamente.length > 0 ? (
              <section>
                <div className="mb-2 text-xs font-semibold tracking-wide text-[var(--ui-muted)]">
                  PROXIMAMENTE
                </div>

                <div className="ui-app-launcher-grid">
                  {proximamente.map((app) => (
                    <AppTile
                      key={app.id}
                      app={app}
                      onNavigate={() => setOpen(false)}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {!workspace.length && !operacion.length && !proximamente.length ? (
              <div className="ui-empty">No hay apps disponibles.</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

