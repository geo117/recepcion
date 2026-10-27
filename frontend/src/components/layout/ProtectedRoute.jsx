import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/authContext";

export default function ProtectedRoute() {
  const { autenticado } = useAuth();
  const location = useLocation();

  if (!autenticado) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ desde: `${location.pathname}${location.search}` }}
      />
    );
  }

  return <Outlet />;
}
