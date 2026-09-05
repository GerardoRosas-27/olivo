import { Link, Outlet } from "@tanstack/react-router";
import { RedirectToSignIn, SignInGate, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { GROK_PROVIDERS, signIn } from "@/lib/auth/client";
import { Skeleton } from "@/components/ui/skeleton";

const NAV = [
  { to: "/admin", label: "Resumen" },
  { to: "/admin/boda", label: "Boda" },
  { to: "/admin/invitados", label: "Invitados" },
  { to: "/admin/mensaje", label: "WhatsApp" },
  { to: "/admin/escaner", label: "Escáner" },
] as const;

export function AdminShell() {
  const { isPending } = useCurrentUserState();
  return (
    <SignInGate
      fallback={
        <main className="grid min-h-screen place-items-center bg-bg px-6 text-fg">
          <div className="w-full max-w-sm space-y-4">
            <p className="text-[11px] tracking-[0.28em] text-muted uppercase">Olivo</p>
            <h1 className="font-display text-4xl italic">Entrar al panel</h1>
            <div className="flex flex-col gap-2">
              {GROK_PROVIDERS.map((p) => (
                <button
                  key={p.providerId}
                  type="button"
                  className="h-11 rounded-[var(--radius)] border border-border bg-surface"
                  onClick={() => signIn(p.providerId, { callbackURL: "/admin" })}
                >
                  Continuar con {p.label}
                </button>
              ))}
            </div>
            <Link to="/" className="block text-sm text-olive">
              Volver
            </Link>
          </div>
        </main>
      }
    >
      {isPending ? (
        <div className="min-h-screen bg-bg p-6">
          <Skeleton className="h-10 w-40" />
          <p className="mt-4 text-sm text-muted">Cargando el panel de Olivo…</p>
        </div>
      ) : (
        <div className="min-h-screen bg-bg text-fg">
          <header className="border-b border-border bg-surface">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
              <Link to="/" className="font-display text-2xl italic">
                Olivo
              </Link>
              <nav className="hidden gap-4 text-sm md:flex">
                {NAV.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    activeOptions={{ exact: item.to === "/admin" }}
                    className="text-muted hover:text-fg"
                    activeProps={{ className: "text-fg" }}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <UserButton />
            </div>
            <nav className="flex gap-3 overflow-x-auto px-4 pb-3 text-sm md:hidden">
              {NAV.map((item) => (
                <Link key={item.to} to={item.to} className="shrink-0 text-muted" activeProps={{ className: "text-fg" }}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>
          <div className="mx-auto max-w-5xl px-4 py-8">
            <Outlet />
          </div>
        </div>
      )}
    </SignInGate>
  );
}

export function AdminGuard() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return null;
  if (!user) return <RedirectToSignIn />;
  return null;
}
