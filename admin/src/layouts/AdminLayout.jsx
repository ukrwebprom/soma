import {
  Link,
  NavLink,
  Outlet,
} from "react-router";

function getNavigationClass({ isActive }) {
  return isActive
    ? "admin-nav-link admin-nav-link-active"
    : "admin-nav-link";
}

function AdminLayout() {
  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div className="admin-topbar-inner">
          <Link
            className="admin-brand"
            to="/templates"
          >
            <span>SOMA</span>
            <strong>CERTIFICATES</strong>
          </Link>

          <nav
            className="admin-navigation"
            aria-label="Главное меню"
          >
            <NavLink
              className={getNavigationClass}
              to="/templates"
            >
              Шаблоны
            </NavLink>

            <NavLink
              className={getNavigationClass}
              to="/certificates"
            >
              Сертификаты
            </NavLink>

            <NavLink
              className={getNavigationClass}
              to="/operators"
            >
              Оператори
            </NavLink>

            <NavLink
              className={getNavigationClass}
              to="/redemptions"
            >
              Журнал погашень
            </NavLink>
          </nav>

          <div className="admin-account">
            <div className="admin-account-icon">
              A
            </div>

            <div className="admin-account-text">
              <strong>Администратор</strong>
              <span>Локальный режим</span>
            </div>
          </div>
        </div>
      </header>

      <div className="admin-page-area">
        <Outlet />
      </div>
    </div>
  );
}

export default AdminLayout;
