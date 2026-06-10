import { cookies } from "next/headers";

import { checkPermission, normalizePermissionCode } from "@/lib/auth/permissions";
import type { createClient } from "@/lib/supabase/server";
import {
  PRIVILEGED_ROLE_OVERRIDES,
  ROLE_OVERRIDE_COOKIE,
} from "@/lib/auth/role-override-config";

export async function getRoleOverrideFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(ROLE_OVERRIDE_COOKIE)?.value ?? "";
  const value = raw.trim();
  return value ? value : null;
}

export function canUseRoleOverride(
  actualRole: string,
  overrideRole: string | null
) {
  if (!overrideRole) return false;
  if (!actualRole) return false;
  return PRIVILEGED_ROLE_OVERRIDES.has(actualRole);
}

type RolePermissionRow = {
  scope_type?: string | null;
  scope_site_id?: string | null;
  scope_area_id?: string | null;
  scope_site_type?: string | null;
  scope_area_kind?: string | null;
  permission?: { code?: string | null; app?: { code?: string | null } | null } | null;
};

type RolePermissionEntry = {
  code: string;
  scope_type: string | null;
  scope_site_id: string | null;
  scope_area_id: string | null;
  scope_site_type: string | null;
  scope_area_kind: string | null;
};

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function loadRolePermissions(supabase: SupabaseClient, role: string) {
  if (!role) return [];

  const { data: permissions, error } = await supabase
    .from("role_permissions")
    .select(
      "scope_type,scope_site_id,scope_area_id,scope_site_type,scope_area_kind,permission:app_permissions(code,app:apps(code))"
    )
    .eq("role", role)
    .eq("is_allowed", true);

  if (error || !permissions) return [];

  return (permissions as RolePermissionRow[])
    .map((row) => {
      const appCode = row.permission?.app?.code ?? "";
      const permCode = row.permission?.code ?? "";
      const code = appCode && permCode ? `${appCode}.${permCode}` : "";
      return {
        code,
        scope_type: row.scope_type ?? null,
        scope_site_id: row.scope_site_id ?? null,
        scope_area_id: row.scope_area_id ?? null,
        scope_site_type: row.scope_site_type ?? null,
        scope_area_kind: row.scope_area_kind ?? null,
      };
    })
    .filter((row) => Boolean(row.code));
}

async function resolveContextMeta(
  supabase: SupabaseClient,
  siteId?: string | null,
  areaId?: string | null
) {
  let siteType: string | null = null;
  let areaKind: string | null = null;

  if (siteId) {
    const { data: site } = await supabase
      .from("sites")
      .select("site_type")
      .eq("id", siteId)
      .maybeSingle();
    siteType = site?.site_type ?? null;
  }

  if (areaId) {
    const { data: area } = await supabase
      .from("areas")
      .select("kind")
      .eq("id", areaId)
      .maybeSingle();
    areaKind = area?.kind ?? null;
  }

  return { siteType, areaKind };
}

function scopeMatches(
  entry: RolePermissionEntry,
  context: { siteId?: string | null; areaId?: string | null },
  meta: { siteType: string | null; areaKind: string | null }
) {
  const scopeType = entry.scope_type;
  if (!scopeType || scopeType === "global") return true;

  if (scopeType === "site") {
    if (!context.siteId) return false;
    if (entry.scope_site_id && entry.scope_site_id !== context.siteId) return false;
    return true;
  }

  if (scopeType === "site_type") {
    if (!context.siteId || !meta.siteType) return false;
    if (entry.scope_site_type && entry.scope_site_type !== meta.siteType) return false;
    return true;
  }

  if (scopeType === "area") {
    if (!context.areaId) return false;
    if (entry.scope_area_id && entry.scope_area_id !== context.areaId) return false;
    return true;
  }

  if (scopeType === "area_kind") {
    if (!context.areaId || !meta.areaKind) return false;
    if (entry.scope_area_kind && entry.scope_area_kind !== meta.areaKind) return false;
    return true;
  }

  return false;
}

export async function isPermissionAllowedForRole(
  supabase: SupabaseClient,
  role: string,
  appId: string,
  code: string,
  context: { siteId?: string | null; areaId?: string | null } = {}
) {
  const normalized = normalizePermissionCode(appId, code);
  const permissions = await loadRolePermissions(supabase, role);
  const matching = permissions.filter((entry) => entry.code === normalized);
  if (!matching.length) return false;

  const needsSiteType = matching.some((entry) => entry.scope_type === "site_type");
  const needsAreaKind = matching.some((entry) => entry.scope_type === "area_kind");
  const needsMeta = needsSiteType || needsAreaKind;
  const meta = needsMeta
    ? await resolveContextMeta(supabase, context.siteId ?? null, context.areaId ?? null)
    : { siteType: null, areaKind: null };

  return matching.some((entry) => scopeMatches(entry, context, meta));
}

export async function checkPermissionWithRoleOverride({
  supabase,
  appId,
  code,
  context,
  actualRole,
}: {
  supabase: SupabaseClient;
  appId: string;
  code: string;
  context?: { siteId?: string | null; areaId?: string | null };
  actualRole: string;
}) {
  const overrideRole = await getRoleOverrideFromCookies();
  if (canUseRoleOverride(actualRole, overrideRole)) {
    return isPermissionAllowedForRole(supabase, overrideRole!, appId, code, context);
  }
  return checkPermission(supabase, appId, code, context);
}

