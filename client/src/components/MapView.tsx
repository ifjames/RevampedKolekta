import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, X, Navigation, Users } from 'lucide-react';
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
    });

    // Add tile layer with dark theme to match app design
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    // Add click handler for location selection
    if (isLocationPicker && onLocationSelect) {
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        onLocationSelect({ lat, lng });
        
        // Add a temporary marker to show selection
        const marker = L.marker([lat, lng]).addTo(map);
        setTimeout(() => map.removeLayer(marker), 2000);
      });
    }

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
    }
  }, [location, isMapReady]);

  // Add user location marker
  useEffect(() => {
    if (!mapInstanceRef.current || !location || !showUserLocation || !isMapReady) return;

    const userIcon = L.divIcon({
      html: `
        <div style="
          width: 20px; 
          height: 20px; 
          background: #3b82f6; 
          border: 3px solid white; 
          border-radius: 50%; 
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          position: relative;
        ">
          <div style="
            position: absolute;
            top: -15px;
            left: -15px;
            width: 50px;
            height: 50px;
            background: rgba(59, 130, 246, 0.2);
            border-radius: 50%;
            animation: pulse 2s infinite;
          "></div>
        </div>
      `,
      className: 'user-location-marker',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    const userMarker = L.marker([location.lat, location.lng], { icon: userIcon })
      .addTo(mapInstanceRef.current)
      .bindPopup('Your Location');

    return () => {
      userMarker.remove();
    };
  }, [location, showUserLocation, isMapReady]);

  // Add exchange post markers
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    posts.forEach((post) => {
      const isSelected = selectedPost?.id === post.id;
      const dist = location ? distance(location.lat, location.lng, post.location.lat, post.location.lng) : 0;
      
      const markerIcon = L.divIcon({
        html: `
          <div style="
            width: 32px; 
            height: 32px; 
            background: ${isSelected ? '#10b981' : '#ef4444'}; 
            border: 3px solid white; 
            border-radius: 50%; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 12px;
            cursor: pointer;
            transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'};
            transition: transform 0.2s ease;
          ">
            ₱
          </div>
        `,
        className: 'exchange-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([post.location.lat, post.location.lng], { icon: markerIcon })
        .addTo(mapInstanceRef.current!)
        .on('click', () => {
          onPostSelect?.(post);
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

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
    };
  }, [posts, selectedPost, location, isMapReady, onPostSelect]);

  const centerOnUser = () => {
    if (mapInstanceRef.current && location) {
      mapInstanceRef.current.setView([location.lat, location.lng], 16);
    }
  };

  return (
    <div className="relative h-full w-full">
      <div ref={mapRef} className="h-full w-full rounded-lg overflow-hidden" />
      
      {/* Map Controls */}
      <div className="absolute top-4 right-4 space-y-2">
        {location && (
          <Button
            onClick={centerOnUser}
            size="sm"
            className="glass-effect text-white hover:bg-white/20 border-white/20"
            variant="outline"
          >
            <Navigation className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Selected Post Info */}
      {selectedPost && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute bottom-4 left-4 right-4"
        >
          <Card className="glass-effect border-white/20">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-red-400" />
                  <span className="text-white font-medium">Exchange Details</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onPostSelect?.(null as any)}
                  className="text-white hover:bg-white/10 p-1"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <Badge variant="outline" className="text-green-400 border-green-400/50 mb-1">
                    Give
                  </Badge>
                  <p className="text-white font-bold">₱{selectedPost.giveAmount}</p>
                  <p className="text-blue-100 text-sm capitalize">{selectedPost.giveType}</p>
                </div>
                <div>
                  <Badge variant="outline" className="text-blue-400 border-blue-400/50 mb-1">
                    Need
                  </Badge>
                  <p className="text-white font-bold">₱{selectedPost.needAmount}</p>
                  <p className="text-blue-100 text-sm capitalize">{selectedPost.needType}</p>
                </div>
              </div>

              {selectedPost.needBreakdown && selectedPost.needBreakdown.length > 0 && (
                <div className="mb-3">
                  <p className="text-blue-100 text-sm">
                    <span className="font-medium">Breakdown:</span> {selectedPost.needBreakdown.join(' + ')}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center text-blue-100 text-sm">
                  <Users className="h-4 w-4 mr-1" />
                  <span>{selectedPost.userInfo?.name || 'Anonymous'}</span>
                  {selectedPost.userInfo?.verified && (
                    <Badge className="ml-2 bg-green-500 text-white text-xs">Verified</Badge>
                  )}
                </div>
                {location && (
                  <span className="text-blue-100 text-sm">
                    {distance(location.lat, location.lng, selectedPost.location.lat, selectedPost.location.lng).toFixed(1)}km away
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {!isMapReady && (
        <div className="absolute inset-0 bg-blue-900/90 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
            <p className="text-white text-sm">Loading map...</p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}