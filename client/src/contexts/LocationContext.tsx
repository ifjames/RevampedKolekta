import React, { createContext, useContext, useEffect, useState } from 'react';
import { Location } from '@/types';
import { useGeolocation } from '@/hooks/useGeolocation';
import { toastError, toastInfo } from '@/utils/notifications';

interface LocationContextType {
  location: Location | null;
  error: string | null;
  loading: boolean;
  requestLocation: () => void;
  hasPermission: boolean;
  permissionDenied: boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}

interface LocationProviderProps {
  children: React.ReactNode;
}

export function LocationProvider({ children }: LocationProviderProps) {
  const { location, error, loading, getCurrentLocation } = useGeolocation();
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionRequested, setPermissionRequested] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      toastError('Geolocation is not supported by this browser');
      return;
    }

    // Auto-request location on first load
    if (!permissionRequested) {
      setPermissionRequested(true);
      requestLocation();
    }
  }, []);

  useEffect(() => {
    if (location) {
      setHasPermission(true);
    }
  }, [location]);

  useEffect(() => {
    if (error) {
      setHasPermission(false);
      if (error.includes('denied')) {
        setPermissionDenied(true);
        toastError('Location access is needed to find nearby exchanges');
      }
    }
  }, [error]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      toastError('Geolocation is not supported');
      return;
    }

    setPermissionDenied(false); // Reset permission denied state when trying again
    getCurrentLocation();
  };

  const value: LocationContextType = {
    location,
    error,
    loading,
    requestLocation,
    hasPermission,
    permissionDenied,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}
