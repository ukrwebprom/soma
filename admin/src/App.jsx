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

import PublicCertificatePage from
  "./pages/PublicCertificatePage.jsx";

import OperatorsPage from
  "./pages/OperatorsPage.jsx";

import RedemptionsPage from
  "./pages/RedemptionsPage.jsx";

function App() {
  return (
    <Routes>

        <Route
        path="/c/:code"
        element={<PublicCertificatePage />}
      />

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
          path="templates/edit"
          element={<CreateTemplatePage mode="edit" />}
        />

        <Route
          path="certificates"
          element={<CertificatesListPage />}
        />


        <Route
          path="/operators"
          element={<OperatorsPage />}
        />

        <Route
          path="/redemptions"
          element={<RedemptionsPage />}
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
