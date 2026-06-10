import Link from "next/link";

type SearchParams = { returnTo?: string; reason?: string; permission?: string };

const HUB_URL = process.env.NEXT_PUBLIC_SHELL_LOGIN_URL?.replace(/\/login$/, "") || "https://os.ventogroup.co";

function safeReturnTo(value?: string) {
  const v = (value ?? "").trim();
  if (!v) return "";
  if (!v.startsWith("/")) return "";
  return v;
}

export default async function NoAccessPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = (await searchParams) ?? {};
  const returnTo = safeReturnTo(sp.returnTo);
  const reason = sp.reason ?? "";
  const permission = sp.permission ?? "";

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <div className="ui-panel">
        <div className="ui-caption">Vento OS · NUMERA</div>
        <h1 className="mt-2 ui-h1">No tienes permisos</h1>
        <p className="mt-2 ui-body-muted">
          Tu usuario esta autenticado, pero no tiene acceso a este modulo o a la accion solicitada.
        </p>

        {returnTo ? (
          <div className="mt-3 ui-caption">
            Ruta solicitada: <span className="font-mono">{returnTo}</span>
          </div>
        ) : null}

        {permission ? (
          <div className="mt-1 ui-caption text-[var(--ui-muted)]">
            Permiso requerido: <span className="font-mono">{permission}</span>
          </div>
        ) : null}

        {reason === "role_override" ? (
          <div className="mt-2 ui-alert ui-alert--warn">
            El rol de prueba seleccionado no tiene este permiso.
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <a href={HUB_URL} className="ui-btn ui-btn--brand">
            Volver al Hub
          </a>
          <Link href="/" className="ui-btn ui-btn--ghost">
            Ir a inicio NUMERA
          </Link>
        </div>
      </div>
    </div>
  );
}


