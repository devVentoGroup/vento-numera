import Link from "next/link";

import { requireAppAccess } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

const APP_ID = "numera";
const RETURN_TO = "/login";

type CurrentSummaryRow = {
  period_id: string | null;
  period_month: string | null;
  period_label: string | null;
  cost_centers: number | null;
  budget_amount: number | null;
  expected_revenue: number | null;
  actual_expenses: number | null;
  fixed_expenses: number | null;
  variable_expenses: number | null;
  one_time_expenses: number | null;
  break_even_revenue: number | null;
};

const modules = [
  { href: "/cost-centers", title: "Centros de costo", text: "Estructura economica por sede, area y canal." },
  { href: "/expenses", title: "Gastos", text: "Registro y lectura de gastos fijos y variables." },
  { href: "/break-even", title: "Punto de equilibrio", text: "Ventas necesarias para cubrir costos por satelite." },
  { href: "/profitability", title: "Rentabilidad", text: "Margen por producto, linea, sede y canal." },
];

function formatMoney(value: number | null | undefined) {
  const numericValue = Number(value ?? 0);
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(numericValue) ? numericValue : 0);
}

export default async function NumeraPanelPage() {
  const { supabase } = await requireAppAccess({ appId: APP_ID, returnTo: RETURN_TO });
  const { data } = await supabase.rpc("numera_current_period_summary");
  const summary = ((data ?? []) as CurrentSummaryRow[])[0] ?? null;

  const metrics = [
    {
      label: "Gasto operativo",
      value: formatMoney(summary?.actual_expenses),
      detail: `${summary?.cost_centers ?? 0} centros de costo en ${summary?.period_label ?? "periodo actual"}`,
    },
    {
      label: "Presupuesto",
      value: formatMoney(summary?.budget_amount),
      detail: `Ingreso esperado ${formatMoney(summary?.expected_revenue)}`,
    },
    {
      label: "Punto de equilibrio",
      value: formatMoney(summary?.break_even_revenue),
      detail: "Calculado con gastos fijos y margen objetivo",
    },
  ];

  return (
    <div className="w-full space-y-6">
      <section className="ui-panel ui-panel--halo space-y-4">
        <div className="ui-chip ui-chip--brand">NUMERA</div>
        <div className="max-w-3xl space-y-2">
          <h1 className="ui-h1">Inteligencia economica operativa</h1>
          <p className="ui-body-muted">
            Centro de lectura para costos, gastos, equilibrio y rentabilidad. Numera consolida datos
            de Origo, Nexo, Fogo, Pulso, Pass y Anima sin reemplazar sus flujos operativos.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="ui-card">
            <div className="ui-caption font-semibold uppercase">{metric.label}</div>
            <div className="mt-3 text-3xl font-semibold text-[var(--ui-text)]">{metric.value}</div>
            <p className="mt-2 ui-body-muted">{metric.detail}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {modules.map((module) => (
          <Link key={module.href} href={module.href} className="ui-panel block transition hover:shadow-lg">
            <div className="ui-h3">{module.title}</div>
            <p className="mt-2 ui-body-muted">{module.text}</p>
            <span className="mt-4 inline-block text-sm font-semibold text-[var(--ui-brand-600)]">Abrir modulo</span>
          </Link>
        ))}
      </section>
    </div>
  );
}