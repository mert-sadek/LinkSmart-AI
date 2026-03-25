/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./lib/firebase";
import { Toaster } from "sonner";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";
import Layout from "./components/Layout";
import Analytics from "./components/Analytics";
import UsersManagement from "./components/UsersManagement";
import ErrorBoundary from "./components/ErrorBoundary";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            setRole(userDoc.data().role || "client");
          } else {
            setRole("client");
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setRole("client");
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

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
          <Route path="/login" element={!user ? <Auth /> : <Navigate to="/" />} />
          <Route
            path="/"
            element={user ? <Layout user={user} role={role} /> : <Navigate to="/login" />}
          >
            <Route index element={<Dashboard user={user!} />} />
            <Route path="analytics/:linkId" element={<Analytics user={user!} />} />
            {role === "admin" && (
              <Route path="users" element={<UsersManagement />} />
            )}
          </Route>
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

