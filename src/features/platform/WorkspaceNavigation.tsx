import { useEffect, useRef, type MouseEvent, type RefObject } from "react";
import {
  ArrowUpRight,
  Bot,
  BrainCircuit,
  CalendarDays,
  CheckSquare,
  ChevronRight,
  Code2,
  FileText,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Moon,
  Package,
  PlugZap,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sun,
  Users,
  Wallet,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react";
import type {
  SessionData,
  WorkspaceRole,
} from "../../../shared/platform-contracts";
import BrandLogo from "../brand/BrandLogo";
import { getNavigationGroups } from "./routes";

export interface WorkspaceNavigationProps {
  role: WorkspaceRole;
  roleLabel: string;
  section: string;
  user: SessionData["user"];
  theme: "dark" | "light";
  mobile: boolean;
  open: boolean;
  openerRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onNavigate: (path: string) => void;
  onToggleTheme: () => void;
  onLogout: () => void;
}

const icons: Record<string, LucideIcon> = {
  overview: LayoutDashboard,
  shop: ShoppingBag,
  orders: ShoppingBag,
  inventory: Package,
  cases: ShieldCheck,
  jev: BrainCircuit,
  dealers: Users,
  business: Users,
  marketing: Megaphone,
  copilot: Bot,
  tasks: CheckSquare,
  documents: FileText,
  knowledge: FileText,
  calendar: CalendarDays,
  finance: Wallet,
  qc: ShieldCheck,
  shifts: CalendarDays,
  reports: FileText,
  people: Users,
  settings: Settings,
  health: Code2,
  jobs: Bot,
  automations: Workflow,
  plugins: PlugZap,
  legacy: Bot,
};

export function WorkspaceNavigation({
  role,
  roleLabel,
  section,
  user,
  theme,
  mobile,
  open,
  openerRef,
  onClose,
  onNavigate,
  onToggleTheme,
  onLogout,
}: WorkspaceNavigationProps) {
  const sidebar = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const modal = mobile && open;

  useEffect(() => {
    if (!modal) return;
    const container = sidebar.current;
    if (!container) return;
    const opener = openerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();

    const controls = () =>
      Array.from(
        container.querySelectorAll<HTMLElement>(
          "a[href],button:not([disabled])",
        ),
      ).filter(
        (element) =>
          element.getClientRects().length > 0 &&
          getComputedStyle(element).visibility !== "hidden",
      );
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const values = controls();
      const first = values[0],
        last = values[values.length - 1];
      const outside = !container.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || outside)) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || outside)
      ) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keyboard);
    return () => {
      document.removeEventListener("keydown", keyboard);
      document.body.style.overflow = previousOverflow;
      // Wait for React to remove inert from the workspace before returning focus.
      queueMicrotask(() => {
        if (opener?.isConnected) opener.focus();
      });
    };
  }, [modal, onClose, openerRef]);

  function follow(event: MouseEvent<HTMLAnchorElement>, path: string) {
    // Preserve the browser's open-in-new-tab behavior for modified link clicks.
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    onNavigate(path);
    onClose();
  }

  return (
    <>
      {modal && (
        <div className="platform-scrim" aria-hidden="true" onClick={onClose} />
      )}
      <aside
        id="workspace-navigation"
        ref={sidebar}
        inert={mobile && !open}
        className={`platform-sidebar ${modal ? "is-open" : ""}`}
        role={modal ? "dialog" : undefined}
        aria-modal={modal ? true : undefined}
        aria-label="Navigasi ruang kerja"
      >
        <div className="platform-brand-row">
          <a
            href="/"
            onClick={(event) => follow(event, "/")}
            className="platform-brand"
          >
            <BrandLogo className="platform-brand-logo" />
            <strong>
              ABANGCOLEK<small>WORK AS ONE.</small>
            </strong>
          </a>
          <button
            ref={closeButton}
            type="button"
            className="platform-menu-close"
            onClick={onClose}
            aria-label="Tutup navigasi"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="platform-space-badge">
          <span>
            <span className="platform-space-dot" />
            {roleLabel} workspace
          </span>
          <ShieldCheck size={16} aria-hidden="true" />
        </div>
        <nav aria-label={`Menu ${roleLabel} workspace`}>
          {getNavigationGroups(role).map((group) => (
            <section
              key={group.id}
              className="platform-nav-group"
              aria-labelledby={`workspace-group-${group.id}`}
            >
              <h2 id={`workspace-group-${group.id}`}>{group.label}</h2>
              {group.items.map((item) => {
                const Icon = icons[item.id] ?? ChevronRight;
                const current = section === item.id;
                return (
                  <a
                    key={item.id}
                    href={item.path}
                    className={`platform-nav-item ${current ? "is-active" : ""}`}
                    aria-current={current ? "page" : undefined}
                    onClick={(event) => follow(event, item.path)}
                  >
                    <span className="platform-nav-icon">
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <span className="platform-nav-label">{item.label}</span>
                    {current && (
                      <ArrowUpRight
                        className="platform-nav-current"
                        size={15}
                        aria-hidden="true"
                      />
                    )}
                  </a>
                );
              })}
            </section>
          ))}
        </nav>
        <footer>
          <span className="platform-user-name">
            {user.name}
            <small>{user.email}</small>
          </span>
          <div>
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label="Tukar tema"
            >
              {theme === "dark" ? (
                <Sun size={18} aria-hidden="true" />
              ) : (
                <Moon size={18} aria-hidden="true" />
              )}
            </button>
            <button type="button" onClick={onLogout} aria-label="Log keluar">
              <LogOut size={18} aria-hidden="true" />
            </button>
          </div>
        </footer>
      </aside>
    </>
  );
}
