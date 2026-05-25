import { Link, NavLink, Outlet } from 'react-router-dom';

import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/workflows', label: 'Workflows', end: false },
];

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center gap-6 px-6">
          <Link to="/" className="flex items-center">
            {/* TODO: switch vers logo-rainpath-gradient-blanc.svg en thème dark (cf design system) */}
            <img
              src="/brand/logo-rainpath-gradient-rouge.svg"
              alt="RainPath"
              className="h-8 w-auto"
            />
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-1.5 transition-colors hover:bg-accent hover:text-accent-foreground',
                    isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <Toaster richColors position="top-right" />
    </div>
  );
}
