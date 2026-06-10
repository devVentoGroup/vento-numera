#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const APP_CODE = "numera";
const ENV_FILES = [".env.local", ".env"];

const ROUTES = [
  {
    href: "/cost-centers",
    sourcePath: "src/app/cost-centers/page.tsx",
    itemKey: "cost_centers",
    label: "Centros de costo",
    description: "Sedes, areas y unidades economicas",
    icon: "accounting",
    groupKey: "estructura",
    groupLabel: "Estructura",
    groupOrder: 20,
    sortOrder: 10,
    permission: "numera.cost_centers.view",
  },
  {
    href: "/expenses",
    sourcePath: "src/app/expenses/page.tsx",
    itemKey: "expenses",
    label: "Gastos",
    description: "Gastos fijos y variables",
    icon: "fileText",
    groupKey: "gastos",
    groupLabel: "Gastos",
    groupOrder: 30,
    sortOrder: 10,
    permission: "numera.expenses.view",
  },
  {
    href: "/break-even",
    sourcePath: "src/app/break-even/page.tsx",
    itemKey: "break_even",
    label: "Punto de equilibrio",
    description: "Equilibrio por sede y periodo",
    icon: "dashboard",
    groupKey: "analisis",
    groupLabel: "Analisis",
    groupOrder: 40,
    sortOrder: 10,
    permission: "numera.break_even.view",
  },
  {
    href: "/profitability",
    sourcePath: "src/app/profitability/page.tsx",
    itemKey: "profitability",
    label: "Rentabilidad",
    description: "Margenes por producto, linea y canal",
    icon: "accounting",
    groupKey: "analisis",
    groupLabel: "Analisis",
    groupOrder: 40,
    sortOrder: 20,
    permission: "numera.profitability.view",
  },
];

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, "utf-8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function loadEnv() {
  for (const file of ENV_FILES) loadEnvFile(path.join(process.cwd(), file));
}

function syncHash(route) {
  const sourceFile = path.join(process.cwd(), route.sourcePath);
  const source = existsSync(sourceFile) ? readFileSync(sourceFile, "utf-8") : "";
  return createHash("sha256").update(source).update(JSON.stringify(route)).digest("hex");
}

async function upsertRegistry(supabase, route) {
  const { error } = await supabase.rpc("upsert_app_screen_registry", {
    p_app_code: APP_CODE,
    p_href: route.href,
    p_label: route.label,
    p_description: route.description,
    p_icon: route.icon,
    p_suggested_group_key: route.groupKey,
    p_suggested_group_label: route.groupLabel,
    p_suggested_group_order: route.groupOrder,
    p_suggested_sort_order: route.sortOrder,
    p_required_permission_code: route.permission,
    p_permission_name: `${route.label} - Ver`,
    p_permission_description: `Permite ver ${route.label} en NUMERA.`,
    p_source_path: route.sourcePath,
    p_sync_source: "numera-sync-navigation",
    p_sync_hash: syncHash(route),
  });
  if (error) throw new Error(`registry ${route.href}: ${error.message}`);

  const { error: classifyError } = await supabase
    .from("app_screen_registry")
    .update({
      item_key: route.itemKey,
      navigation_kind: "menu",
      is_menu_candidate: true,
      is_available: true,
      is_ignored: false,
      parent_href: null,
    })
    .eq("app_code", APP_CODE)
    .eq("href", route.href);
  if (classifyError) throw new Error(`classify ${route.href}: ${classifyError.message}`);
}

async function upsertNavigation(supabase, route) {
  const { error } = await supabase.from("app_navigation_items").upsert(
    {
      app_code: APP_CODE,
      group_key: route.groupKey,
      group_label: route.groupLabel,
      group_order: route.groupOrder,
      item_key: route.itemKey,
      label: route.label,
      description: route.description,
      href: route.href,
      icon: route.icon,
      required_permission_code: route.permission,
      sort_order: route.sortOrder,
      is_active: true,
    },
    { onConflict: "app_code,item_key" }
  );
  if (error) throw new Error(`navigation ${route.href}: ${error.message}`);
}

async function main() {
  loadEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log(JSON.stringify({ app: APP_CODE, mode: "preview", reason: "missing service-role env", routes: ROUTES }, null, 2));
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const route of ROUTES) {
    await upsertRegistry(supabase, route);
    await upsertNavigation(supabase, route);
  }

  console.log(JSON.stringify({ app: APP_CODE, mode: "synced", routes: ROUTES.map((route) => route.href) }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});