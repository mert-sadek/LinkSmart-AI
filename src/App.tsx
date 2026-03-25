/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";
import Layout from "./components/Layout";
import Analytics from "./components/Analytics";
import UsersManagement from "./components/UsersManagement";
import ErrorBoundary from "./components/ErrorBoundary";

export interface User {
  uid: string;
  email: string;
  role: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUser({
          uid: payload.uid,
          email: payload.email,
          role: payload.role
        });
      } catch (error) {
        console.error("Error parsing token:", error);
        localStorage.removeItem("token");
      }
    }
    setLoading(false);
  }, []);

  const login = (token: string) => {
    localStorage.setItem("token", token);
    const payload = JSON.parse(atob(token.split(".")[1]));
    setUser({
      uid: payload.uid,
      email: payload.email,
      role: payload.role
    });
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-zinc-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <Toaster position="top-right" theme="dark" />
        <Routes>
          <Route path="/login" element={!user ? <Auth onLogin={login} /> : <Navigate to="/" />} />
          <Route
            path="/"
            element={user ? <Layout user={user} role={user.role} onLogout={logout} /> : <Navigate to="/login" />}
          >
            <Route index element={<Dashboard user={user!} role={user?.role || null} />} />
            <Route path="analytics/:linkId" element={<Analytics user={user!} role={user?.role || null} />} />
            {user?.role === "admin" && (
              <Route path="users" element={<UsersManagement />} />
            )}
          </Route>
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

