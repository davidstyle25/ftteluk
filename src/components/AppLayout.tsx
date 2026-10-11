import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LogOut,
  LayoutGrid,
  Link as LinkIcon,
  Users,
  ScrollText,
  Settings,
  GitCompare,
  Target,
  ChevronDown,
  Database,
  Menu,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useRole } from "@/lib/use-role";
import { logVisitOnce } from "@/lib/activity";
import { VISIBLE_CATEGORIES } from "@/lib/data-catalog";
import { cn } from "@/lib/utils";

type Item = { label: string; to: string; slug?: string; icon?: typeof LayoutGrid };

const FLAT: Item[] = [
  { label: "Dashboard", to: "/", icon: LayoutGrid },
  { label: "Links", to: "/links", icon: LinkIcon },
  { label: "KPI RM", to: "/kpi-rm", icon: Target },
  ...VISIBLE_CATEGORIES.filter((c) => !c.group).map((c) => ({
    label: c.label,
    to: "/data/$slug",
    slug: c.slug,
    icon: LayoutGrid,
  })),
];

const GROUPED = Array.from(
  VISIBLE_CATEGORIES.filter((c) => c.group).reduce((map, c) => {
    const list = map.get(c.group!) ?? [];
    list.push({ label: c.label, to: "/data/$slug", slug: c.slug });
    map.set(c.group!, list);
    return map;
  }, new Map<string, Item[]>()),
).map(([label, items]) => ({ label, items }));

const VIEWER_DIRECT: Record<string, string> = {
  DI319: "di319_data3",
  DI321: "di321_data3",
  DEPO: "depo_data3",
};

const SYSTEM: Item[] = [
  { label: "Users", to: "/users", icon: Users },
  { label: "Activity Logs", to: "/logs", icon: ScrollText },
  { label: "Settings", to: "/settings", icon: Settings },
  { label: "Compare Data", to: "/compare-data", icon: GitCompare },
];

function NavLink({ item, active, sub }: { item: Item; active: boolean; sub?: boolean }) {
  const Icon = item.icon;
  const className = cn(
    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
    sub ? "pl-9 text-sidebar-foreground/70" : "text-sidebar-foreground/85",
    active
      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
      : "hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
  );
  if (item.slug) {
    return (
      <Link to="/data/$slug" params={{ slug: item.slug }} className={className}>
        {Icon && <Icon className="size-4 shrink-0" />}
        <span className="truncate">{item.label}</span>
      </Link>
    );
  }
  return (
    <Link to={item.to} className={className}>
      {Icon && <Icon className="size-4 shrink-0" />}
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const { isAdmin } = useRole();
  const navigate = useNavigate();
  const location = useRouterState({ select: (s) => s.location });
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!user) return;
    const name = (user.user_metadata?.["nama"] as string) || user.email?.split("@")[0] || "user";
    void logVisitOnce(name, location.pathname);
  }, [user, location.pathname]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Memuat…
      </div>
    );
  }

  const currentSlug = location.pathname.startsWith("/data/")
    ? decodeURIComponent(location.pathname.split("/")[2] ?? "")
    : "";

  const isActive = (item: Item) =>
    item.slug ? currentSlug === item.slug : location.pathname === item.to;

  const displayName = (user.user_metadata?.["nama"] as string) || user.email?.split("@")[0] || "User";

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-2 border-b border-sidebar-border px-5 py-4">
          <Database className="size-5 text-sidebar-primary" />
          <span className="text-base font-bold tracking-tight">FT Teluk Betung</span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">
            Data Categories
          </p>
          {FLAT.map((item) => (
            <NavLink key={item.label} item={item} active={isActive(item)} />
          ))}

          {GROUPED.map((group) => {
            const direct = VIEWER_DIRECT[group.label];
            if (!isAdmin && direct) {
              const target = group.items.find((i) => i.slug === direct);
              if (!target) return null;
              const item: Item = { label: group.label, to: "/data/$slug", slug: direct, icon: LayoutGrid };
              return <NavLink key={group.label} item={item} active={isActive(item)} />;
            }
            const isOpen = !collapsed[group.label];
            return (
              <div key={group.label}>
                <button
                  type="button"
                  onClick={() =>
                    setCollapsed((c) => ({ ...c, [group.label]: !c[group.label] }))
                  }
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent/60"
                >
                  <ChevronDown
                    className={cn("size-4 transition-transform", !isOpen && "-rotate-90")}
                  />
                  {group.label}
                </button>
                {isOpen &&
                  group.items.map((item) => (
                    <NavLink key={item.slug} item={item} active={isActive(item)} sub />
                  ))}
              </div>
            );
          })}


          <p className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">
            System
          </p>
          {SYSTEM.map((item) => (
            <NavLink key={item.to} item={item} active={isActive(item)} />
          ))}
        </nav>

        <div className="flex items-center justify-between gap-2 border-t border-sidebar-border px-5 py-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            <p className="truncate text-xs text-sidebar-foreground/60">{user.email}</p>
          </div>
          <button
            type="button"
            aria-label="Keluar"
            className="rounded-md p-2 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={async () => {
              await signOut();
              navigate({ to: "/login" });
            }}
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-foreground/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="lg:pl-64">
        <div className="flex items-center gap-3 border-b bg-card px-4 py-3 lg:hidden">
          <button type="button" aria-label="Menu" onClick={() => setOpen(true)}>
            <Menu className="size-5" />
          </button>
          <span className="font-semibold">FT Teluk Betung</span>
        </div>
        <main className="px-4 py-6 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
