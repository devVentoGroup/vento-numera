import { cookies } from "next/headers";

import { checkPermissionWithRoleOverride } from "@/lib/auth/role-override";
import { createClient } from "@/lib/supabase/server";
import { VentoChrome } from "./vento-chrome";

type SiteRow = {
  id: string;
  name: string | null;
  site_type: string | null;
};

type EmployeeSiteRow = {
  site_id: string | null;
  is_primary: boolean | null;
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

type NavigationRow = {
  group_label: string | null;
  group_order: number | null;
  label: string | null;
  description: string | null;
  href: string | null;
  icon: string | null;
  required_permission_code: string | null;
  sort_order: number | null;
};

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

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

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

const APP_CODE = APP_ENTITY === "default" ? "numera" : APP_ENTITY;

const ICON_NAMES = new Set<IconName>([
  "dashboard",
  "accounting",
  "users",
  "calendar",
  "store",
  "sparkles",
  "package",
  "menu",
  "fileText",
  "briefcase",
  "phone",
  "book",
  "flask",
]);

const APP_SWITCHER_ITEMS: Omit<AppSwitcherItem, "access">[] = [
  {
    id: "hub",
    name: "Hub",
    description: "Launcher del ecosistema.",
    logoSrc: "/apps/hub.svg",
    brandColor: "#111827",
    href: "https://os.ventogroup.co",
    status: "active",
    group: "Workspace",
  },
  {
    id: "nexo",
    name: "NEXO",
    description: "Inventario y logística.",
    logoSrc: "/apps/nexo.svg",
    brandColor: "#F59E0B",
    href: "https://nexo.ventogroup.co",
    status: "active",
    group: "Operacion",
  },
  {
    id: "origo",
    name: "ORIGO",
    description: "Compras y proveedores.",
    logoSrc: "/apps/origo.svg",
    brandColor: "#0EA5E9",
    href: "https://origo.ventogroup.co",
    status: "active",
    group: "Operacion",
  },
  {
    id: "pulso",
    name: "PULSO",
    description: "POS y ventas.",
    logoSrc: "/apps/pulso.svg",
    brandColor: "#EF4444",
    href: "https://pulso.ventogroup.co",
    status: "active",
    group: "Operacion",
  },
  {
    id: "numera",
    name: "NUMERA",
    description: "Economia y rentabilidad.",
    logoSrc: "/apps/numera.svg",
    brandColor: "#2563EB",
    href: "https://numera.ventogroup.co",
    status: "active",
    group: "Operacion",
  },
  {
    id: "viso",
    name: "VISO",
    description: "Gerencia y auditoria.",
    logoSrc: "/apps/viso.svg",
    brandColor: "#A855F7",
    href: "https://viso.ventogroup.co",
    status: "active",
    group: "Operacion",
  },
  {
    id: "fogo",
    name: "FOGO",
    description: "Recetas y producción.",
    logoSrc: "/apps/fogo.svg",
    brandColor: "#FB7185",
    href: "https://fogo.ventogroup.co",
    status: "active",
    group: "Operacion",
  },
  {
    id: "aura",
    name: "AURA",
    description: "Marketing y contenido.",
    logoSrc: "/apps/aura.svg",
    brandColor: "#A855F7",
    href: "https://aura.ventogroup.co",
    status: "soon",
    group: "Proximamente",
  },
];

function isOperationalSite(site: SiteRow): boolean {
  const name = String(site.name ?? "").trim().toLowerCase();
  return name !== "app review (demo)";
}

function normalizeIconName(value: string | null | undefined): IconName | undefined {
  const icon = String(value ?? "").trim();
  return ICON_NAMES.has(icon as IconName) ? (icon as IconName) : undefined;
}

function splitPermissionCode(permissionCode: string, fallbackAppId: string) {
  const normalized = permissionCode.trim();

  if (!normalized) {
    return {
      appId: fallbackAppId,
      code: "",
    };
  }

  const firstDotIndex = normalized.indexOf(".");

  if (firstDotIndex === -1) {
    return {
      appId: fallbackAppId,
      code: normalized,
    };
  }

  return {
    appId: normalized.slice(0, firstDotIndex),
    code: normalized.slice(firstDotIndex + 1),
  };
}

function buildNavGroups(rows: NavigationRow[]): NavGroup[] {
  const groups = new Map<string, NavItem[]>();

  for (const row of rows) {
    const groupLabel = String(row.group_label ?? "").trim();
    const href = String(row.href ?? "").trim();
    const label = String(row.label ?? "").trim();
    const permissionCode = String(row.required_permission_code ?? "").trim();

    if (!groupLabel || !href || !label || !permissionCode) continue;

    const current = groups.get(groupLabel) ?? [];

    current.push({
      href,
      label,
      description: row.description ?? undefined,
      icon: normalizeIconName(row.icon),
      permissionCode,
    });

    groups.set(groupLabel, current);
  }

  return Array.from(groups.entries()).map(([label, items]) => ({
    label,
    items,
  }));
}

async function resolveAllowedApps({
  supabase,
  activeSiteId,
  actualRole,
}: {
  supabase: SupabaseClient;
  activeSiteId: string;
  actualRole: string;
}): Promise<AppSwitcherItem[]> {
  const resolved = await Promise.all(
    APP_SWITCHER_ITEMS.map(async (app): Promise<AppSwitcherItem> => {
      if (app.id === "hub") {
        return {
          ...app,
          access: "enabled",
        };
      }

      if (app.status === "soon") {
        return {
          ...app,
          access: "soon",
        };
      }

      const allowed = await checkPermissionWithRoleOverride({
        supabase,
        appId: app.id,
        code: "access",
        context: {
          siteId: activeSiteId || null,
          areaId: null,
        },
        actualRole,
      });

      return {
        ...app,
        access: allowed ? "enabled" : "disabled",
      };
    })
  );

  return resolved;
}

async function resolveNavigationItems({
  supabase,
  appCode,
  activeSiteId,
  actualRole,
}: {
  supabase: SupabaseClient;
  appCode: string;
  activeSiteId: string;
  actualRole: string;
}): Promise<NavGroup[]> {
  const { data, error } = await supabase
    .from("app_navigation_items")
    .select(
      "group_label,group_order,label,description,href,icon,required_permission_code,sort_order"
    )
    .eq("app_code", appCode)
    .eq("is_active", true)
    .order("group_order", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error || !data) return [];

  const rows = data as NavigationRow[];

  const permissionResults = await Promise.all(
    rows.map(async (row) => {
      const permissionCode = String(row.required_permission_code ?? "").trim();

      if (!permissionCode) return false;

      const { appId, code } = splitPermissionCode(permissionCode, appCode);

      if (!code) return false;

      return checkPermissionWithRoleOverride({
        supabase,
        appId,
        code,
        context: {
          siteId: activeSiteId || null,
          areaId: null,
        },
        actualRole,
      });
    })
  );

  const allowedRows = rows.filter((_, index) => permissionResults[index]);

  return buildNavGroups(allowedRows);
}

export async function VentoShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user ?? null;

  let displayName = "Usuario";
  let role: string | null = null;
  let sites: SiteRow[] = [];
  let activeSiteId = "";
  let appSwitcherItems: AppSwitcherItem[] = [];
  let navGroups: NavGroup[] = [];

  if (user) {
    const { data: employeeRow } = await supabase
      .from("employees")
      .select("role,full_name,alias,site_id")
      .eq("id", user.id)
      .maybeSingle();

    role = employeeRow?.role ?? null;
    displayName =
      employeeRow?.alias ?? employeeRow?.full_name ?? user.email ?? "Usuario";

    const { data: employeeSites } = await supabase
      .from("employee_sites")
      .select("site_id,is_primary")
      .eq("employee_id", user.id)
      .eq("is_active", true)
      .order("is_primary", { ascending: false })
      .limit(50);

    const employeeSiteRows = (employeeSites ?? []) as EmployeeSiteRow[];

    const siteIds = employeeSiteRows
      .map((row) => row.site_id)
      .filter((id): id is string => Boolean(id));

    let selectedSiteId = "";

    const { data: employeeSettings } = await supabase
      .from("employee_settings")
      .select("selected_site_id")
      .eq("employee_id", user.id)
      .maybeSingle();

    const selectedSiteCandidate = String(
      employeeSettings?.selected_site_id ?? ""
    ).trim();

    const cookieStore = await cookies();

    const cookieSiteCandidate = String(
      cookieStore.get("numera_site_override_id")?.value ?? ""
    ).trim();

    if (selectedSiteCandidate && siteIds.includes(selectedSiteCandidate)) {
      selectedSiteId = selectedSiteCandidate;
    }

    if (cookieSiteCandidate && siteIds.includes(cookieSiteCandidate)) {
      selectedSiteId = cookieSiteCandidate;
    }

    const defaultSiteId =
      employeeSiteRows[0]?.site_id ?? employeeRow?.site_id ?? "";

    activeSiteId = selectedSiteId || defaultSiteId || "";

    if (siteIds.length) {
      const { data: siteRows } = await supabase
        .from("sites")
        .select("id,name,site_type")
        .in("id", siteIds)
        .order("name", { ascending: true });

      sites = ((siteRows ?? []) as SiteRow[]).filter(isOperationalSite);

      if (activeSiteId && !sites.some((site) => site.id === activeSiteId)) {
        activeSiteId = sites[0]?.id ?? "";
      }
    }

    if (role) {
      const [resolvedApps, resolvedNavGroups] = await Promise.all([
        resolveAllowedApps({
          supabase,
          activeSiteId,
          actualRole: role,
        }),
        resolveNavigationItems({
          supabase,
          appCode: APP_CODE,
          activeSiteId,
          actualRole: role,
        }),
      ]);

      appSwitcherItems = resolvedApps;
      navGroups = resolvedNavGroups;
    }
  }

  return (
    <VentoChrome
      displayName={displayName}
      role={role ?? undefined}
      email={user?.email ?? null}
      sites={sites}
      activeSiteId={activeSiteId}
      appSwitcherItems={appSwitcherItems}
      navGroups={navGroups}
    >
      {children}
    </VentoChrome>
  );
}





