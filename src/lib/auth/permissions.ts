import type { createClient } from "@/lib/supabase/server";

export type PermissionContext = {
  siteId?: string | null;
  areaId?: string | null;
};

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export function normalizePermissionCode(appId: string, code: string) {
  if (code.startsWith(`${appId}.`)) return code;
  return `${appId}.${code}`;
}

export async function checkPermission(
  supabase: SupabaseClient,
  appId: string,
  code: string,
  context: PermissionContext = {}
) {
  const { data, error } = await supabase.rpc("has_permission", {
    p_permission_code: normalizePermissionCode(appId, code),
    p_site_id: context.siteId ?? null,
    p_area_id: context.areaId ?? null,
  });

  if (error) return false;
  return Boolean(data);
}

