import { requireAppAccess } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

type SummaryRow = {
  cost_center_id: string;
  cost_center_name: string | null;
  cost_center_code: string | null;
  fixed_expenses: number | null;
  variable_expenses: number | null;
  target_gross_margin_pct: number | null;
  break_even_revenue: number | null;
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
  const { supabase } = await requireAppAccess({ appId: "numera", returnTo: "/login", permissionCode: "break_even.view" });
  const { data } = await supabase
    .from("numera_cost_center_monthly_summary")
    .select("cost_center_id,cost_center_name,cost_center_code,fixed_expenses,variable_expenses,target_gross_margin_pct,break_even_revenue")
    .order("break_even_revenue", { ascending: false, nullsFirst: false });
  const rows = (data ?? []) as SummaryRow[];

  return (
    <div className="w-full space-y-6">
      <section className="ui-panel space-y-3">
        <div className="ui-chip ui-chip--brand">NUMERA</div>
        <h1 className="ui-h1">Punto de equilibrio</h1>
        <p className="ui-body-muted">Ventas necesarias para cubrir gastos fijos segun el margen objetivo de cada centro.</p>
      </section>

      <section className="ui-panel overflow-x-auto">
        <table className="ui-table min-w-[760px]">
          <thead>
            <tr>
              <th className="ui-th">Centro</th>
              <th className="ui-th">Gasto fijo</th>
              <th className="ui-th">Gasto variable</th>
              <th className="ui-th">Margen objetivo</th>
              <th className="ui-th">Venta equilibrio</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.cost_center_id}>
                <td className="ui-td font-semibold">{centerLabel(row)}</td>
                <td className="ui-td">{formatMoney(row.fixed_expenses)}</td>
                <td className="ui-td">{formatMoney(row.variable_expenses)}</td>
                <td className="ui-td">{row.target_gross_margin_pct ? `${row.target_gross_margin_pct}%` : "Sin margen"}</td>
                <td className="ui-td">{row.break_even_revenue === null ? "Sin calculo" : formatMoney(row.break_even_revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <div className="ui-empty">No hay informacion de equilibrio para el periodo actual.</div> : null}
      </section>
    </div>
  );
}