import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAppAccess } from "@/lib/auth/guard";
import { checkPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PeriodRow = { id: string; label: string; period_month: string };
type SummaryRow = {
  period_label: string | null;
  cost_center_id: string;
  cost_center_name: string | null;
  cost_center_code: string | null;
  cost_center_type: string | null;
  budget_amount: number | null;
  expected_revenue: number | null;
  actual_expenses: number | null;
  budget_variance: number | null;
  break_even_revenue: number | null;
  target_gross_margin_pct: number | null;
};

type CenterGroup = {
  title: string;
  subtitle: string;
  rows: SummaryRow[];
};

function asText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function parseMoney(value: FormDataEntryValue | null) {
  const text = asText(value);
  if (!text) return 0;
  const parsed = Number(text.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function parsePercent(value: FormDataEntryValue | null) {
  const text = asText(value);
  if (!text) return 0;
  const parsed = Number(text.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : null;
}

function formatMoney(value: number | null | undefined) {
  const numericValue = Number(value ?? 0);
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    Number.isFinite(numericValue) ? numericValue : 0
  );
}

function formatPercent(value: number | null | undefined) {
  const numericValue = Number(value ?? 0);
  return `${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(Number.isFinite(numericValue) ? numericValue : 0)}%`;
}

function centerLabel(row: SummaryRow) {
  const name = String(row.cost_center_name ?? "").trim() || "Centro sin nombre";
  const code = String(row.cost_center_code ?? "").trim();
  return code ? `${name} - ${code}` : name;
}

function centerKindLabel(type: string | null | undefined) {
  switch (type) {
    case "production_center":
      return "Centro productor";
    case "satellite":
      return "Satelite";
    case "admin":
      return "Administrativo";
    default:
      return "Otro";
  }
}

function isDemoRow(row: SummaryRow) {
  const text = `${row.cost_center_name ?? ""} ${row.cost_center_code ?? ""}`.toLowerCase();
  return text.includes("app review") || text.includes("demo");
}

function sumRows(rows: SummaryRow[], key: keyof Pick<SummaryRow, "budget_amount" | "expected_revenue" | "actual_expenses" | "budget_variance" | "break_even_revenue">) {
  return rows.reduce((total, row) => total + Number(row[key] ?? 0), 0);
}

function groupRows(rows: SummaryRow[]): CenterGroup[] {
  const production = rows.filter((row) => row.cost_center_type === "production_center");
  const satellites = rows.filter((row) => row.cost_center_type === "satellite");
  const admin = rows.filter((row) => row.cost_center_type === "admin");
  const other = rows.filter((row) => !["production_center", "satellite", "admin"].includes(String(row.cost_center_type ?? "")));

  return [
    {
      title: "Centro productor",
      subtitle: "Aqui se controla lo que se vende internamente a los satelites por remisiones valorizadas.",
      rows: production,
    },
    {
      title: "Satelites",
      subtitle: "Aqui se miden gastos propios, compras internas recibidas y punto de equilibrio por sede.",
      rows: satellites,
    },
    {
      title: "Administrativo",
      subtitle: "Aqui van gastos de soporte que no pertenecen a una sede operativa concreta.",
      rows: admin,
    },
    {
      title: "Otros centros",
      subtitle: "Centros que aun necesitan clasificacion operativa.",
      rows: other,
    },
  ].filter((group) => group.rows.length > 0);
}

async function upsertBudget(formData: FormData) {
  "use server";

  const supabase = await createClient();
  await requireAppAccess({ appId: "numera", returnTo: "/cost-centers", supabase, permissionCode: "cost_centers.manage" });

  const periodId = asText(formData.get("period_id"));
  const costCenterId = asText(formData.get("cost_center_id"));
  const budgetAmount = parseMoney(formData.get("budget_amount"));
  const expectedRevenue = parseMoney(formData.get("expected_revenue"));
  const targetGrossMarginPct = parsePercent(formData.get("target_gross_margin_pct"));
  const notes = asText(formData.get("notes"));

  if (!periodId || !costCenterId || budgetAmount === null || expectedRevenue === null || targetGrossMarginPct === null) {
    redirect("/cost-centers?error=Datos%20incompletos");
  }

  const { error } = await supabase.from("numera_cost_center_budgets").upsert(
    {
      period_id: periodId,
      cost_center_id: costCenterId,
      budget_amount: budgetAmount,
      expected_revenue: expectedRevenue,
      target_gross_margin_pct: targetGrossMarginPct,
      notes: notes || null,
    },
    { onConflict: "period_id,cost_center_id" }
  );

  if (error) redirect(`/cost-centers?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/");
  revalidatePath("/cost-centers");
  revalidatePath("/break-even");
  revalidatePath("/profitability");
  redirect("/cost-centers?ok=budget");
}

export default async function Page({ searchParams }: { searchParams?: Promise<{ ok?: string; error?: string }> }) {
  const { supabase } = await requireAppAccess({ appId: "numera", returnTo: "/login", permissionCode: "cost_centers.view" });
  const canManage = await checkPermission(supabase, "numera", "cost_centers.manage");
  const sp = (await searchParams) ?? {};

  const [{ data: periodsData }, { data }] = await Promise.all([
    supabase.from("numera_periods").select("id,label,period_month").order("period_month", { ascending: false }).limit(1),
    supabase
      .from("numera_cost_center_monthly_summary")
      .select("period_label,cost_center_id,cost_center_name,cost_center_code,cost_center_type,budget_amount,expected_revenue,actual_expenses,budget_variance,break_even_revenue,target_gross_margin_pct")
      .order("cost_center_name", { ascending: true }),
  ]);

  const periods = (periodsData ?? []) as PeriodRow[];
  const rows = ((data ?? []) as SummaryRow[]).filter((row) => !isDemoRow(row));
  const currentPeriod = periods[0] ?? null;
  const groupedRows = groupRows(rows);
  const totalBudget = sumRows(rows, "budget_amount");
  const totalExpectedRevenue = sumRows(rows, "expected_revenue");
  const totalBreakEven = sumRows(rows, "break_even_revenue");
  const configuredRows = rows.filter((row) => Number(row.budget_amount ?? 0) > 0 || Number(row.expected_revenue ?? 0) > 0 || Number(row.target_gross_margin_pct ?? 0) > 0).length;

  return (
    <div className="w-full space-y-6">
      <section className="ui-panel ui-panel--halo space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-3">
            <div className="ui-chip ui-chip--brand">NUMERA / Modelo economico</div>
            <h1 className="ui-h1">Centros de costo</h1>
            <p className="ui-body-muted">
              Esta pantalla no crea sedes ni productos. Aqui defines las metas economicas por centro: cuanto puede gastar, cuanto debe facturar internamente o vender, y que margen bruto objetivo debe sostener.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface-2)] px-4 py-3 text-sm text-[var(--ui-muted)]">
            Periodo activo<br />
            <span className="text-base font-semibold text-[var(--ui-text)]">{currentPeriod?.label ?? "Sin periodo"}</span>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-[var(--ui-border)] bg-white p-4">
            <div className="ui-caption font-semibold uppercase">Que editas</div>
            <p className="mt-2 text-sm text-[var(--ui-muted)]">Presupuesto mensual, ingreso esperado y margen bruto objetivo.</p>
          </div>
          <div className="rounded-2xl border border-[var(--ui-border)] bg-white p-4">
            <div className="ui-caption font-semibold uppercase">Que calcula Numera</div>
            <p className="mt-2 text-sm text-[var(--ui-muted)]">Gasto real, variacion contra presupuesto y punto de equilibrio.</p>
          </div>
          <div className="rounded-2xl border border-[var(--ui-border)] bg-white p-4">
            <div className="ui-caption font-semibold uppercase">De donde vendran ventas internas</div>
            <p className="mt-2 text-sm text-[var(--ui-muted)]">De remisiones valorizadas en Nexo: centro productor vende, satelite compra.</p>
          </div>
        </div>
      </section>

      {sp.ok ? <div className="ui-alert ui-alert--success">Modelo guardado.</div> : null}
      {sp.error ? <div className="ui-alert ui-alert--error">{sp.error}</div> : null}

      <section className="grid gap-4 md:grid-cols-4">
        <div className="ui-card">
          <div className="ui-caption font-semibold uppercase">Centros configurados</div>
          <div className="mt-3 text-3xl font-semibold text-[var(--ui-text)]">{configuredRows}/{rows.length}</div>
          <p className="mt-2 ui-body-muted">Con al menos una meta economica cargada.</p>
        </div>
        <div className="ui-card">
          <div className="ui-caption font-semibold uppercase">Presupuesto total</div>
          <div className="mt-3 text-3xl font-semibold text-[var(--ui-text)]">{formatMoney(totalBudget)}</div>
          <p className="mt-2 ui-body-muted">Techo mensual de gasto operativo.</p>
        </div>
        <div className="ui-card">
          <div className="ui-caption font-semibold uppercase">Ingreso esperado</div>
          <div className="mt-3 text-3xl font-semibold text-[var(--ui-text)]">{formatMoney(totalExpectedRevenue)}</div>
          <p className="mt-2 ui-body-muted">Meta de venta externa o interna.</p>
        </div>
        <div className="ui-card">
          <div className="ui-caption font-semibold uppercase">Equilibrio</div>
          <div className="mt-3 text-3xl font-semibold text-[var(--ui-text)]">{formatMoney(totalBreakEven)}</div>
          <p className="mt-2 ui-body-muted">Ventas necesarias para cubrir gastos.</p>
        </div>
      </section>

      <section className="ui-panel space-y-3">
        <div className="ui-h2">Como llenar esta pantalla</div>
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface-2)] p-4">
            <div className="font-semibold text-[var(--ui-text)]">1. Centro productor</div>
            <p className="mt-2 text-sm text-[var(--ui-muted)]">Pon el ingreso esperado por ventas internas a satelites y el margen que debe dejar producir.</p>
          </div>
          <div className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface-2)] p-4">
            <div className="font-semibold text-[var(--ui-text)]">2. Satelites</div>
            <p className="mt-2 text-sm text-[var(--ui-muted)]">Pon gastos propios de la sede y venta esperada. Las remisiones recibidas deben entrar como costo interno.</p>
          </div>
          <div className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface-2)] p-4">
            <div className="font-semibold text-[var(--ui-text)]">3. Revisa equilibrio</div>
            <p className="mt-2 text-sm text-[var(--ui-muted)]">Si el equilibrio supera el ingreso esperado, esa sede necesita subir ventas, bajar gasto o ajustar precio interno.</p>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        {groupedRows.map((group) => (
          <div key={group.title} className="ui-panel space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="ui-h2">{group.title}</h2>
                <p className="mt-1 ui-body-muted">{group.subtitle}</p>
              </div>
              <span className="ui-chip">{group.rows.length} centro(s)</span>
            </div>

            <div className="grid gap-4">
              {group.rows.map((row) => {
                const variance = Number(row.budget_variance ?? 0);
                const isOverBudget = variance < 0;

                return (
                  <article key={row.cost_center_id} className="rounded-2xl border border-[var(--ui-border)] bg-white p-4 shadow-[var(--ui-shadow-soft)]">
                    <div className="grid gap-4 xl:grid-cols-[minmax(220px,0.9fr)_minmax(0,1.3fr)_minmax(320px,0.95fr)] xl:items-start">
                      <div>
                        <div className="text-lg font-semibold text-[var(--ui-text)]">{centerLabel(row)}</div>
                        <div className="mt-2 inline-flex rounded-full bg-[var(--ui-surface-2)] px-3 py-1 text-xs font-semibold text-[var(--ui-muted)]">
                          {centerKindLabel(row.cost_center_type)}
                        </div>
                        <p className="mt-3 text-sm text-[var(--ui-muted)]">
                          {row.cost_center_type === "production_center"
                            ? "Su ingreso debe venir principalmente de ventas internas por remisiones valorizadas."
                            : row.cost_center_type === "satellite"
                              ? "Debe cubrir compras internas, gasto propio y venta esperada de la sede."
                              : "Debe usarse solo para gasto compartido o soporte."}
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="rounded-xl bg-[var(--ui-surface-2)] p-3">
                          <div className="ui-caption font-semibold uppercase">Presupuesto</div>
                          <div className="mt-1 text-lg font-semibold">{formatMoney(row.budget_amount)}</div>
                        </div>
                        <div className="rounded-xl bg-[var(--ui-surface-2)] p-3">
                          <div className="ui-caption font-semibold uppercase">Ingreso esperado</div>
                          <div className="mt-1 text-lg font-semibold">{formatMoney(row.expected_revenue)}</div>
                        </div>
                        <div className="rounded-xl bg-[var(--ui-surface-2)] p-3">
                          <div className="ui-caption font-semibold uppercase">Gasto real</div>
                          <div className="mt-1 text-lg font-semibold">{formatMoney(row.actual_expenses)}</div>
                        </div>
                        <div className="rounded-xl bg-[var(--ui-surface-2)] p-3">
                          <div className="ui-caption font-semibold uppercase">Variacion</div>
                          <div className={`mt-1 text-lg font-semibold ${isOverBudget ? "text-[var(--ui-danger)]" : "text-[var(--ui-success)]"}`}>{formatMoney(row.budget_variance)}</div>
                        </div>
                        <div className="rounded-xl bg-[var(--ui-surface-2)] p-3">
                          <div className="ui-caption font-semibold uppercase">Equilibrio</div>
                          <div className="mt-1 text-lg font-semibold">{formatMoney(row.break_even_revenue)}</div>
                        </div>
                        <div className="rounded-xl bg-[var(--ui-surface-2)] p-3">
                          <div className="ui-caption font-semibold uppercase">Margen objetivo</div>
                          <div className="mt-1 text-lg font-semibold">{formatPercent(row.target_gross_margin_pct)}</div>
                        </div>
                      </div>

                      {canManage ? (
                        <form action={upsertBudget} className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface-2)] p-3">
                          <input type="hidden" name="period_id" value={currentPeriod?.id ?? ""} />
                          <input type="hidden" name="cost_center_id" value={row.cost_center_id} />
                          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                            <label className="space-y-1">
                              <span className="ui-label">Presupuesto mensual</span>
                              <input className="ui-input" type="number" min="0" step="1" name="budget_amount" defaultValue={Number(row.budget_amount ?? 0)} />
                            </label>
                            <label className="space-y-1">
                              <span className="ui-label">Ingreso esperado</span>
                              <input className="ui-input" type="number" min="0" step="1" name="expected_revenue" defaultValue={Number(row.expected_revenue ?? 0)} />
                            </label>
                            <label className="space-y-1">
                              <span className="ui-label">Margen bruto objetivo %</span>
                              <input className="ui-input" type="number" min="0" max="100" step="0.01" name="target_gross_margin_pct" defaultValue={Number(row.target_gross_margin_pct ?? 0)} />
                            </label>
                          </div>
                          <button className="ui-btn ui-btn--brand mt-3 w-full" type="submit" disabled={!currentPeriod}>Guardar modelo</button>
                        </form>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ))}

        {rows.length === 0 ? <div className="ui-empty">No hay centros de costo para el periodo actual.</div> : null}
      </section>
    </div>
  );
}