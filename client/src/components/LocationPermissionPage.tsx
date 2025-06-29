import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Shield, 
  Eye, 
  Lock, 
  CheckCircle, 
  AlertTriangle,
  Navigation,
  Smartphone,
  Monitor
} from 'lucide-react';

interface LocationPermissionPageProps {
  onAllowLocation: () => void;
  onTryAgain: () => void;
}

export function LocationPermissionPage({ onAllowLocation, onTryAgain }: LocationPermissionPageProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [platform, setPlatform] = useState<'browser' | 'app'>('browser');

  useEffect(() => {
    // Detect if running as PWA/standalone app
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                     (window.navigator as any).standalone || 
                     document.referrer.includes('android-app://');
    
    setIsStandalone(standalone);
    setPlatform(standalone ? 'app' : 'browser');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-cyan-500 flex items-center justify-center p-3">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md"
      >
        <Card className="glass-effect border-white/20">
          <CardHeader className="text-center pb-3 pt-4">
            <div className="mx-auto bg-red-500 rounded-full p-3 w-12 h-12 mb-3">
              <MapPin className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-white text-xl mb-2">Location Access Required</CardTitle>
            <div className="flex items-center justify-center space-x-2 mb-2">
              {platform === 'app' ? (
                <Smartphone className="h-4 w-4 text-blue-300" />
              ) : (
                <Monitor className="h-4 w-4 text-blue-300" />
              )}
              <p className="text-blue-200 text-xs">
                {platform === 'app' ? 'App location services required' : 'Browser location access required'}
              </p>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-4">
            {/* Compact Why We Need Location */}
            <div className="bg-white/5 rounded-lg p-3">
              <h3 className="text-white font-medium text-sm mb-2 flex items-center">
                <Shield className="h-4 w-4 text-green-400 mr-2" />
                Why Location is Essential
              </h3>
              <div className="space-y-1 text-blue-200 text-xs">
                <div className="flex items-center">
                  <CheckCircle className="h-3 w-3 text-green-400 mr-2 flex-shrink-0" />
                  <span>Find safe exchange partners nearby</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-3 w-3 text-green-400 mr-2 flex-shrink-0" />
                  <span>Recommend verified safe zones (malls, banks)</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-3 w-3 text-green-400 mr-2 flex-shrink-0" />
                  <span>Prevent fraud through proximity verification</span>
                </div>
              </div>
            </div>

            {/* Privacy Protection - Compact */}
            <div className="bg-blue-900/30 border border-blue-400/30 rounded-lg p-3">
              <h4 className="text-white font-medium text-sm flex items-center mb-2">
                <Lock className="h-4 w-4 text-blue-400 mr-2" />
                Privacy Protected
              </h4>
              <div className="space-y-1 text-blue-200 text-xs">
                <div className="flex items-center">
                  <Eye className="h-3 w-3 mr-2 flex-shrink-0" />
                  <span>Only approximate distance shown (~100m radius)</span>
                </div>
                <div className="flex items-center">
                  <Eye className="h-3 w-3 mr-2 flex-shrink-0" />
                  <span>Exact coordinates never shared</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <Button
                onClick={onAllowLocation}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                size="sm"
              >
                <Navigation className="h-4 w-4 mr-2" />
                Allow Location Access
              </Button>

              <Button
                onClick={onTryAgain}
                variant="outline"
                className="w-full bg-white/10 text-white border-white/30 hover:bg-white/20 hover:border-white/50"
                size="sm"
              >
                Try Again
              </Button>
            </div>

            {/* Platform-specific instructions */}
            <div className="text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="text-blue-300 hover:text-white hover:bg-white/10 text-xs"
              >
                {showDetails ? 'Hide' : 'Show'} How to Enable
              </Button>
            </div>

            {showDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-white/5 rounded-lg p-3"
              >
                <h5 className="text-white font-medium text-xs mb-2">
                  {platform === 'app' ? 'Enable in App Settings:' : 'Enable in Browser:'}
                </h5>
                <div className="space-y-1 text-blue-200 text-xs">
                  {platform === 'app' ? (
                    <>
                      <div className="flex items-start">
                        <span className="font-mono bg-white/10 px-1 rounded mr-2 text-xs">1.</span>
                        <span>Open device Settings &gt; Privacy &amp; Security &gt; Location Services</span>
                      </div>
                      <div className="flex items-start">
                        <span className="font-mono bg-white/10 px-1 rounded mr-2 text-xs">2.</span>
                        <span>Find Kolekta app and enable location access</span>
                      </div>
                      <div className="flex items-start">
                        <span className="font-mono bg-white/10 px-1 rounded mr-2 text-xs">3.</span>
                        <span>Return to app and try again</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start">
                        <span className="font-mono bg-white/10 px-1 rounded mr-2 text-xs">1.</span>
                        <span>Look for location icon 📍 in browser address bar</span>
                      </div>
                      <div className="flex items-start">
                        <span className="font-mono bg-white/10 px-1 rounded mr-2 text-xs">2.</span>
                        <span>Click it and select "Allow" for this site</span>
                      </div>
                      <div className="flex items-start">
                        <span className="font-mono bg-white/10 px-1 rounded mr-2 text-xs">3.</span>
                        <span>Refresh page if needed</span>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}