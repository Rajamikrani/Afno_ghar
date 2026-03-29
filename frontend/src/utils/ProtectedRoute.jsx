// src/utils/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";

const ProtectedRoute = ({ allowedRoles }) => {
  const location = useLocation();
  const user  = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("accessToken");

  if (!token || !user) {
    // Not logged in → redirect to login, remember the attempted URL
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Wrong role → back to home
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;