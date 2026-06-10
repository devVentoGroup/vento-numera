import { requireAppAccess } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

type SummaryRow = {
  cost_center_id: string;
  cost_center_name: string | null;
  cost_center_code: string | null;
  expected_revenue: number | null;
  actual_expenses: number | null;
  budget_amount: number | null;
  budget_variance: number | null;
};

function formatMoney(value: number | null | undefined) {
  const numericValue = Number(value ?? 0);
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    Number.isFinite(numericValue) ? numericValue : 0
  );
}

function centerLabel(row: SummaryRow) {
  const name = String(row.cost_center_name ?? "").trim() || "Centro sin nombre";
  const code = String(row.cost_center_code ?? "").trim();
  return code ? `${name} - ${code}` : name;
}

export default async function Page() {
  const { supabase } = await requireAppAccess({ appId: "numera", returnTo: "/login", permissionCode: "profitability.view" });
  const { data } = await supabase
    .from("numera_cost_center_monthly_summary")
    .select("cost_center_id,cost_center_name,cost_center_code,expected_revenue,actual_expenses,budget_amount,budget_variance")
    .order("expected_revenue", { ascending: false });
  const rows = (data ?? []) as SummaryRow[];

  return (
    <div className="w-full space-y-6">
      <section className="ui-panel space-y-3">
        <div className="ui-chip ui-chip--brand">NUMERA</div>
        <h1 className="ui-h1">Rentabilidad</h1>
        <p className="ui-body-muted">Lectura inicial de ingreso esperado, gasto real y variacion por centro de costo.</p>
      </section>

      <section className="ui-panel overflow-x-auto">
        <table className="ui-table min-w-[760px]">
          <thead>
            <tr>
              <th className="ui-th">Centro</th>
              <th className="ui-th">Ingreso esperado</th>
              <th className="ui-th">Gasto real</th>
              <th className="ui-th">Presupuesto</th>
              <th className="ui-th">Variacion</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.cost_center_id}>
                <td className="ui-td font-semibold">{centerLabel(row)}</td>
                <td className="ui-td">{formatMoney(row.expected_revenue)}</td>
                <td className="ui-td">{formatMoney(row.actual_expenses)}</td>
                <td className="ui-td">{formatMoney(row.budget_amount)}</td>
                <td className="ui-td">{formatMoney(row.budget_variance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <div className="ui-empty">No hay informacion de rentabilidad para el periodo actual.</div> : null}
      </section>
    </div>
  );
}