import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import StarCanvas    from '@/components/ui/StarCanvas';
import Navbar        from '@/components/layout/Navbar';
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

// ── Protected route — redirects to /login if not authenticated ────────────────
function ProtectedRoute({ children }) {
  const { user, authLoading } = useAuth();

  // While the token is being validated on startup, show a minimal loader
  // so we don't flash the login page for users who are already signed in.
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
function Layout({ children }) {
  const { pathname } = useLocation();
  const isTrade  = pathname.startsWith('/trade');
  const isHome   = pathname === '/';

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden">
      {/* Global star-field — fixed so it stays behind ticker + navbar too.
          Only on home page; other pages have their own solid backgrounds. */}
      {isHome && (
        <>
          {/* Deep space base */}
          <div className="fixed inset-0 pointer-events-none"
            style={{ zIndex: 0, background: 'radial-gradient(ellipse at 50% 0%, #0d1018 0%, #08090c 100%)' }} />
          <StarCanvas style={{ position: 'fixed', zIndex: 1 }} />
          {/* Gold + blue colour vignettes */}
          <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 2 }}>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_68%_-5%,rgba(156,121,65,0.16)_0%,transparent_52%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_-5%_90%,rgba(96,165,250,0.07)_0%,transparent_48%)]" />
          </div>
        </>
      )}

      {/* All page content sits above the star canvas */}
      <div className="relative flex flex-col min-h-screen" style={{ zIndex: 3 }}>
        <Navbar />
        <main className="flex-1 flex flex-col">{children}</main>
        {!isTrade && <Footer />}
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <Routes>
      {/* Auth pages — full-screen, no navbar */}
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* All other pages share the Layout */}
      <Route path="*" element={
        <Layout>
          <Routes>
            <Route path="/"              element={<LandingPage />} />
            <Route path="/markets"       element={<MarketsPage />} />
            <Route path="/quick-trade"   element={<QuickTradePage />} />
            <Route path="/trade"         element={<TradePage />} />
            <Route path="/trade/:symbol" element={<TradePage />} />

            {/* Protected — must be logged in */}
            <Route path="/dashboard" element={
              <ProtectedRoute><DashboardPage /></ProtectedRoute>
            } />
            <Route path="/wallet" element={
              <ProtectedRoute><WalletPage /></ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute><ProfilePage /></ProtectedRoute>
            } />
            <Route path="/kyc" element={
              <ProtectedRoute><KYCPage /></ProtectedRoute>
            } />
          </Routes>
        </Layout>
      } />
    </Routes>
  );
}
