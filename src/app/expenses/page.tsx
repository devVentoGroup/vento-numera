import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAppAccess } from "@/lib/auth/guard";
import { checkPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PeriodRow = { id: string; label: string; period_month: string };
type CategoryRow = { id: string; name: string; expense_kind: string };
type CostCenterRow = { id: string; name: string | null; code: string | null };
type ExpenseRow = {
  id: string;
  expense_date: string;
  description: string;
  amount: number;
  currency: string;
  numera_expense_categories: Array<{ name: string | null; expense_kind: string | null }> | { name: string | null; expense_kind: string | null } | null;
  cost_centers: Array<{ name: string | null; code: string | null }> | { name: string | null; code: string | null } | null;
};

function asText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function parseAmount(value: FormDataEntryValue | null) {
  const parsed = Number(asText(value).replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function formatMoney(value: number | null | undefined) {
  const numericValue = Number(value ?? 0);
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    Number.isFinite(numericValue) ? numericValue : 0
  );
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function centerLabel(row: CostCenterRow | ExpenseRow["cost_centers"] | null | undefined) {
  const resolved = firstRelation(
    row as
      | { name: string | null; code: string | null }
      | Array<{ name: string | null; code: string | null }>
      | null
      | undefined
  );
  if (!resolved) return "Sin centro";
  const name = String(resolved.name ?? "").trim() || "Centro sin nombre";
  const code = String(resolved.code ?? "").trim();
  return code ? `${name} - ${code}` : name;
}

async function createExpense(formData: FormData) {
  "use server";

  const supabase = await createClient();
  await requireAppAccess({ appId: "numera", returnTo: "/expenses", supabase, permissionCode: "expenses.manage" });

  const periodId = asText(formData.get("period_id"));
  const categoryId = asText(formData.get("category_id"));
  const costCenterId = asText(formData.get("cost_center_id"));
  const expenseDate = asText(formData.get("expense_date"));
  const description = asText(formData.get("description"));
  const amount = parseAmount(formData.get("amount"));

  if (!periodId || !categoryId || !costCenterId || !expenseDate || !description || amount === null) {
    redirect("/expenses?error=Datos%20incompletos");
  }

  const { error } = await supabase.from("numera_expenses").insert({
    period_id: periodId,
    category_id: categoryId,
    cost_center_id: costCenterId,
    expense_date: expenseDate,
    description,
    amount,
    currency: "COP",
    source_app: "numera",
  });

  if (error) redirect(`/expenses?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/");
  revalidatePath("/expenses");
  revalidatePath("/cost-centers");
  redirect("/expenses?ok=created");
}

export default async function Page({ searchParams }: { searchParams?: Promise<{ ok?: string; error?: string }> }) {
  const { supabase } = await requireAppAccess({ appId: "numera", returnTo: "/login", permissionCode: "expenses.view" });
  const canManage = await checkPermission(supabase, "numera", "expenses.manage");
  const sp = (await searchParams) ?? {};

  const [{ data: periodsData }, { data: categoriesData }, { data: centersData }, { data: expensesData }] = await Promise.all([
    supabase.from("numera_periods").select("id,label,period_month").order("period_month", { ascending: false }).limit(12),
    supabase.from("numera_expense_categories").select("id,name,expense_kind").eq("is_active", true).order("sort_order"),
    supabase.from("cost_centers").select("id,name,code").neq("is_active", false).order("name"),
    supabase
      .from("numera_expenses")
      .select("id,expense_date,description,amount,currency,numera_expense_categories(name,expense_kind),cost_centers(name,code)")
      .order("expense_date", { ascending: false })
      .limit(50),
  ]);

  const periods = (periodsData ?? []) as PeriodRow[];
  const categories = (categoriesData ?? []) as CategoryRow[];
  const centers = (centersData ?? []) as CostCenterRow[];
  const expenses = (expensesData ?? []) as unknown as ExpenseRow[];
  const currentPeriod = periods[0] ?? null;

  return (
    <div className="w-full space-y-6">
      <section className="ui-panel space-y-3">
        <div className="ui-chip ui-chip--brand">NUMERA</div>
        <h1 className="ui-h1">Gastos</h1>
        <p className="ui-body-muted">Lectura y captura de gastos fijos y variables por centro de costo.</p>
      </section>

      {sp.ok ? <div className="ui-alert ui-alert--success">Gasto registrado.</div> : null}
      {sp.error ? <div className="ui-alert ui-alert--error">{sp.error}</div> : null}

      {canManage ? (
        <form action={createExpense} className="ui-panel grid gap-4 lg:grid-cols-5">
          <input type="hidden" name="period_id" value={currentPeriod?.id ?? ""} />
          <label className="space-y-1 lg:col-span-2">
            <span className="ui-label">Detalle</span>
            <input className="ui-input" name="description" required placeholder="Ej. Arriendo sede" />
          </label>
          <label className="space-y-1">
            <span className="ui-label">Fecha</span>
            <input className="ui-input" type="date" name="expense_date" required defaultValue={new Date().toISOString().slice(0, 10)} />
          </label>
          <label className="space-y-1">
            <span className="ui-label">Clase</span>
            <select className="ui-input" name="category_id" required>
              <option value="">Seleccionar</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="ui-label">Monto</span>
            <input className="ui-input" type="number" min="0" step="1" name="amount" required placeholder="0" />
          </label>
          <label className="space-y-1 lg:col-span-4">
            <span className="ui-label">Centro de costo</span>
            <select className="ui-input" name="cost_center_id" required>
              <option value="">Seleccionar</option>
              {centers.map((center) => <option key={center.id} value={center.id}>{centerLabel(center)}</option>)}
            </select>
          </label>
          <div className="flex items-end">
            <button className="ui-btn ui-btn--brand w-full" type="submit" disabled={!currentPeriod}>Registrar</button>
          </div>
        </form>
      ) : null}

      <section className="ui-panel overflow-x-auto">
        <table className="ui-table min-w-[820px]">
          <thead>
            <tr>
              <th className="ui-th">Fecha</th>
              <th className="ui-th">Detalle</th>
              <th className="ui-th">Clase</th>
              <th className="ui-th">Centro</th>
              <th className="ui-th">Monto</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={expense.id}>
                <td className="ui-td">{expense.expense_date}</td>
                <td className="ui-td font-semibold">{expense.description}</td>
                <td className="ui-td">{firstRelation(expense.numera_expense_categories)?.name ?? "Sin clase"}</td>
                <td className="ui-td">{centerLabel(expense.cost_centers)}</td>
                <td className="ui-td">{formatMoney(expense.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {expenses.length === 0 ? <div className="ui-empty">No hay gastos registrados.</div> : null}
      </section>
    </div>
  );
}