import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import { AuthProvider } from "./hooks/AuthProvider";
import Administracion from "./pages/Administracion";
import Dashboard from "./pages/Dashboard";
import DetalleVisitante from "./pages/DetalleVisitante";
import Login from "./pages/Login";
import Reportes from "./pages/Reportes";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<Navigate to="/recepcion" replace />} />
              <Route path="/recepcion" element={<Dashboard />} />
              <Route
                path="/recepcion/visitantes/:id"
                element={<DetalleVisitante />}
              />
              <Route path="/recepcion/reportes" element={<Reportes />} />
              <Route path="/administracion" element={<Administracion />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
