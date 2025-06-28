import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  X, 
  MapPin, 
  Clock, 
  Star, 
  Navigation,
  Building,
  Zap,
  Coffee,
  Users
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
  const { location } = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [safeLocations, setSafeLocations] = useState<SafeLocation[]>([]);

  // Distance calculation function
  const distance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const generateNearbyLocations = (userLoc: { lat: number; lng: number }) => {
    // Batangas Area Locations
    const batangasLocations: SafeLocation[] = [
      {
        id: 'b1',
        name: 'SM City Batangas',
        type: 'mall',
        address: 'Pastor M. Recto Ave, Batangas City',
        coordinates: { lat: 13.7565, lng: 121.0583 },
        operatingHours: '10:00 AM - 9:00 PM',
        safety_rating: 4.8,
        features: ['Security Guards', 'CCTV', 'Food Court', 'ATM'],
        verified: true
      },
      {
        id: 'b2',
        name: 'Batangas City Hall',
        type: 'government',
        address: 'Rizal Avenue, Batangas City',
        coordinates: { lat: 13.7567, lng: 121.0584 },
        operatingHours: '8:00 AM - 5:00 PM (Mon-Fri)',
        safety_rating: 4.9,
        features: ['High Security', 'Government Building', 'Public Area'],
        verified: true
      },
      {
        id: 'b3',
        name: 'Jollibee Batangas Grand Terminal',
        type: 'cafe',
        address: 'Grand Terminal, Batangas City',
        coordinates: { lat: 13.7575, lng: 121.0590 },
        operatingHours: '6:00 AM - 11:00 PM',
        safety_rating: 4.5,
        features: ['24/7 Security', 'Well-lit Area', 'Public Space'],
        verified: true
      },
      {
        id: 'b4',
        name: 'BDO Batangas Main',
        type: 'bank',
        address: 'P. Burgos Street, Batangas City',
        coordinates: { lat: 13.7560, lng: 121.0580 },
        operatingHours: '9:00 AM - 4:00 PM (Mon-Fri)',
        safety_rating: 4.9,
        features: ['Bank Security', 'ATM Area', 'CCTV Monitoring'],
        verified: true
      }
    ];

    // Manila Area Locations
    const manilaLocations: SafeLocation[] = [
      {
        id: 'm1',
        name: 'SM Mall of Asia',
        type: 'mall',
        address: 'Seaside Blvd, Pasay City',
        coordinates: { lat: 14.5352, lng: 120.9822 },
        operatingHours: '10:00 AM - 10:00 PM',
        safety_rating: 4.8,
        features: ['24/7 Security', 'CCTV', 'Food Court', 'Well-lit'],
        verified: true
      },
      {
        id: 'm2',
        name: 'Ayala Museum',
        type: 'government',
        address: 'Makati Avenue, Makati City',
        coordinates: { lat: 14.5547, lng: 121.0244 },
        operatingHours: '9:00 AM - 6:00 PM (Tue-Sun)',
        safety_rating: 4.7,
        features: ['Museum Security', 'Public Area', 'Well-maintained'],
        verified: true
      },
      {
        id: 'm3',
        name: 'Starbucks Greenbelt',
        type: 'cafe',
        address: 'Greenbelt 3, Makati City',
        coordinates: { lat: 14.5516, lng: 121.0227 },
        operatingHours: '6:00 AM - 12:00 AM',
        safety_rating: 4.7,
        features: ['Indoor Seating', 'WiFi', 'Security', 'Public Space'],
        verified: true
      }
    ];

    // Return locations based on proximity - prioritize closer areas
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
      })).filter((loc: SafeLocation) => (loc.distance || 0) <= 10) // Only show locations within 10km
        .sort((a: SafeLocation, b: SafeLocation) => (a.distance || 0) - (b.distance || 0));
      
      setSafeLocations(locationsWithDistance);
    } else {
      // If no location, show empty state or request location
      setSafeLocations([]);
    }
  }, [location, userLocation]);

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
      case 'terminal': return 'text-purple-400';
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

  const filteredLocations = useMemo(() => {
    return safeLocations.filter(location => {
      const matchesType = selectedType === 'all' || location.type === selectedType;
      const matchesSearch = location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           location.address.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [safeLocations, selectedType, searchQuery]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="glass-effect border-white/20">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-green-500 rounded-full p-2">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-white">Safe Meetup Locations</CardTitle>
                  <p className="text-blue-200 text-sm">Choose a verified safe location for your exchange</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>

            <CardContent className="p-6">
              {/* Search and Filter */}
              <div className="space-y-4 mb-6">
                <Input
                  placeholder="Search locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder-blue-200"
                />
                
                <div className="flex flex-wrap gap-2">
                  {locationTypes.map((type) => (
                    <Button
                      key={type.value}
                      variant={selectedType === type.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedType(type.value)}
                      className={`transition-all duration-200 ${
                        selectedType === type.value
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-400 shadow-lg shadow-blue-500/25'
                          : 'bg-white/10 text-white border-white/30 hover:bg-white/20 hover:border-white/50 hover:text-white'
                      }`}
                    >
                      {type.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Safety Tips */}
              <div className="bg-green-900/30 border border-green-400/30 rounded-lg p-3 mb-6">
                <div className="flex items-start space-x-2">
                  <Shield className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-green-100 text-sm font-medium">Safety Guidelines</p>
                    <p className="text-green-200 text-xs">
                      • Meet during operating hours • Stay in public areas • Trust your instincts • Bring exact amounts
                    </p>
                  </div>
                </div>
              </div>

              {/* No Location State */}
              {!location && !userLocation && (
                <div className="text-center py-8">
                  <div className="bg-yellow-900/30 border border-yellow-400/30 rounded-lg p-6">
                    <MapPin className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                    <h3 className="text-white font-semibold mb-2">Location Access Required</h3>
                    <p className="text-yellow-200 text-sm mb-4">
                      We need your location to show nearby safe meetup spots within 10km of you.
                    </p>
                    <Button
                      onClick={() => window.location.reload()}
                      className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      Enable Location
                    </Button>
                  </div>
                </div>
              )}

              {/* Locations List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredLocations.length > 0 ? (
                  filteredLocations.map((location) => (
                    <motion.div
                      key={location.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="cursor-pointer"
                      onClick={() => onLocationSelect(location)}
                    >
                      <Card className="glass-dark border-white/10 hover:bg-white/5 transition-all duration-200">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3 flex-1">
                              <div className={`${getTypeColor(location.type)} mt-1`}>
                                {getTypeIcon(location.type)}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <h3 className="text-white font-medium">{location.name}</h3>
                                  {location.verified && (
                                    <Badge className="bg-green-500 text-white text-xs">
                                      <Shield className="mr-1 h-3 w-3" />
                                      Verified
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-blue-100 text-sm mb-2">{location.address}</p>
                                
                                <div className="flex items-center space-x-4 text-xs text-blue-200 mb-2">
                                  <div className="flex items-center">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {location.operatingHours}
                                  </div>
                                  <div className="flex items-center">
                                    <Star className="h-3 w-3 mr-1 text-yellow-400" />
                                    {location.safety_rating}
                                  </div>
                                  {location.distance && (
                                    <div className="flex items-center">
                                      <Navigation className="h-3 w-3 mr-1" />
                                      {location.distance.toFixed(1)}km
                                    </div>
                                  )}
                                </div>

                                <div className="flex flex-wrap gap-1">
                                  {location.features.slice(0, 3).map((feature, index) => (
                                    <Badge
                                      key={index}
                                      variant="outline"
                                      className="text-xs text-blue-300 border-blue-400/30"
                                    >
                                      {feature}
                                    </Badge>
                                  ))}
                                  {location.features.length > 3 && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs text-blue-300 border-blue-400/30"
                                    >
                                      +{location.features.length - 3} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <Button
                              size="sm"
                              className="bg-blue-500 hover:bg-blue-600 text-white border-0 shadow-lg ml-4"
                              onClick={(e) => {
                                e.stopPropagation();
                                onLocationSelect(location);
                              }}
                            >
                              Select
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <MapPin className="h-12 w-12 text-blue-300 mx-auto mb-3" />
                    <p className="text-white font-semibold">No locations found</p>
                    <p className="text-blue-100 text-sm">Try adjusting your search or filters</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}