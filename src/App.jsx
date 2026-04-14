import { Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Navbar        from '@/components/layout/Navbar';
import ImpersonationBanner from '@/components/layout/ImpersonationBanner';
import FeaturesPausedBanner from '@/components/layout/FeaturesPausedBanner';
import Footer        from '@/components/layout/Footer';
import LandingPage   from '@/pages/LandingPage';
import MarketsPage   from '@/pages/MarketsPage';
import TradePage     from '@/pages/TradePage';
import LoginPage     from '@/pages/LoginPage';
import RegisterPage  from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import WalletPage    from '@/pages/WalletPage';
import ProfilePage      from '@/pages/ProfilePage';
import KYCPage          from '@/pages/KYCPage';
import QuickTradePage   from '@/pages/QuickTradePage';
import PnLAnalyticsPage from '@/pages/PnLAnalyticsPage';

// ── Protected route — redirects to /login if not authenticated ────────────────
function ProtectedRoute({ children }) {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface-dark flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
}

// ── Main layout (Navbar + optional Footer) ───────────────────────────────────
function Layout() {
  const { pathname } = useLocation();
  const isTrade  = pathname.startsWith('/trade');
  const isHome   = pathname === '/';

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden">
      {isHome && (
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          <div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(ellipse at 50% 0%, #0d1018 0%, #08090c 100%)' }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_68%_-5%,rgba(156,121,65,0.12)_0%,transparent_52%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_-5%_90%,rgba(96,165,250,0.06)_0%,transparent_48%)]" />
        </div>
      )}

      <div className="relative flex flex-col min-h-screen" style={{ zIndex: 3 }}>
        <Navbar />
        <ImpersonationBanner />
        <FeaturesPausedBanner />
        <main className="flex-1 flex flex-col">
          <Outlet />
        </main>
        {!isTrade && <Footer />}
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <Routes>
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<Layout />}>
        <Route path="/"              element={<LandingPage />} />
        <Route path="/markets"       element={<MarketsPage />} />
        <Route path="/quick-trade"   element={<QuickTradePage />} />
        <Route path="/trade"         element={<TradePage />} />
        <Route path="/trade/:symbol" element={<TradePage />} />

        <Route path="/dashboard" element={
          <ProtectedRoute><DashboardPage /></ProtectedRoute>
        } />
        <Route path="/wallet" element={
          <ProtectedRoute><WalletPage /></ProtectedRoute>
        } />
        <Route path="/portfolio" element={
          <ProtectedRoute><PnLAnalyticsPage /></ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute><ProfilePage /></ProtectedRoute>
        } />
        <Route path="/kyc" element={
          <ProtectedRoute><KYCPage /></ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
