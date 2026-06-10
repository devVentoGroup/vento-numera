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
  const rows = (data ?? []) as SummaryRow[];
  const currentPeriod = periods[0] ?? null;

  return (
    <div className="w-full space-y-6">
      <section className="ui-panel space-y-3">
        <div className="ui-chip ui-chip--brand">NUMERA</div>
        <h1 className="ui-h1">Centros de costo</h1>
        <p className="ui-body-muted">Mapa economico por sede, area, canal y unidad operativa.</p>
      </section>

      {sp.ok ? <div className="ui-alert ui-alert--success">Presupuesto guardado.</div> : null}
      {sp.error ? <div className="ui-alert ui-alert--error">{sp.error}</div> : null}

      <section className="ui-panel overflow-x-auto">
        <table className="ui-table min-w-[980px]">
          <thead>
            <tr>
              <th className="ui-th">Centro</th>
              <th className="ui-th">Tipo</th>
              <th className="ui-th">Presupuesto</th>
              <th className="ui-th">Ingreso esperado</th>
              <th className="ui-th">Gasto real</th>
              <th className="ui-th">Variacion</th>
              <th className="ui-th">Equilibrio</th>
              <th className="ui-th">Margen</th>
              {canManage ? <th className="ui-th">Guardar</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.cost_center_id}>
                <td className="ui-td font-semibold">{centerLabel(row)}</td>
                <td className="ui-td">{row.cost_center_type ?? "Sin tipo"}</td>
                <td className="ui-td">{formatMoney(row.budget_amount)}</td>
                <td className="ui-td">{formatMoney(row.expected_revenue)}</td>
                <td className="ui-td">{formatMoney(row.actual_expenses)}</td>
                <td className="ui-td">{formatMoney(row.budget_variance)}</td>
                <td className="ui-td">{formatMoney(row.break_even_revenue)}</td>
                <td className="ui-td">{formatPercent(row.target_gross_margin_pct)}</td>
                {canManage ? (
                  <td className="ui-td min-w-[360px]">
                    <form action={upsertBudget} className="grid gap-2 sm:grid-cols-4">
                      <input type="hidden" name="period_id" value={currentPeriod?.id ?? ""} />
                      <input type="hidden" name="cost_center_id" value={row.cost_center_id} />
                      <input className="ui-input" type="number" min="0" step="1" name="budget_amount" defaultValue={Number(row.budget_amount ?? 0)} aria-label="Presupuesto" />
                      <input className="ui-input" type="number" min="0" step="1" name="expected_revenue" defaultValue={Number(row.expected_revenue ?? 0)} aria-label="Ingreso esperado" />
                      <input className="ui-input" type="number" min="0" max="100" step="0.01" name="target_gross_margin_pct" defaultValue={Number(row.target_gross_margin_pct ?? 0)} aria-label="Margen objetivo" />
                      <button className="ui-btn ui-btn--brand" type="submit" disabled={!currentPeriod}>Guardar</button>
                    </form>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <div className="ui-empty">No hay centros de costo para el periodo actual.</div> : null}
      </section>
    </div>
  );
}