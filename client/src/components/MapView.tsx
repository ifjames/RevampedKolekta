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
      map.invalidateSize();
    }, 100);

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

    // Add exchange post markers
    posts.forEach((post) => {
      const isSelected = selectedPost?.id === post.id;
      const dist = location ? distance(location.lat, location.lng, post.location.lat, post.location.lng) : 0;
      
      const currencyIcon = post.giveType === 'bill' ? '💵' : '🪙';
      const markerIcon = L.divIcon({
        html: `
          <div style="
            width: 45px; 
            height: 45px; 
            background: ${isSelected ? '#10b981' : '#ef4444'}; 
            border: 4px solid white; 
            border-radius: 50%; 
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 11px;
            cursor: pointer;
            transform: ${isSelected ? 'scale(1.3)' : 'scale(1)'};
            transition: transform 0.2s ease;
            position: relative;
            z-index: 500;
          ">
            <div style="font-size: 14px; line-height: 1;">${currencyIcon}</div>
            <div style="font-size: 9px; line-height: 1; text-shadow: 1px 1px 2px rgba(0,0,0,0.7);">₱${post.giveAmount}</div>
          </div>
        `,
        className: 'exchange-marker',
        iconSize: [45, 45],
        iconAnchor: [22, 22],
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

    // Add safe zone markers if user location is available
    if (location) {
      const safeZones = [
        { name: '7-Eleven', type: 'store', lat: location.lat + 0.005, lng: location.lng + 0.003, color: '#22c55e' },
        { name: 'AlfaMart', type: 'store', lat: location.lat - 0.003, lng: location.lng + 0.007, color: '#22c55e' },
        { name: 'University of Manila', type: 'school', lat: location.lat + 0.008, lng: location.lng - 0.004, color: '#3b82f6' },
        { name: 'SM City Center', type: 'mall', lat: location.lat - 0.006, lng: location.lng - 0.002, color: '#8b5cf6' },
        { name: 'BDO Bank', type: 'bank', lat: location.lat + 0.002, lng: location.lng - 0.008, color: '#f59e0b' },
      ];

      safeZones.forEach((zone) => {
        const safeZoneIcon = L.divIcon({
          html: `
            <div style="
              width: 24px; 
              height: 24px; 
              background: ${zone.color}; 
              border: 2px solid white; 
              border-radius: 4px; 
              box-shadow: 0 2px 6px rgba(0,0,0,0.2);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 10px;
              cursor: pointer;
            ">
              ${zone.type === 'store' ? '🏪' : zone.type === 'school' ? '🏫' : zone.type === 'mall' ? '🏬' : '🏦'}
            </div>
          `,
          className: 'safe-zone-marker',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const safeMarker = L.marker([zone.lat, zone.lng], { icon: safeZoneIcon })
          .addTo(mapInstanceRef.current!);

        const safePopupContent = `
          <div style="min-width: 150px; color: #1f2937;">
            <div style="font-weight: bold; margin-bottom: 4px; color: ${zone.color};">Safe Zone</div>
            <div style="margin-bottom: 2px;">${zone.name}</div>
            <div style="font-size: 12px; color: #6b7280; text-transform: capitalize;">
              ${zone.type}
            </div>
          </div>
        `;

        safeMarker.bindPopup(safePopupContent);
        markersRef.current.push(safeMarker);
      });
    }

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
      <div ref={mapRef} className="h-full w-full" />
      
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

      {/* Map Legend */}
      <div className="absolute top-4 left-4">
        <Card className="glass-effect border-white/20">
          <CardContent className="p-3">
            <h4 className="text-white font-medium mb-2 text-sm">Legend</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full border border-white"></div>
                <span className="text-white">Your Location</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded-full border border-white"></div>
                <span className="text-white">Exchange Request</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded border border-white text-center leading-none">🏪</div>
                <span className="text-white">Safe Zones</span>
              </div>
            </div>
          </CardContent>
        </Card>
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
        
        .leaflet-container {
          height: 100% !important;
          width: 100% !important;
          background: #f0f0f0 !important;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .leaflet-tile-pane {
          filter: none !important;
        }
        
        .leaflet-control-container {
          display: none;
        }
        
        .leaflet-marker-icon {
          z-index: 1000 !important;
        }
        
        .exchange-marker {
          z-index: 1000 !important;
        }
        
        .user-location-marker {
          z-index: 1001 !important;
        }
        
        .leaflet-tile {
          filter: none !important;
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}