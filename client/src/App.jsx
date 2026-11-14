import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import LiveMap from './pages/LiveMap.jsx';
import EntryExit from './pages/EntryExit.jsx';
import Vehicles from './pages/Vehicles.jsx';
import VehicleDetail from './pages/VehicleDetail.jsx';
import RouteHistory from './pages/RouteHistory.jsx';
import Geofence from './pages/Geofence.jsx';
import Alerts from './pages/Alerts.jsx';
import Reports from './pages/Reports.jsx';
import Users from './pages/Users.jsx';
import Settings from './pages/Settings.jsx';

const ADMIN = ['ADMIN'];

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="live" element={<LiveMap />} />
        <Route path="entry-exit" element={<EntryExit />} />
        <Route path="vehicles" element={<Vehicles />} />
        <Route path="vehicles/:id" element={<VehicleDetail />} />
        <Route path="routes" element={<RouteHistory />} />
        <Route path="geofence" element={<Geofence />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="reports" element={<ProtectedRoute roles={ADMIN}><Reports /></ProtectedRoute>} />
        <Route path="users" element={<ProtectedRoute roles={ADMIN}><Users /></ProtectedRoute>} />
        <Route path="settings" element={<ProtectedRoute roles={ADMIN}><Settings /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
