import { useState } from 'react';
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
  Navigation
} from 'lucide-react';

interface LocationPermissionPageProps {
  onAllowLocation: () => void;
  onTryAgain: () => void;
}

export function LocationPermissionPage({ onAllowLocation, onTryAgain }: LocationPermissionPageProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-lg"
      >
        <Card className="glass-effect border-white/20">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto bg-red-500 rounded-full p-4 w-16 h-16 mb-4">
              <MapPin className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-white text-2xl mb-2">Location Access Required</CardTitle>
            <p className="text-blue-200 text-sm">
              Kolekta needs your location to find safe exchange partners nearby and ensure secure transactions.
            </p>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Why We Need Location */}
            <div className="space-y-4">
              <h3 className="text-white font-semibold flex items-center">
                <Shield className="h-5 w-5 text-green-400 mr-2" />
                Why Location is Essential
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-start space-x-3 bg-white/5 p-3 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white text-sm font-medium">Safe Partner Matching</p>
                    <p className="text-blue-200 text-xs">Find verified users within walking distance for secure exchanges</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 bg-white/5 p-3 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white text-sm font-medium">Safe Zone Recommendations</p>
                    <p className="text-blue-200 text-xs">Discover verified public spaces like malls and banks near you</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 bg-white/5 p-3 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white text-sm font-medium">Risk Prevention</p>
                    <p className="text-blue-200 text-xs">Prevent fraud by ensuring all parties are in legitimate locations</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy Protection */}
            <div className="bg-blue-900/30 border border-blue-400/30 rounded-lg p-4">
              <h4 className="text-white font-medium flex items-center mb-2">
                <Lock className="h-4 w-4 text-blue-400 mr-2" />
                Your Privacy is Protected
              </h4>
              <div className="space-y-2 text-blue-200 text-xs">
                <div className="flex items-center">
                  <Eye className="h-3 w-3 mr-2" />
                  <span>Location is only shared when you create an exchange post</span>
                </div>
                <div className="flex items-center">
                  <Eye className="h-3 w-3 mr-2" />
                  <span>Exact coordinates are never revealed to other users</span>
                </div>
                <div className="flex items-center">
                  <Eye className="h-3 w-3 mr-2" />
                  <span>Only approximate distance is shown (within 100m radius)</span>
                </div>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-red-900/30 border border-red-400/30 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-100 text-sm font-medium">Cannot Continue Without Location</p>
                  <p className="text-red-200 text-xs">
                    Kolekta requires location access to ensure safe cash exchanges. Without this, we cannot verify user proximity or recommend safe meetup locations.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={onAllowLocation}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
              >
                <Navigation className="h-4 w-4 mr-2" />
                Allow Location Access
              </Button>

              <Button
                onClick={onTryAgain}
                variant="outline"
                className="w-full bg-white/10 text-white border-white/30 hover:bg-white/20 hover:border-white/50"
              >
                Try Again
              </Button>
            </div>

            {/* How to Enable */}
            <div className="text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="text-blue-300 hover:text-white hover:bg-white/10 text-xs"
              >
                {showDetails ? 'Hide' : 'Show'} How to Enable Location
              </Button>
            </div>

            {showDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-white/5 rounded-lg p-4 space-y-3"
              >
                <h5 className="text-white font-medium text-sm">How to Enable Location:</h5>
                <div className="space-y-2 text-blue-200 text-xs">
                  <div className="flex items-start">
                    <span className="font-mono bg-white/10 px-1 rounded mr-2">1.</span>
                    <span>Look for the location icon in your browser's address bar</span>
                  </div>
                  <div className="flex items-start">
                    <span className="font-mono bg-white/10 px-1 rounded mr-2">2.</span>
                    <span>Click on it and select "Allow" for this site</span>
                  </div>
                  <div className="flex items-start">
                    <span className="font-mono bg-white/10 px-1 rounded mr-2">3.</span>
                    <span>Refresh the page and try again</span>
                  </div>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}