/**
 * Normalizes employee_sites rows selected as "site_id,sites(id,name)".
 * Supabase can return sites as an object or array depending on the relation.
 */
export type EmployeeSiteRow = {
  site_id?: string;
  sites?: { id: string; name: string } | { id: string; name: string }[] | null;
};

export type SiteOption = { id: string; name: string };

export function normalizeSitesFromEmployeeSites(
  rows: EmployeeSiteRow[] | null | undefined
): SiteOption[] {
  const raw = rows ?? [];
  return raw
    .map((r) => {
      const s = Array.isArray(r.sites) ? r.sites[0] : r.sites;
      return s ? { id: s.id, name: s.name } : null;
    })
    .filter((x): x is SiteOption => x !== null);
}