import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import ListingDetail from "./pages/ListingDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import GuestPanel from "./pages/GuestPanel";
import HostPanel from "./pages/HostPanel";
import EditListing from './pages/EditListing';
import AdminPanel from "./pages/AdminPanel";
import ListYourHome from "./pages/ListYourHome";
import UserProfile from './pages/UserProfile';
import ProtectedRoute from "./utils/ProtectedRoute"; // 👈 add this

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ───── Public ───── */}
        <Route path="/"            element={<Home />} />
        <Route path="/listing/:id" element={<ListingDetail />} />
        <Route path="/login"       element={<Login />} />
        <Route path="/register"    element={<Register />} />

        {/* ───── Any logged-in user ───── */}
        <Route element={<ProtectedRoute />}>
          <Route path="/profile"          element={<UserProfile />} />
          <Route path="/profile/:userId"  element={<UserProfile />} />
        </Route>

        {/* ───── Host only ───── */}
        <Route element={<ProtectedRoute allowedRoles={["host"]} />}>
          <Route path="/host-panel"       element={<HostPanel />} />
          <Route path="/list-your-home"   element={<ListYourHome />} />
          <Route path="/edit-listing/:id" element={<EditListing />} />
        </Route>

        {/* ───── Guest only ───── */}
        <Route element={<ProtectedRoute allowedRoles={["guest"]} />}>
          <Route path="/guest-panel" element={<GuestPanel />} />
        </Route>

        {/* ───── Admin only ───── */}
        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route path="/admin-panel" element={<AdminPanel />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;