import {
  Navigate,
  Route,
  Routes,
} from "react-router";

import "./App.css";

import AdminLayout from
  "./layouts/AdminLayout.jsx";

import CreateTemplatePage from
  "./pages/CreateTemplatePage.jsx";

import PlaceholderPage from
  "./pages/PlaceholderPage.jsx";

import TemplatesListPage from
  "./pages/TemplatesListPage.jsx";

import CertificatesListPage from
  "./pages/CertificatesListPage.jsx";

function App() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route
          index
          element={
            <Navigate
              to="/templates"
              replace
            />
          }
        />

        <Route
          path="templates"
          element={<TemplatesListPage />}
        />

        <Route
          path="templates/new"
          element={<CreateTemplatePage />}
        />

        <Route
          path="certificates"
          element={<CertificatesListPage />}
        />

        <Route
          path="administrators"
          element={
            <PlaceholderPage
              title="Администраторы"
              description="Управление доступом к административной панели SOMA Certificates."
            />
          }
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/templates"
              replace
            />
          }
        />
      </Route>
    </Routes>
  );
}

export default App;