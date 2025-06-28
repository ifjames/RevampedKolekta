import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LocationProvider, useLocation } from '@/contexts/LocationContext';
import { LandingPage } from '@/components/LandingPage';
import { AuthModal } from '@/components/AuthModal';
import { Dashboard } from '@/components/Dashboard';
import { LocationPermissionPage } from '@/components/LocationPermissionPage';

function AppContent() {
  const { user, loading } = useAuth();
  const { permissionDenied, requestLocation } = useLocation();
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  const handleGetStarted = () => {
    setAuthMode('signup');
    setShowAuth(true);
  };

  const handleLogin = () => {
    setAuthMode('signin');
    setShowAuth(true);
  };

  const handleLogout = () => {
    // Additional logout logic if needed
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-cyan-500 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading Kolekta...</p>
        </div>
      </div>
    );
  }

  // Show location permission page if access was denied
  if (permissionDenied && !loading) {
    return (
      <LocationPermissionPage
        onAllowLocation={requestLocation}
        onTryAgain={requestLocation}
      />
    );
  }

  return (
    <>
      {user ? (
        <Dashboard onLogout={handleLogout} />
      ) : (
        <LandingPage 
          onGetStarted={handleGetStarted}
          onLogin={handleLogin}
        />
      )}
      
      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        initialMode={authMode}
      />
      
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '12px',
            padding: '16px',
          },
        }}
      />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <AppContent />
      </LocationProvider>
    </AuthProvider>
  );
}

export default App;
