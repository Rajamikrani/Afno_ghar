import { Navigate, Outlet, useLocation } from "react-router-dom";

const ProtectedRoute = ({ allowedRoles }) => {
  const location = useLocation();
  const user  = JSON.parse(localStorage.getItem("user") || "null");
  const token = localStorage.getItem("accessToken");

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Role-aware redirect instead of dumping everyone at "/"
    if (user.role === "admin") return <Navigate to="/admin-panel" replace />;
    if (user.role === "host")  return <Navigate to="/host-panel"  replace />;
    if (user.role === "guest") return <Navigate to="/guest-panel" replace />;
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;

