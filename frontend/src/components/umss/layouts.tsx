import { useState, type ReactNode } from "react";
import { LogOut, Menu, X, type LucideIcon } from "lucide-react";
import pupLogo from "@/assets/PUP_LOGO.png";

export interface NavigationItem {
  id: string;
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
}

export function StudentShell({ children, login = false }: { children: ReactNode; login?: boolean }) {
  return (
    <main className={login ? "login-shell" : "student-shell"}>
      <div className="student-page">{children}</div>
    </main>
  );
}

export function ApplicationShell({ children, title, roleLabel, user, items, active, onLogout }: {
  children: ReactNode;
  title: string;
  roleLabel: string;
  user: { name: string; id: string };
  items: NavigationItem[];
  active: string;
  onLogout: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="application-shell">
      <a href="#workspace-content" className="skip-link">Skip to main content</a>
      <aside className="workspace-sidebar" aria-label={`${roleLabel} sidebar`}>
        <div className="workspace-brand">
          <img src={pupLogo} alt="PUP" className="h-12 w-12 shrink-0" />
          <div><p className="text-lg font-bold">UMSS</p><p className="text-xs text-white/70">General Services Office</p></div>
        </div>
        <button className="workspace-menu lg:hidden" aria-label="Toggle navigation" aria-expanded={expanded}
          aria-controls="workspace-navigation" onClick={() => setExpanded(v => !v)}>
          {expanded ? <X size={22} /> : <Menu size={22} />}
        </button>
        <nav id="workspace-navigation" aria-label={`${roleLabel} navigation`}
          className={`workspace-navigation ${expanded ? "is-expanded" : ""}`}
          onKeyDown={e => { if (e.key === "Escape") { setExpanded(false); e.currentTarget.parentElement?.querySelector<HTMLButtonElement>(".workspace-menu")?.focus(); } }}>
          <p className="px-3 pb-3 text-xs font-semibold uppercase tracking-widest text-white/60">{roleLabel}</p>
          {items.map(item => (
            <button key={item.id} aria-current={active === item.id ? "page" : undefined}
              onClick={() => {
                item.onSelect();
                setExpanded(false);
                window.scrollTo({ top: 0 });
                requestAnimationFrame(() => document.getElementById("workspace-content")?.focus({ preventScroll: true }));
              }}>
              <item.icon size={19} /><span>{item.label}</span>
            </button>
          ))}
          <button className="workspace-logout" onClick={onLogout}><LogOut size={19} />Log Out</button>
        </nav>
      </aside>
      <div className="workspace-body">
        <header className="workspace-header">
          <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wider text-[#810000]">PUP · {roleLabel}</p>
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{title}</h1></div>
          <div className="min-w-0 text-right"><p className="break-words text-sm font-semibold text-gray-800">{user.name}</p>
            <p className="break-all text-xs text-gray-500">{user.id}</p></div>
        </header>
        <main id="workspace-content" tabIndex={-1} className="workspace-content">{children}</main>
      </div>
    </div>
  );
}
