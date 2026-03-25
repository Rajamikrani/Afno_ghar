import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import ListingDetail from "./pages/ListingDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import GuestPanel from "./pages/GuestPanel";
import HostPanel from "./pages/HostPanel";
import AdminPanel from "./pages/AdminPanel";
import ListYourHome from "./pages/ListYourHome";
import UserProfile from './pages/UserProfile';
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/list-your-home" element={<ListYourHome />} />
        <Route path="/guest-panel"   element={<GuestPanel />} /> 
        <Route path="/host-panel"   element={<HostPanel />} /> 
         <Route path="/admin-panel"   element={<AdminPanel />} /> 
        <Route path="/listing/:id" element={<ListingDetail />} />
        <Route path="/profile/:userId" element={<UserProfile />} />
        <Route path="/profile" element={<UserProfile />} /> {/* own profile */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* <Route path="/bookings/debug" element={<BookingConfirmation />} /> */}
         {/* Protected routes */}
        {/* <Route element={<ProtectedRoute />}>
          <Route path="/" element={<AfnoGharIndex />} />
          <Route path="/listing/:id" element={<ListingDetail />} />
        </Route> */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
