import { Link, Outlet } from "@tanstack/react-router";
import {
  Heart,
  LayoutDashboard,
  MessageCircle,
  QrCode,
  ShieldCheck,
  Users,
} from "lucide-react";
import { RedirectToSignIn, SignInGate, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminShellLogin } from "@/components/admin-shell-login";

const NAV = [
  { to: "/admin", label: "Resumen", icon: LayoutDashboard },
  { to: "/admin/boda", label: "Boda", icon: Heart },
  { to: "/admin/invitados", label: "Invitados", icon: Users },
  { to: "/admin/mensaje", label: "WhatsApp", icon: MessageCircle },
  { to: "/admin/escaner", label: "Escáner", icon: QrCode },
  { to: "/admin/cuenta", label: "Cuenta", icon: ShieldCheck },
] as const;

export function AdminShell() {
  const { isPending } = useCurrentUserState();
  return (
    <SignInGate fallback={<AdminShellLogin />}>
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
              <nav className="hidden gap-4 text-sm md:flex" aria-label="Secciones del panel">
                {NAV.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      activeOptions={{ exact: item.to === "/admin" }}
                      className="inline-flex items-center gap-1.5 text-muted hover:text-fg"
                      activeProps={{ className: "inline-flex items-center gap-1.5 text-fg" }}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden="true" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <UserButton />
            </div>
            <nav
              className="flex gap-3 overflow-x-auto px-4 pb-3 text-sm md:hidden"
              aria-label="Secciones del panel"
            >
              {NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    activeOptions={{ exact: item.to === "/admin" }}
                    className="inline-flex shrink-0 items-center gap-1.5 text-muted"
                    activeProps={{
                      className: "inline-flex shrink-0 items-center gap-1.5 text-fg",
                    }}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
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
