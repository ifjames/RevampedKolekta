import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, X, Navigation, Users, Handshake } from 'lucide-react';
import { useLocation } from '@/contexts/LocationContext';
import { ExchangePost } from '@/types';
import { distance } from '@/lib/geohash';

interface MapViewProps {
  posts: ExchangePost[];
  onPostSelect?: (post: ExchangePost) => void;
  selectedPost?: ExchangePost | null;
  showUserLocation?: boolean;
  onLocationSelect?: (location: { lat: number; lng: number }) => void;
  isLocationPicker?: boolean;
}

export function MapView({ posts, onPostSelect, selectedPost, showUserLocation = true, onLocationSelect, isLocationPicker = false }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const { location } = useLocation();
  const [isMapReady, setIsMapReady] = useState(false);
  const [selectedMapPost, setSelectedMapPost] = useState<ExchangePost | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Default to Manila if no location
    const defaultLat = location?.lat || 14.5995;
    const defaultLng = location?.lng || 120.9842;

    const map = L.map(mapRef.current, {
      center: [defaultLat, defaultLng],
      zoom: 15,
      zoomControl: true,
      preferCanvas: false,
      attributionControl: false,
    });

    // Use reliable tile provider
    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      subdomains: ['a', 'b', 'c'],
      maxZoom: 19,
      detectRetina: true,
      updateWhenIdle: false,
      keepBuffer: 2
    });

    tileLayer.addTo(map);
    
    // Add loading event handlers
    tileLayer.on('loading', () => {
      console.log('Map tiles loading...');
    });
    
    tileLayer.on('load', () => {
      console.log('Map tiles loaded successfully');
      map.invalidateSize();
    });
    
    tileLayer.on('tileerror', (error) => {
      console.warn('Tile loading error:', error);
    });

    // Force map to invalidate size after creation
    setTimeout(() => {
      if (map && map.getContainer() && map.getContainer().offsetWidth > 0) {
        try {
          map.invalidateSize();
        } catch (error) {
          console.warn('Map invalidateSize error:', error);
        }
      }
    }, 100);

    // Add click handler for location selection or closing UI
    map.on('click', (e) => {
      if (isLocationPicker && onLocationSelect) {
        const { lat, lng } = e.latlng;
        onLocationSelect({ lat, lng });
        
        // Add a temporary marker to show selection
        const marker = L.marker([lat, lng]).addTo(map);
        setTimeout(() => map.removeLayer(marker), 2000);
      } else {
        // Close the selected post UI when clicking on empty map areas
        setSelectedMapPost(null);
      }
    });

    mapInstanceRef.current = map;
    setIsMapReady(true);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map center when user location changes
  useEffect(() => {
    if (mapInstanceRef.current && location && isMapReady) {
      mapInstanceRef.current.setView([location.lat, location.lng], 15);
      // Invalidate size to ensure proper rendering
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 50);
    }
  }, [location, isMapReady]);

  // Force map resize when component becomes visible
  useEffect(() => {
    if (mapInstanceRef.current && isMapReady) {
      const resizeObserver = new ResizeObserver(() => {
        mapInstanceRef.current?.invalidateSize();
      });
      
      if (mapRef.current) {
        resizeObserver.observe(mapRef.current);
      }
      
      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [isMapReady]);

  // Add user location marker
  useEffect(() => {
    if (!mapInstanceRef.current || !location || !showUserLocation || !isMapReady) return;

    const userIcon = L.divIcon({
      html: `
        <div style="
          width: 24px; 
          height: 24px; 
          background: #3b82f6; 
          border: 4px solid white; 
          border-radius: 50%; 
          box-shadow: 0 3px 10px rgba(0,0,0,0.4);
          position: relative;
          z-index: 1000;
        ">
          <div style="
            position: absolute;
            top: -20px;
            left: -20px;
            width: 64px;
            height: 64px;
            background: rgba(59, 130, 246, 0.3);
            border-radius: 50%;
            animation: pulse 2s infinite;
            z-index: 999;
          "></div>
        </div>
      `,
      className: 'user-location-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const userMarker = L.marker([location.lat, location.lng], { 
      icon: userIcon,
      zIndexOffset: 1000
    })
      .addTo(mapInstanceRef.current)
      .bindPopup('<div style="color: #1f2937; font-weight: bold;">📍 Your Location</div>');

    return () => {
      userMarker.remove();
    };
  }, [location, showUserLocation, isMapReady]);

  // Add exchange post markers and safe locations
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    let postsToShow = [...posts];

    // Add exchange post markers
    postsToShow.forEach((post) => {
      const isSelected = selectedMapPost?.id === post.id;
      const dist = location ? distance(location.lat, location.lng, post.location.lat, post.location.lng) : 0;
      
      const markerIcon = L.divIcon({
        html: `
          <div style="
            width: 60px; 
            height: 45px; 
            background: ${isSelected ? '#10b981' : '#3b82f6'}; 
            border: 3px solid white; 
            border-radius: 12px; 
            box-shadow: 0 4px 16px rgba(0,0,0,0.6);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 12px;
            cursor: pointer;
            transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'};
            transition: all 0.2s ease;
            position: relative;
            z-index: 500;
            font-family: system-ui, -apple-system, sans-serif;
          ">
            <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 2px;">
              <img src="/kolekta-logo.png" 
                   style="width: 12px; height: 12px; margin-right: 3px;" />
              <span style="font-size: 13px; line-height: 1;">₱${post.giveAmount}</span>
            </div>
            <div style="font-size: 8px; line-height: 1; opacity: 0.9; text-transform: uppercase;">
              ${post.giveType === 'bill' ? 'Bills' : 'Coins'}
            </div>
          </div>
        `,
        className: 'exchange-marker',
        iconSize: [55, 40],
        iconAnchor: [27, 20],
      });

      const marker = L.marker([post.location.lat, post.location.lng], { icon: markerIcon })
        .addTo(mapInstanceRef.current!)
        .on('click', (e) => {
          e.originalEvent?.stopPropagation(); // Prevent map click event
          setSelectedMapPost(post);
        });

      const popupContent = `
        <div style="min-width: 200px; color: #1f2937;">
          <div style="font-weight: bold; margin-bottom: 8px;">Exchange Request</div>
          <div style="margin-bottom: 4px;">
            <span style="color: #10b981;">Give:</span> ₱${post.giveAmount} ${post.giveType}
          </div>
          <div style="margin-bottom: 4px;">
            <span style="color: #3b82f6;">Need:</span> ₱${post.needAmount} ${post.needType}
          </div>
          <div style="font-size: 12px; color: #6b7280;">
            ${dist.toFixed(1)}km away
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      markersRef.current.push(marker);
    });

    // Add real safe zone markers in Metro Manila area
    const currentLocation = location || { lat: 14.5995, lng: 120.9842 }; // Default to Manila
    
    const realSafeZones = [
      // Major Universities
      { name: 'University of the Philippines Manila', type: 'school', lat: 14.5776, lng: 120.9889, color: '#3b82f6' },
      { name: 'De La Salle University Manila', type: 'school', lat: 14.5647, lng: 120.9930, color: '#3b82f6' },
      { name: 'Polytechnic University of the Philippines', type: 'school', lat: 14.5986, lng: 121.0117, color: '#3b82f6' },
      
      // Major Shopping Malls
      { name: 'SM Mall of Asia', type: 'mall', lat: 14.5354, lng: 120.9819, color: '#8b5cf6' },
      { name: 'Robinsons Place Manila', type: 'mall', lat: 14.6042, lng: 120.9822, color: '#8b5cf6' },
      { name: 'SM City Manila', type: 'mall', lat: 14.5991, lng: 120.9822, color: '#8b5cf6' },
      
      // Banks
      { name: 'BDO Ermita Branch', type: 'bank', lat: 14.5833, lng: 120.9833, color: '#f59e0b' },
      { name: 'BPI Taft Avenue', type: 'bank', lat: 14.5647, lng: 120.9930, color: '#f59e0b' },
      { name: 'Metrobank Malate', type: 'bank', lat: 14.5724, lng: 120.9933, color: '#f59e0b' },
      
      // Government Buildings
      { name: 'Manila City Hall', type: 'government', lat: 14.5936, lng: 120.9713, color: '#10b981' },
      { name: 'Department of Health', type: 'government', lat: 14.5813, lng: 120.9850, color: '#10b981' },
      
      // 7-Eleven Stores (real locations)
      { name: '7-Eleven Taft Avenue', type: 'store', lat: 14.5701, lng: 120.9914, color: '#22c55e' },
      { name: '7-Eleven Ermita', type: 'store', lat: 14.5825, lng: 120.9845, color: '#22c55e' },
      { name: '7-Eleven UN Avenue', type: 'store', lat: 14.5789, lng: 120.9944, color: '#22c55e' },
    ];

    // Show all safe zones within 15km radius for better visibility
    const safeZones = realSafeZones.filter(zone => {
      const dist = distance(currentLocation.lat, currentLocation.lng, zone.lat, zone.lng);
      return dist <= 15; // Show zones within 15km for better coverage
    });

    console.log(`Found ${safeZones.length} safe zones near user location`);

    safeZones.forEach((zone) => {
      const iconMap: Record<string, string> = {
        'store': '🏪',
        'school': '🏫', 
        'mall': '🏬',
        'bank': '🏦',
        'government': '🏛️'
      };
      
      const safeZoneIcon = L.divIcon({
        html: `
          <div style="
            width: 32px; 
            height: 32px; 
            background: ${zone.color}; 
            border: 3px solid white; 
            border-radius: 6px; 
            box-shadow: 0 3px 10px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 16px;
            cursor: pointer;
            z-index: 600;
          ">
            ${iconMap[zone.type as keyof typeof iconMap] || '🏢'}
          </div>
        `,
        className: 'safe-zone-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const safeMarker = L.marker([zone.lat, zone.lng], { 
        icon: safeZoneIcon,
        zIndexOffset: 600
      })
        .addTo(mapInstanceRef.current!);

      const dist = distance(currentLocation.lat, currentLocation.lng, zone.lat, zone.lng);
      const safePopupContent = `
        <div style="min-width: 180px; color: #1f2937; font-family: system-ui;">
          <div style="font-weight: bold; margin-bottom: 4px; color: ${zone.color};">🛡️ Safe Zone</div>
          <div style="font-weight: 600; margin-bottom: 2px;">${zone.name}</div>
          <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 4px;">
            ${zone.type.replace('_', ' ')}
          </div>
          <div style="color: #3b82f6; font-size: 11px;">
            📍 ${dist.toFixed(1)}km away
          </div>
        </div>
      `;

      safeMarker.bindPopup(safePopupContent);
      markersRef.current.push(safeMarker);
      console.log(`Added safe zone marker: ${zone.name} at ${zone.lat}, ${zone.lng}`);
    });

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
    };
  }, [posts, selectedMapPost, location, isMapReady, onPostSelect, isLocationPicker]);

  const centerOnUser = () => {
    if (mapInstanceRef.current && location) {
      mapInstanceRef.current.setView([location.lat, location.lng], 16);
    }
  };

  return (
    <div className="relative h-full w-full">
      <div ref={mapRef} className="h-full w-full" />
      
      {/* Map Controls */}
      <div className="absolute top-4 right-4 flex flex-col space-y-2 z-[1000]">
        {location && (
          <Button
            onClick={centerOnUser}
            size="sm"
            className="bg-blue-500/90 hover:bg-blue-600 text-white shadow-lg backdrop-blur-sm border border-white/20"
            title="Center on my location"
          >
            <Navigation className="h-4 w-4" />
          </Button>
        )}
        <Button
          onClick={() => mapInstanceRef.current?.zoomIn()}
          size="sm"
          className="bg-white/20 hover:bg-white/30 text-white shadow-lg backdrop-blur-sm border border-white/30"
          title="Zoom in"
        >
          +
        </Button>
        <Button
          onClick={() => mapInstanceRef.current?.zoomOut()}
          size="sm"
          className="bg-white/20 hover:bg-white/30 text-white shadow-lg backdrop-blur-sm border border-white/30"
          title="Zoom out"
        >
          -
        </Button>
      </div>

      {/* Map Legend */}
      <div className="absolute top-4 left-4 z-[1000]">
        <Card className="bg-black/80 backdrop-blur-md border-gray-600">
          <CardContent className="p-3">
            <h4 className="text-white font-medium mb-2 text-sm">Legend</h4>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-black"></div>
                <span className="text-white font-medium">Your Location</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-5 h-3 bg-blue-500 rounded border-2 border-black flex items-center justify-center">
                  <img src="/kolekta-logo.png" alt="Exchange" className="w-3 h-3" />
                </div>
                <span className="text-white font-medium">Exchange Posts</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded border-2 border-black flex items-center justify-center text-[10px]">🏪</div>
                <span className="text-white font-medium">Safe Zones</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selected Post Info */}
      {selectedMapPost && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute bottom-4 left-4 right-4 z-[1000]"
        >
          <Card className="glass-effect border-white/20 shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {selectedMapPost.userInfo?.name?.[0] || 'U'}
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-lg">{selectedMapPost.userInfo?.name || 'Anonymous User'}</h3>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center">
                          <span className="text-yellow-400 text-sm">⭐</span>
                          <span className="text-white text-sm ml-1 font-medium">{selectedMapPost.userInfo?.rating || 0}</span>
                        </div>
                        {selectedMapPost.userInfo?.verified && (
                          <Badge className="bg-green-500/20 backdrop-blur-sm text-green-300 border-green-400/30">Verified</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="glass-dark rounded-lg p-3">
                      <p className="text-green-400 text-sm font-medium mb-1">Giving</p>
                      <p className="text-white font-semibold text-lg">₱{selectedMapPost.giveAmount} {selectedMapPost.giveType}</p>
                    </div>
                    <div className="glass-dark rounded-lg p-3">
                      <p className="text-blue-400 text-sm font-medium mb-1">Needs</p>
                      <p className="text-white font-semibold text-lg">₱{selectedMapPost.needAmount} {selectedMapPost.needType}</p>
                    </div>
                  </div>
                  {location && (
                    <div className="flex items-center space-x-2 glass-dark rounded-lg p-2">
                      <MapPin className="h-4 w-4 text-blue-400" />
                      <p className="text-white text-sm font-medium">{distance(location.lat, location.lng, selectedMapPost.location.lat, selectedMapPost.location.lng).toFixed(1)}km away</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col space-y-3 ml-4">
                  <Button
                    onClick={() => {
                      onPostSelect?.(selectedMapPost);
                      setSelectedMapPost(null); // Close UI after matching
                    }}
                    size="sm"
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg"
                  >
                    <Handshake className="h-4 w-4 mr-2" />
                    Match
                  </Button>
                  <Button
                    onClick={() => setSelectedMapPost(null)}
                    size="sm"
                    className="glass-dark text-white border-white/30 hover:bg-white/10 hover:border-white/50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}