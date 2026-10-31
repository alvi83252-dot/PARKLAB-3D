import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { CarFront } from 'lucide-react';
import { APP_CONFIG } from '../../config/app.config';
import { APP_ROUTES } from '../../constants/routes';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__inner">
          <Link to={APP_ROUTES.HOME} className="app-brand">
            <CarFront size={20} className="app-brand__icon" aria-hidden="true" />
            <span>{APP_CONFIG.name}</span>
            <span className="app-brand__badge">LIVE 3D</span>
          </Link>

          <nav className="app-nav" aria-label="Primary navigation">
            {APP_CONFIG.navigation.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === APP_ROUTES.HOME}
                className={({ isActive }) =>
                  isActive
                    ? 'app-nav__link app-nav__link--active'
                    : 'app-nav__link'
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="app-main">{children}</main>

      <footer className="app-footer">
        <div className="app-footer__inner">
          <span>{APP_CONFIG.name} — {APP_CONFIG.subtitle}</span>
          <span>{APP_CONFIG.currentStage}</span>
        </div>
      </footer>
    </div>
  );
}
