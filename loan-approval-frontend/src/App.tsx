import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import ApplicantDashboard from './pages/applicant/Dashboard';
import NewApplication from './pages/applicant/NewApplication';
import MyApplications from './pages/applicant/MyApplications';
import PolicyDashboard from './pages/policy-manager/Dashboard';
import ReviewApplications from './pages/policy-manager/ReviewApplications';
import PolicySearch from './pages/policy-manager/SearchApplications';
import MainDashboard from './pages/main-manager/Dashboard';
import EscalatedCases from './pages/main-manager/EscalatedCases';
import MainSearch from './pages/main-manager/SearchApplications';
import { logger } from './utils/logger';

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const paths: Record<string, string> = { APPLICANT: '/applicant', POLICY_MANAGER: '/policy-manager', MAIN_MANAGER: '/main-manager' };
  return <Navigate to={paths[user.role] || '/login'} replace />;
}

function AppRoutes() {
  const location = useLocation();

  useEffect(() => {
    logger.info(`Page navigation: ${location.pathname}`, {
      file: 'src/App.tsx',
      function: 'AppRoutes',
      url: location.pathname,
    });
  }, [location.pathname]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RootRedirect />} />

      <Route element={<ProtectedRoute roles={['APPLICANT']} />}>
        <Route path="/applicant" element={<Layout><ApplicantDashboard /></Layout>} />
        <Route path="/applicant/new" element={<Layout><NewApplication /></Layout>} />
        <Route path="/applicant/new/:id" element={<Layout><NewApplication /></Layout>} />
        <Route path="/applicant/applications" element={<Layout><MyApplications /></Layout>} />
      </Route>

      <Route element={<ProtectedRoute roles={['POLICY_MANAGER']} />}>
        <Route path="/policy-manager" element={<Layout><PolicyDashboard /></Layout>} />
        <Route path="/policy-manager/review" element={<Layout><ReviewApplications /></Layout>} />
        <Route path="/policy-manager/search" element={<Layout><PolicySearch /></Layout>} />
      </Route>

      <Route element={<ProtectedRoute roles={['MAIN_MANAGER']} />}>
        <Route path="/main-manager" element={<Layout><MainDashboard /></Layout>} />
        <Route path="/main-manager/escalated" element={<Layout><EscalatedCases /></Layout>} />
        <Route path="/main-manager/search" element={<Layout><MainSearch /></Layout>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  logger.info('App component mounted', { file: 'src/App.tsx', function: 'App' });

  return (
    <ThemeProvider>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{
          duration: 3000,
          style: { borderRadius: '12px', padding: '12px 16px', fontSize: '14px' },
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }} />
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}
