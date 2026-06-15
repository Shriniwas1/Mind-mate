import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'sonner';
import LandingPage from './pages/LandingPage'; // Import the new Landing Page
import AuthPage from './pages/AuthPage';
import OnboardingPage from './pages/OnboardingPage';
import Dashboard from './pages/Dashboard';
import JournalPage from './pages/JournalPage';
import SelfiePage from './pages/SelfiePage';
import QuizPage from './pages/QuizPage';
import './App.css';

/**
 * PRIVATE ROUTE
 * Checks if the user is logged in. If not, redirects to the 
 * Landing Page so they can see the introduction first.
 */
const PrivateRoute = ({ children }) => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium">Loading MindMate...</p>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    // Redirect to root (Landing Page) if not authenticated
    return <Navigate to="/" replace />;
  }

  return children;
};

/**
 * PUBLIC ROUTE
 * Redirects logged-in users away from the Landing/Auth pages 
 * and straight to the Dashboard.
 */
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App">
          <Routes>
            {/* 1. LANDING PAGE - The new entry point */}
            <Route
              path="/"
              element={
                <PublicRoute>
                  <LandingPage />
                </PublicRoute>
              }
            />

            {/* 2. AUTH PAGE - For Login/Signup */}
            <Route
              path="/auth"
              element={
                <PublicRoute>
                  <AuthPage />
                </PublicRoute>
              }
            />

            {/* 3. PROTECTED DASHBOARD */}
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />

            {/* 4. OTHER PROTECTED ROUTES */}
            <Route
              path="/journal"
              element={
                <PrivateRoute>
                  <JournalPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/selfie"
              element={
                <PrivateRoute>
                  <SelfiePage />
                </PrivateRoute>
              }
            />
            <Route
              path="/quiz"
              element={
                <PrivateRoute>
                  <QuizPage />
                </PrivateRoute>
              }
            />

            {/* 5. ONBOARDING - Backup route */}
            <Route
              path="/onboarding"
              element={
                <PrivateRoute>
                  <OnboardingPage />
                </PrivateRoute>
              }
            />

            {/* Root Redirect & Catch-all */}
            {/* If a user goes to a random URL, send them to dashboard (which redirects to landing if unauthenticated) */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          <Toaster position="top-right" richColors />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;