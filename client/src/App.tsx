import { Navigate, Route, Routes } from "react-router-dom";
import ShellLayout from "./components/ShellLayout";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUpiSettings from "./pages/AdminUpiSettings";
import Events from "./pages/Events";
import EventForm from "./pages/EventForm";
import EventEdit from "./pages/EventEdit";
import Predictions from "./pages/Predictions";
import Guests from "./pages/Guests";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import EventOverview from "./pages/EventOverview";
import InvitePage from "./pages/InvitePage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/invite/:eventId" element={<InvitePage />} />
      <Route path="/landing" element={<Navigate to="/" replace />} />

      <Route element={<ShellLayout />}>
        <Route path="/dashboard" element={<Navigate to="/events" replace />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/upi-settings" element={<AdminUpiSettings />} />
        <Route path="/events" element={<Dashboard />} />
        <Route path="/events/new" element={<EventForm />} />
        <Route path="/events/:eventId/overview" element={<EventOverview />} />
        <Route path="/events/:eventId/edit" element={<EventEdit />} />
        <Route path="/events/:eventId" element={<Predictions />} />
        <Route path="/events/:eventId/guests" element={<Guests />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

