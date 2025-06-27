// Simple geohash implementation for proximity matching
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export function encode(lat: number, lng: number, precision: number = 5): string {
  let geohash = '';
  let bits = 0;
  let bit = 0;
  let even = true;
  
  let latRange = [-90.0, 90.0];
  let lngRange = [-180.0, 180.0];
  
  while (geohash.length < precision) {
    if (even) {
      const mid = (lngRange[0] + lngRange[1]) / 2;
      if (lng >= mid) {
        bits = (bits << 1) + 1;
        lngRange[0] = mid;
      } else {
        bits = bits << 1;
        lngRange[1] = mid;
      }
    } else {
      const mid = (latRange[0] + latRange[1]) / 2;
      if (lat >= mid) {
        bits = (bits << 1) + 1;
        latRange[0] = mid;
      } else {
        bits = bits << 1;
        latRange[1] = mid;
      }
    }
    
    even = !even;
    bit++;
    
    if (bit === 5) {
      geohash += BASE32[bits];
      bits = 0;
      bit = 0;
    }
  }
  
  return geohash;
}

export function decode(geohash: string): { lat: number; lng: number } {
  let even = true;
  let latRange = [-90.0, 90.0];
  let lngRange = [-180.0, 180.0];
  
  for (const char of geohash) {
    const cd = BASE32.indexOf(char);
    
    for (let i = 4; i >= 0; i--) {
      const bit = (cd >> i) & 1;
      
      if (even) {
        const mid = (lngRange[0] + lngRange[1]) / 2;
        if (bit === 1) {
          lngRange[0] = mid;
        } else {
          lngRange[1] = mid;
        }
      } else {
        const mid = (latRange[0] + latRange[1]) / 2;
        if (bit === 1) {
          latRange[0] = mid;
        } else {
          latRange[1] = mid;
        }
      }
      
      even = !even;
    }
  }
  
  return {
    lat: (latRange[0] + latRange[1]) / 2,
    lng: (lngRange[0] + lngRange[1]) / 2
  };
}

export function distance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getNeighbors(geohash: string): string[] {
  // Get neighboring geohashes for proximity search
  const { lat, lng } = decode(geohash);
  const precision = geohash.length;
  const step = 0.001; // Adjust based on precision needed
  
  return [
    encode(lat + step, lng, precision),     // North
    encode(lat - step, lng, precision),     // South
    encode(lat, lng + step, precision),     // East
    encode(lat, lng - step, precision),     // West
    encode(lat + step, lng + step, precision), // Northeast
    encode(lat + step, lng - step, precision), // Northwest
    encode(lat - step, lng + step, precision), // Southeast
    encode(lat - step, lng - step, precision), // Southwest
  ];
}
