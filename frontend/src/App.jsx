import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import { AuthProvider } from "./auth/AuthContent";
import ProtectedRoute from "./auth/ProtectedRoute";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Toast from "./components/Toast";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ProviderProfile from "./pages/ProviderProfile";
import CreateJob from "./pages/CreateJob";
import Chat from "./pages/Chat";
import Subscribe from "./pages/Subscribe";
import Admin from "./pages/Admin";
import RoleRoute from "./auth/RoleRoute";
import ProviderSetup from "./pages/ProviderSetup";

export default function App() {
  const [toast, setToast] = useState({ show: false });

  const notify = (type, title, message) =>
    setToast({ show: true, type, title, message });

  const clear = () => setToast({ show: false });

  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Toast toast={toast} clear={clear} />

        <Routes>
          <Route path="/" element={<Home notify={notify} />} />
          <Route
            path="/provider/:userId"
            element={<ProviderProfile notify={notify} />}
          />

          <Route path="/login" element={<Login notify={notify} />} />
          <Route path="/register" element={<Register notify={notify} />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard notify={notify} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/create"
            element={
              <ProtectedRoute>
                <CreateJob notify={notify} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/chat/:jobId"
            element={
              <ProtectedRoute>
                <Chat notify={notify} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subscribe"
            element={
              <ProtectedRoute>
                <Subscribe notify={notify} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <RoleRoute role="admin">
                <Admin notify={notify} />
              </RoleRoute>
            }
          />
          <Route
            path="/provider/setup"
            element={
              <ProtectedRoute>
                <ProviderSetup notify={notify} />
              </ProtectedRoute>
            }
          />
        </Routes>
        <Footer />
      </BrowserRouter>
    </AuthProvider>
  );
}
