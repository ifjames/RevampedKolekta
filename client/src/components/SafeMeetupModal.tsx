import { useState, useEffect, useMemo } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  MapPin, 
  Clock, 
  Star, 
  Navigation,
  Building,
  Zap,
  Coffee,
  Users,
  RefreshCw,
  Sliders
} from 'lucide-react';
import { useLocation } from '@/contexts/LocationContext';

interface SafeLocation {
  id: string;
  name: string;
  type: 'mall' | 'convenience_store' | 'terminal' | 'cafe' | 'bank' | 'government';
  address: string;
  coordinates: { lat: number; lng: number };
  operatingHours: string;
  safety_rating: number;
  features: string[];
  verified: boolean;
  distance?: number;
}

interface SafeMeetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (location: SafeLocation) => void;
  userLocation?: { lat: number; lng: number };
}

export function SafeMeetupModal({ isOpen, onClose, onLocationSelect, userLocation }: SafeMeetupModalProps) {
  const { location, requestLocation } = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [maxDistance, setMaxDistance] = useState(10); // Default 10km
  const [safeLocations, setSafeLocations] = useState<SafeLocation[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Distance calculation function
  function distance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c; // Distance in kilometers
    return d;
  }

  // Generate realistic safe locations based on user location
  const generateNearbyLocations = (userLoc: { lat: number; lng: number }): SafeLocation[] => {
    const manilaLocations: SafeLocation[] = [
      // Malls
      {
        id: 'sm-mall-of-asia',
        name: 'SM Mall of Asia',
        type: 'mall',
        address: 'Bay City, Pasay',
        coordinates: { lat: 14.5344, lng: 120.9830 },
        operatingHours: '10:00 AM - 10:00 PM',
        safety_rating: 4.8,
        features: ['Security Guards', 'CCTV Coverage', 'Well-lit Areas', 'Emergency Services'],
        verified: true
      },
      {
        id: 'robinsons-manila',
        name: 'Robinsons Place Manila',
        type: 'mall',
        address: 'Pedro Gil St, Malate',
        coordinates: { lat: 14.5808, lng: 120.9962 },
        operatingHours: '10:00 AM - 9:00 PM',
        safety_rating: 4.5,
        features: ['Security Guards', 'CCTV Coverage', 'Customer Service'],
        verified: true
      },
      // Banks
      {
        id: 'bpi-ayala',
        name: 'BPI Ayala Branch',
        type: 'bank',
        address: 'Ayala Ave, Makati',
        coordinates: { lat: 14.5547, lng: 121.0244 },
        operatingHours: '9:00 AM - 5:00 PM',
        safety_rating: 4.9,
        features: ['Armed Security', 'CCTV', 'Metal Detectors', 'Safe Environment'],
        verified: true
      },
      // Convenience Stores
      {
        id: '7eleven-bgc',
        name: '7-Eleven BGC Central',
        type: 'convenience_store',
        address: '5th Ave, BGC',
        coordinates: { lat: 14.5501, lng: 121.0451 },
        operatingHours: '24 Hours',
        safety_rating: 4.2,
        features: ['24/7 Open', 'Security Cameras', 'Well-lit'],
        verified: true
      },
      // Terminals
      {
        id: 'mrt-ayala',
        name: 'MRT Ayala Station',
        type: 'terminal',
        address: 'Ayala Ave, Makati',
        coordinates: { lat: 14.5498, lng: 121.0262 },
        operatingHours: '5:00 AM - 10:00 PM',
        safety_rating: 4.0,
        features: ['Police Presence', 'CCTV', 'Security Personnel'],
        verified: true
      }
    ];

    const batangasLocations: SafeLocation[] = [
      {
        id: 'sm-batangas',
        name: 'SM City Batangas',
        type: 'mall',
        address: 'Pallocan West, Batangas City',
        coordinates: { lat: 13.7565, lng: 121.0583 },
        operatingHours: '10:00 AM - 9:00 PM',
        safety_rating: 4.6,
        features: ['Security Guards', 'CCTV Coverage', 'Customer Service'],
        verified: true
      },
      {
        id: 'bpi-batangas',
        name: 'BPI Batangas Branch',
        type: 'bank',
        address: 'P. Burgos St, Batangas City',
        coordinates: { lat: 13.7576, lng: 121.0584 },
        operatingHours: '9:00 AM - 5:00 PM',
        safety_rating: 4.8,
        features: ['Armed Security', 'CCTV', 'Safe Environment'],
        verified: true
      }
    ];

    // Check if user is closer to Batangas or Manila
    const isInBatangas = userLoc.lat < 14.2 && userLoc.lat > 13.5;
    
    if (isInBatangas) {
      return [...batangasLocations, ...manilaLocations];
    } else {
      return [...manilaLocations, ...batangasLocations];
    }
  };

  useEffect(() => {
    const currentLocation = userLocation || location;
    if (currentLocation) {
      const userLoc = { lat: currentLocation.lat, lng: currentLocation.lng };
      const nearbyLocations = generateNearbyLocations(userLoc);
      const locationsWithDistance = nearbyLocations.map((loc: SafeLocation) => ({
        ...loc,
        distance: distance(userLoc.lat, userLoc.lng, loc.coordinates.lat, loc.coordinates.lng)
      })).filter((loc: SafeLocation) => (loc.distance || 0) <= maxDistance) // Filter by selected distance
        .sort((a: SafeLocation, b: SafeLocation) => (a.distance || 0) - (b.distance || 0));
      
      setSafeLocations(locationsWithDistance);
    } else {
      setSafeLocations([]);
    }
  }, [location, userLocation, maxDistance]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'mall': return <Building className="h-5 w-5" />;
      case 'convenience_store': return <Zap className="h-5 w-5" />;
      case 'cafe': return <Coffee className="h-5 w-5" />;
      case 'terminal': return <Users className="h-5 w-5" />;
      case 'bank': return <Shield className="h-5 w-5" />;
      case 'government': return <Building className="h-5 w-5" />;
      default: return <MapPin className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'mall': return 'text-blue-400';
      case 'convenience_store': return 'text-green-400';
      case 'cafe': return 'text-yellow-400';
      case 'terminal': return 'text-blue-400';
      case 'bank': return 'text-red-400';
      case 'government': return 'text-gray-400';
      default: return 'text-blue-400';
    }
  };

  const locationTypes = [
    { value: 'all', label: 'All Locations' },
    { value: 'mall', label: 'Malls' },
    { value: 'bank', label: 'Banks' },
    { value: 'cafe', label: 'Cafes' },
    { value: 'government', label: 'Government' },
    { value: 'terminal', label: 'Terminals' },
    { value: 'convenience_store', label: 'Stores' }
  ];

  const handleRefreshLocation = async () => {
    setIsRefreshing(true);
    try {
      await requestLocation();
    } catch (error) {
      console.error('Failed to refresh location:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredLocations = useMemo(() => {
    return safeLocations.filter(location => {
      const matchesType = selectedType === 'all' || location.type === selectedType;
      const matchesSearch = location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           location.address.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [safeLocations, selectedType, searchQuery]);

  const currentLocation = userLocation || location;
  const distanceOptions = [
    { value: 5, label: '5 km' },
    { value: 10, label: '10 km' },
    { value: 15, label: '15 km' },
    { value: 20, label: '20 km' },
    { value: 50, label: '50 km' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] max-w-md sm:max-w-2xl glass-effect border-white/20 bg-blue-900/95 max-h-[85vh] flex flex-col p-4">
        <DialogHeader>
          <DialogTitle className="text-white text-xl flex items-center">
            <div className="bg-green-500 rounded-full p-1 mr-2">
              <Shield className="h-4 w-4 text-white" />
            </div>
            Safe Locations
          </DialogTitle>
          <DialogDescription className="text-blue-100">
            Choose verified safe location for your exchange
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
          {/* Current Location Display */}
          {currentLocation && (
            <div className="bg-blue-900/30 border border-blue-400/30 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-blue-400" />
                  <div>
                    <p className="text-white text-xs font-medium">Current Location</p>
                    <p className="text-blue-200 text-xs">
                      {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleRefreshLocation}
                  disabled={isRefreshing}
                  size="sm"
                  variant="outline"
                  className="bg-white/10 text-white border-white/30 hover:bg-white/20 text-xs px-2 py-1"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="space-y-3">
            {/* Search */}
            <Input
              placeholder="Search locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/10 border-white/30 text-white placeholder-blue-200"
            />

            {/* Filter Row */}
            <div className="flex flex-wrap gap-2">
              {/* Distance Filter */}
              <div className="flex items-center space-x-2">
                <Sliders className="h-4 w-4 text-blue-400" />
                <select
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(Number(e.target.value))}
                  className="bg-blue-800/50 text-white border border-white/30 rounded px-2 py-1 text-xs"
                >
                  {distanceOptions.map((option) => (
                    <option key={option.value} value={option.value} className="bg-blue-900">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type Filter */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="bg-blue-800/50 text-white border border-white/30 rounded px-2 py-1 text-xs"
              >
                {locationTypes.map((type) => (
                  <option key={type.value} value={type.value} className="bg-blue-900">
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Location Results */}
          {!currentLocation ? (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-blue-400 mx-auto mb-4" />
              <p className="text-white font-medium mb-2">Location Permission Required</p>
              <p className="text-blue-200 text-sm mb-4">
                We need your location to show nearby safe locations
              </p>
              <Button
                onClick={requestLocation}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
              >
                Enable Location
              </Button>
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className="text-center py-8">
              <Navigation className="h-12 w-12 text-blue-400 mx-auto mb-4" />
              <p className="text-white font-medium mb-2">No Safe Locations Found</p>
              <p className="text-blue-200 text-sm mb-4">
                Try adjusting your distance filter or search terms
              </p>
              <Button
                onClick={() => {
                  setMaxDistance(50);
                  setSelectedType('all');
                  setSearchQuery('');
                }}
                variant="outline"
                className="bg-white/10 text-white border-white/30 hover:bg-white/20"
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLocations.map((location) => (
                <Card
                  key={location.id}
                  className="glass-dark border-white/10 hover:border-white/30 transition-all duration-200 cursor-pointer"
                  onClick={() => onLocationSelect(location)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`${getTypeColor(location.type)}`}>
                          {getTypeIcon(location.type)}
                        </div>
                        <div>
                          <h3 className="text-white font-medium text-sm">{location.name}</h3>
                          <p className="text-blue-200 text-xs">{location.address}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant="secondary"
                          className="bg-green-500/20 text-green-400 text-xs"
                        >
                          {location.distance?.toFixed(1)} km
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3 text-blue-400" />
                        <span className="text-blue-200">{location.operatingHours}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Star className="h-3 w-3 text-yellow-400 fill-current" />
                        <span className="text-white">{location.safety_rating}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mt-2">
                      {location.features.slice(0, 3).map((feature, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs border-white/20 text-blue-200"
                        >
                          {feature}
                        </Badge>
                      ))}
                      {location.features.length > 3 && (
                        <Badge
                          variant="outline"
                          className="text-xs border-white/20 text-blue-200"
                        >
                          +{location.features.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}