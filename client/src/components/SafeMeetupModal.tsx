import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  X,
  Shield,
  Clock,
  Users,
  Star,
  Navigation,
  Coffee,
  Building,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useLocation } from '@/contexts/LocationContext';
import { distance } from '@/lib/geohash';

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
  const [selectedType, setSelectedType] = useState<string>('all');
  const [safeLocations, setSafeLocations] = useState<SafeLocation[]>([]);

  // Generate safe locations based on user location
  const generateNearbyLocations = (userLoc: { lat: number; lng: number }): SafeLocation[] => [
    {
      id: '1',
      name: 'SM City Manila',
      type: 'mall',
      address: 'J. Abad Santos Street, Sampaloc, Manila',
      coordinates: { lat: 14.6042, lng: 120.9822 },
      operatingHours: '10:00 AM - 10:00 PM',
      safety_rating: 4.8,
      features: ['Security Guards', 'CCTV', 'Well-lit', 'Public Area'],
      verified: true
    },
    {
      id: '2',
      name: '7-Eleven Taft Avenue',
      type: 'convenience_store',
      address: '1234 Taft Avenue, Manila',
      coordinates: { lat: 14.5995, lng: 120.9842 },
      operatingHours: '24/7',
      safety_rating: 4.5,
      features: ['24/7 Open', 'CCTV', 'Staff Present'],
      verified: true
    },
    {
      id: '3',
      name: 'Starbucks Robinsons Manila',
      type: 'cafe',
      address: 'Robinsons Place Manila, Pedro Gil Street',
      coordinates: { lat: 14.5865, lng: 120.9897 },
      operatingHours: '6:00 AM - 12:00 AM',
      safety_rating: 4.7,
      features: ['Indoor Seating', 'WiFi', 'Security', 'Public Space'],
      verified: true
    },
    {
      id: '4',
      name: 'LRT Carriedo Station',
      type: 'terminal',
      address: 'Rizal Avenue, Santa Cruz, Manila',
      coordinates: { lat: 14.5979, lng: 120.9792 },
      operatingHours: '5:00 AM - 10:00 PM',
      safety_rating: 4.2,
      features: ['Transit Hub', 'Security Personnel', 'High Traffic'],
      verified: true
    },
    {
      id: '5',
      name: 'BDO Ermita Branch',
      type: 'bank',
      address: 'M.H. del Pilar Street, Ermita, Manila',
      coordinates: { lat: 14.5834, lng: 120.9854 },
      operatingHours: '9:00 AM - 5:00 PM (Mon-Fri)',
      safety_rating: 4.9,
      features: ['Bank Security', 'CCTV', 'ATM Area', 'Guards'],
      verified: true
    },
    {
      id: '6',
      name: 'Manila City Hall',
      type: 'government',
      address: 'Arroceros Street, Manila',
      coordinates: { lat: 14.5907, lng: 120.9774 },
      operatingHours: '8:00 AM - 5:00 PM (Mon-Fri)',
      safety_rating: 4.6,
      features: ['Government Building', 'High Security', 'Public Area'],
      verified: true
    }
  ];

  useEffect(() => {
    if (location) {
      const nearbyLocations = generateNearbyLocations(location);
      const locationsWithDistance = nearbyLocations.map((loc: SafeLocation) => ({
        ...loc,
        distance: distance(location.lat, location.lng, loc.coordinates.lat, loc.coordinates.lng)
      })).sort((a: SafeLocation, b: SafeLocation) => (a.distance || 0) - (b.distance || 0));
      
      setSafeLocations(locationsWithDistance);
    }
  }, [location]);

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
      case 'mall': return 'text-purple-400';
      case 'convenience_store': return 'text-green-400';
      case 'cafe': return 'text-yellow-400';
      case 'terminal': return 'text-blue-400';
      case 'bank': return 'text-emerald-400';
      case 'government': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const filteredLocations = safeLocations.filter(location => {
    const matchesSearch = location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         location.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || location.type === selectedType;
    return matchesSearch && matchesType;
  });

  const locationTypes = [
    { value: 'all', label: 'All Locations' },
    { value: 'mall', label: 'Malls' },
    { value: 'convenience_store', label: 'Convenience Stores' },
    { value: 'cafe', label: 'Cafes' },
    { value: 'terminal', label: 'Terminals' },
    { value: 'bank', label: 'Banks' },
    { value: 'government', label: 'Government Buildings' }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="glass-effect rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-white/10">
              <div className="flex items-center space-x-3">
                <Shield className="h-6 w-6 text-green-400" />
                <div>
                  <CardTitle className="text-white">Safe Meetup Locations</CardTitle>
                  <p className="text-blue-100 text-sm">Choose a verified safe location for your exchange</p>
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
                      className={`${
                        selectedType === type.value
                          ? 'bg-blue-500 text-white'
                          : 'text-white border-white/20 hover:bg-white/10'
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
                              className="bg-blue-500 hover:bg-blue-600 text-white ml-4"
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}