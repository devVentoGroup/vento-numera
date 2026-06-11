"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { AppSwitcher } from "./app-switcher";
import { ProfileMenu } from "./profile-menu";
import { VentoLogo } from "./vento-logo";

type SiteOption = {
  id: string;
  name: string | null;
  site_type?: string | null;
};

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

type IconName =
  | "dashboard"
  | "accounting"
  | "users"
  | "calendar"
  | "store"
  | "sparkles"
  | "package"
  | "menu"
  | "fileText"
  | "briefcase"
  | "phone"
  | "book"
  | "flask";

type NavItem = {
  href: string;
  label: string;
  description?: string;
  icon?: IconName;
  permissionCode: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

type VentoChromeProps = {
  children: React.ReactNode;
  displayName: string;
  role?: string | null;
  email?: string | null;
  sites: SiteOption[];
  activeSiteId: string;
  appSwitcherItems: AppSwitcherItem[];
  navGroups: NavGroup[];
};

const APP_ENTITY =
  (process.env.NEXT_PUBLIC_VENTO_ENTITY?.toLowerCase() as
    | "default"
    | "nexo"
    | "fogo"
    | "pulso"
    | "viso"
    | "origo"
    | "numera"
    | "anima"
    | "aura") ?? "numera";

const APP_NAME = process.env.NEXT_PUBLIC_VENTO_APP_NAME ?? "NUMERA";

const APP_TAGLINE =
  process.env.NEXT_PUBLIC_VENTO_APP_TAGLINE ?? "Economia y rentabilidad";

function Icon({ name }: { name?: IconName }) {
  const common = "none";

  switch (name) {
    case "dashboard":
      return (
        <svg viewBox="0 0 24 24" fill={common} stroke="currentColor" strokeWidth="1.6">
          <path d="M4 4h7v7H4z" />
          <path d="M13 4h7v5h-7z" />
          <path d="M13 11h7v9h-7z" />
          <path d="M4 13h7v7H4z" />
        </svg>
      );

    case "accounting":
      return (
        <svg viewBox="0 0 24 24" fill={common} stroke="currentColor" strokeWidth="1.6">
          <path d="M4 7h16" />
          <path d="M6 7v13" />
          <path d="M18 7v13" />
          <path d="M4 20h16" />
          <path d="M8 11h2" />
          <path d="M8 15h2" />
          <path d="M14 11h2" />
          <path d="M14 15h2" />
          <path d="M8 4h8" />
        </svg>
      );

    case "users":
      return (
        <svg viewBox="0 0 24 24" fill={common} stroke="currentColor" strokeWidth="1.6">
          <path d="M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4z" />
          <path d="M4 18c0-3 3-5 6-5" />
          <path d="M20 18c0-3-3-5-6-5" />
          <circle cx="8" cy="9" r="3" />
        </svg>
      );

    case "calendar":
      return (
        <svg viewBox="0 0 24 24" fill={common} stroke="currentColor" strokeWidth="1.6">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4" />
          <path d="M8 3v4" />
          <path d="M3 10h18" />
          <path d="M8 14h.01" />
          <path d="M12 14h.01" />
          <path d="M16 14h.01" />
          <path d="M8 18h.01" />
          <path d="M12 18h.01" />
        </svg>
      );

    case "store":
      return (
        <svg viewBox="0 0 24 24" fill={common} stroke="currentColor" strokeWidth="1.6">
          <path d="M3 9h18l-2-5H5z" />
          <path d="M5 9v10h14V9" />
          <path d="M9 19v-6h6v6" />
        </svg>
      );

    case "sparkles":
      return (
        <svg viewBox="0 0 24 24" fill={common} stroke="currentColor" strokeWidth="1.6">
          <path d="M12 3l1.5 3.5L17 8l-3.5 1.5L12 13l-1.5-3.5L7 8l3.5-1.5L12 3z" />
          <path d="M5 16l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" />
          <path d="M18 14l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" />
        </svg>
      );

    case "package":
      return (
        <svg viewBox="0 0 24 24" fill={common} stroke="currentColor" strokeWidth="1.6">
          <path d="M3 8.5L12 4l9 4.5v7L12 20l-9-4.5z" />
          <path d="M12 20v-8" />
          <path d="M3 8.5l9 4.5 9-4.5" />
        </svg>
      );

    case "menu":
      return (
        <svg viewBox="0 0 24 24" fill={common} stroke="currentColor" strokeWidth="1.6">
          <path d="M4 7h16" />
          <path d="M7 12h13" />
          <path d="M10 17h10" />
          <path d="M4 17h2" />
          <path d="M4 12h2" />
          <path d="M4 7h2" />
        </svg>
      );

    case "fileText":
      return (
        <svg viewBox="0 0 24 24" fill={common} stroke="currentColor" strokeWidth="1.6">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M16 13H8" />
          <path d="M16 17H8" />
          <path d="M10 9H8" />
        </svg>
      );

    case "briefcase":
      return (
        <svg viewBox="0 0 24 24" fill={common} stroke="currentColor" strokeWidth="1.6">
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          <rect x="3" y="6" width="18" height="14" rx="2" />
          <path d="M3 11h18" />
        </svg>
      );

    case "phone":
      return (
        <svg viewBox="0 0 24 24" fill={common} stroke="currentColor" strokeWidth="1.6">
          <rect x="7" y="2.5" width="10" height="19" rx="2" />
          <path d="M11 18.5h2" />
          <path d="M10 5.5h4" />
        </svg>
      );

    case "book":
      return (
        <svg viewBox="0 0 24 24" fill={common} stroke="currentColor" strokeWidth="1.6">
          <path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z" />
          <path d="M6 3v16" />
          <path d="M10 7h6" />
          <path d="M10 11h6" />
        </svg>
      );

    case "flask":
      return (
        <svg viewBox="0 0 24 24" fill={common} stroke="currentColor" strokeWidth="1.6">
          <path d="M10 2v5l-5.5 9.5A3 3 0 0 0 7.1 21h9.8a3 3 0 0 0 2.6-4.5L14 7V2" />
          <path d="M9 11h6" />
        </svg>
      );

    default:
      return null;
  }
}

function SidebarToggleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M9 5v14" />
    </svg>
  );
}

function SidebarLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={`ui-sidebar-item ${active ? "active" : ""} ${
        collapsed
          ? "lg:h-10 lg:w-10 lg:items-center lg:justify-center lg:gap-0 lg:overflow-hidden lg:p-0"
          : ""
      }`}
    >
      <span className="ui-sidebar-item-icon">
        <Icon name={item.icon} />
      </span>

      <span className={`ui-sidebar-item-content ${collapsed ? "lg:!hidden" : ""}`}>
        <span className="ui-sidebar-item-title">{item.label}</span>

        {item.description ? (
          <span className="ui-sidebar-item-desc">{item.description}</span>
        ) : null}
      </span>
    </Link>
  );
}

export function VentoChrome({
  children,
  displayName,
  role,
  email,
  sites,
  activeSiteId,
  appSwitcherItems,
  navGroups,
}: VentoChromeProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;

    try {
      return window.localStorage.getItem("vento:sidebar-collapsed") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem("vento:sidebar-collapsed", sidebarCollapsed ? "1" : "0");
    } catch {
      // Persistence is optional.
    }
  }, [sidebarCollapsed]);

  const currentSiteId = activeSiteId ?? "";
  const currentSite = sites.find((site) => site.id === currentSiteId);
  const currentSiteLabel = currentSite?.name ?? currentSiteId ?? "Sin sede";

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="min-h-screen bg-[var(--ui-bg)] text-[var(--ui-text)]">
      <div className="flex min-h-screen">
        <div
          className={`fixed inset-0 z-40 bg-black/30 transition lg:hidden ${
            menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />

        <aside
          className={`ui-sidebar fixed left-0 top-0 z-50 flex h-full w-72 flex-col gap-4 overflow-hidden px-4 py-5 transition-[width,padding,transform] duration-200 ease-out lg:static lg:translate-x-0 lg:shadow-none ${
            menuOpen ? "translate-x-0" : "-translate-x-full"
          } ${
            sidebarCollapsed
              ? "lg:w-16 lg:items-center lg:px-2"
              : "lg:w-72 lg:items-stretch lg:px-4"
          }`}
        >
          <div className={`flex items-center ${sidebarCollapsed ? "lg:justify-center" : "justify-between"}`}>
            <div className={sidebarCollapsed ? "lg:hidden" : ""}>
              <VentoLogo
                entity={APP_ENTITY}
                title="Vento OS"
                subtitle={APP_TAGLINE}
              />
            </div>

            <button
              type="button"
              onClick={() => setSidebarCollapsed((value) => !value)}
              className={`hidden h-10 w-10 items-center justify-center text-[var(--ui-muted)] transition hover:bg-[var(--ui-surface-2)] hover:text-[var(--ui-text)] lg:inline-flex ${
                sidebarCollapsed ? "group rounded-xl" : ""
              }`}
              aria-label={sidebarCollapsed ? "Expandir menu lateral" : "Contraer menu lateral"}
              title={sidebarCollapsed ? "Expandir menu" : "Contraer menu"}
            >
              {sidebarCollapsed ? (
                <>
                  <span className="block group-hover:hidden">
                    <VentoLogo entity={APP_ENTITY} showText={false} />
                  </span>

                  <span className="hidden group-hover:block">
                    <SidebarToggleIcon />
                  </span>
                </>
              ) : (
                <SidebarToggleIcon />
              )}
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="h-10 rounded-lg px-3 text-sm font-semibold text-[var(--ui-muted)] hover:bg-[var(--ui-surface-2)] lg:hidden"
            >
              Cerrar
            </button>
          </div>

          <div className={`rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] px-4 py-3 shadow-[var(--ui-shadow-soft)] ${sidebarCollapsed ? "lg:!hidden" : ""}`}>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ui-muted)]">
              Sede activa
            </div>

            <div className="mt-1 text-sm font-semibold text-[var(--ui-text)]">
              {currentSiteLabel}
            </div>
          </div>

          <nav className={`flex flex-1 flex-col gap-4 overflow-y-auto pr-1 ${sidebarCollapsed ? "lg:items-center lg:pr-0" : ""}`}>
            {navGroups.length === 0 ? (
              <div className={`px-2 text-sm text-[var(--ui-muted)] ${sidebarCollapsed ? "lg:!hidden" : ""}`}>
                No hay pantallas disponibles.
              </div>
            ) : null}

            {navGroups.map((group) => (
              <div key={group.label} className="space-y-2">
                <div className={`px-2 text-xs font-semibold uppercase tracking-wide text-[var(--ui-muted)] ${sidebarCollapsed ? "lg:!hidden" : ""}`}>
                  {group.label}
                </div>

                <div className="space-y-1">
                  {group.items.map((item) => (
                    <SidebarLink
                      key={item.href}
                      item={item}
                      active={isActive(item.href)}
                      collapsed={sidebarCollapsed}
                      onNavigate={() => setMenuOpen(false)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="ui-header sticky top-0 z-30">
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-6 sm:py-5">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setMenuOpen(true)}
                  className="inline-flex h-10 items-center rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] px-3 text-sm font-semibold text-[var(--ui-text)] hover:bg-[var(--ui-surface-2)] sm:h-12 sm:px-4 sm:text-base lg:hidden"
                >
                  Menu
                </button>

                <div className="hidden items-center gap-3 sm:flex">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--ui-surface-2)] ring-1 ring-inset ring-[var(--ui-border)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/logos/${APP_ENTITY}.svg`} alt={APP_NAME} className="h-6 w-6" />
                  </div>

                  <div className="flex flex-col leading-tight">
                    <span className="text-sm font-semibold text-[var(--ui-text)]">
                      {APP_NAME}
                    </span>

                    <span className="text-xs text-[var(--ui-muted)]">
                      {APP_TAGLINE}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <AppSwitcher
                  sites={sites}
                  activeSiteId={currentSiteId}
                  appSwitcherItems={appSwitcherItems}
                />

                <ProfileMenu
                  name={displayName}
                  role={role ?? undefined}
                  email={email}
                  sites={sites}
                  activeSiteId={currentSiteId}
                />
              </div>
            </div>
          </header>

          <main className="ui-main min-w-0 flex-1 px-6 py-8 sm:px-8 sm:py-10">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
