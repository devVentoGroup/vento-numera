import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { normalizePermissionCode } from "@/lib/auth/permissions";
import {
  canUseRoleOverride,
  getRoleOverrideFromCookies,
  isPermissionAllowedForRole,
} from "@/lib/auth/role-override";

type GuardOptions = {
  appId: string;
  returnTo: string;
  supabase?: Awaited<ReturnType<typeof createClient>>;
  permissionCode?: string | string[];
};

export async function requireAppAccess({
  appId,
  returnTo,
  supabase,
  permissionCode,
}: GuardOptions) {
  const client = supabase ?? (await createClient());

  const { data: userRes } = await client.auth.getUser();
  const user = userRes.user ?? null;

  if (!user) {
    const qs = new URLSearchParams();
    qs.set("returnTo", returnTo);
    redirect(`/login?${qs.toString()}`);
  }

  const { data: canAccess, error: accessErr } = await client.rpc("has_permission", {
    p_permission_code: `${appId}.access`,
  });

  if (accessErr || !canAccess) {
    const qs = new URLSearchParams();
    qs.set("returnTo", returnTo);
    if (accessErr) qs.set("reason", "no_access");
    redirect(`/no-access?${qs.toString()}`);
  }

  const permissionCodes = Array.isArray(permissionCode)
    ? permissionCode.filter(Boolean)
    : permissionCode
      ? [permissionCode]
      : [];

  if (permissionCodes.length) {
    const normalizedCodes = permissionCodes.map((code) =>
      normalizePermissionCode(appId, code)
    );
    const overrideRole = await getRoleOverrideFromCookies();
    let canOverride = false;
    let actualRole = "";
    let defaultSiteId: string | null = null;

    if (overrideRole) {
      const { data: employee } = await client
        .from("employees")
        .select("role,site_id")
        .eq("id", user.id)
        .maybeSingle();
      actualRole = String(employee?.role ?? "");
      defaultSiteId = employee?.site_id ?? null;
      canOverride = canUseRoleOverride(actualRole, overrideRole);
    }

    if (canOverride) {
      const checks = await Promise.all(
        normalizedCodes.map((code) =>
          isPermissionAllowedForRole(client, overrideRole!, appId, code, {
            siteId: defaultSiteId,
          })
        )
      );
      const deniedIndex = checks.findIndex((allowed) => !allowed);
      const deniedCode = deniedIndex >= 0 ? normalizedCodes[deniedIndex] : null;
      if (deniedCode) {
        const qs = new URLSearchParams();
        qs.set("returnTo", returnTo);
        qs.set("reason", "role_override");
        qs.set("permission", String(deniedCode ?? ""));
        redirect(`/no-access?${qs.toString()}`);
      }
    } else {
      const checks = await Promise.all(
        normalizedCodes.map((code) =>
          client.rpc("has_permission", { p_permission_code: code })
        )
      );

      const deniedIndex = checks.findIndex((res) => res.error || !res.data);
      if (deniedIndex !== -1) {
        const qs = new URLSearchParams();
        qs.set("returnTo", returnTo);
        qs.set("reason", "no_permission");
        qs.set("permission", String(normalizedCodes[deniedIndex] ?? ""));
        redirect(`/no-access?${qs.toString()}`);
      }
    }
  }

  return { supabase: client, user };
}

