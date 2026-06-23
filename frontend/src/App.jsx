import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'sonner';
import './App.css';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const JournalPage = lazy(() => import('./pages/JournalPage'));
const SelfiePage = lazy(() => import('./pages/SelfiePage'));
const QuizPage = lazy(() => import('./pages/QuizPage'));

const PageLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50/50">
    <div className="w-10 h-10 rounded-full border-2 border-indigo-600/20 border-t-indigo-600 animate-spin mb-4" />
    <p className="text-sm text-slate-450 font-bold tracking-wider animate-pulse uppercase">Loading MindMate...</p>
  </div>
);

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
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* 1. LANDING PAGE - The new entry point */}
              <Route
                path="/"
                element={<LandingPage />}
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
          </Suspense>
          <Toaster position="top-right" richColors />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;