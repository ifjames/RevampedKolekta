import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { 
  Search, 
  Filter, 
  MapPin, 
  Star, 
  Shield, 
  Clock, 
  DollarSign,
  MessageSquare,
  RefreshCw,
  Users,
  Map
} from 'lucide-react';
import { ExchangePost } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { distance } from '@/lib/geohash';
import { formatTimeAgo } from '@/utils/timeUtils';
import { MapView } from './MapView';

interface FindExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPost: (post: ExchangePost) => void;
}

interface FilterOptions {
  maxDistance: number;
  giveType: 'all' | 'bill' | 'coins';
  needType: 'all' | 'bill' | 'coins';
  minAmount: number;
  maxAmount: number;
  verifiedOnly: boolean;
  minRating: number;
  sortBy: 'distance' | 'amount' | 'rating' | 'recent';
}

export function FindExchangeModal({ isOpen, onClose, onSelectPost }: FindExchangeModalProps) {
  const { user } = useAuth();
  const { location } = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [allPosts, setAllPosts] = useState<ExchangePost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<ExchangePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPostForMap, setSelectedPostForMap] = useState<ExchangePost | null>(null);
  const [showMapView, setShowMapView] = useState(false);
  
  const [filters, setFilters] = useState<FilterOptions>({
    maxDistance: 10, // km
    giveType: 'all',
    needType: 'all',
    minAmount: 0,
    maxAmount: 10000,
    verifiedOnly: false,
    minRating: 0,
    sortBy: 'distance'
  });

  // Fetch all active posts with sample data fallback
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);

    // Simplified query to avoid composite index
    const postsQuery = query(
      collection(db, 'posts'),
      limit(100)
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const posts: ExchangePost[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.userId !== user?.uid && data.status === 'active') {
          posts.push({
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate() || new Date(),
          } as ExchangePost);
        }
      });
      
      // If no real posts exist, add sample data for demonstration
      if (posts.length === 0 && location) {
        const samplePosts: ExchangePost[] = [
          {
            id: 'demo-1',
            userId: 'demo-user-1',
            userInfo: { 
              name: 'John Doe', 
              rating: 4.8, 
              verified: true,
              completedExchanges: 15
            },
            giveAmount: 1000,
            giveType: 'bill',
            needAmount: 1000,
            needType: 'coins',
            location: { 
              lat: location.lat + 0.002, 
              lng: location.lng + 0.001,
              geohash: 'demo1'
            },
            status: 'active',
            timestamp: new Date(Date.now() - 300000),
            notes: 'Need coins for commute'
          },
          {
            id: 'demo-2',
            userId: 'demo-user-2',
            userInfo: { 
              name: 'Maria Santos', 
              rating: 4.9, 
              verified: false,
              completedExchanges: 8
            },
            giveAmount: 1000,
            giveType: 'bill',
            needAmount: 1000,
            needType: 'coins',
            location: { 
              lat: location.lat - 0.001, 
              lng: location.lng + 0.003,
              geohash: 'demo2'
            },
            status: 'active',
            timestamp: new Date(Date.now() - 1800000),
            notes: 'commute'
          },
          {
            id: 'demo-3',
            userId: 'demo-user-3',
            userInfo: { 
              name: 'Carlos Rivera', 
              rating: 4.6, 
              verified: true,
              completedExchanges: 23
            },
            giveAmount: 1000,
            giveType: 'bill',
            needAmount: 1000,
            needType: 'coins',
            location: { 
              lat: location.lat + 0.004, 
              lng: location.lng - 0.002 
            },
            status: 'active',
            timestamp: new Date(Date.now() - 3600000),
            notes: 'For jeepney fare'
          }
        ];
        posts.push(...samplePosts);
      }
      
      setAllPosts(posts);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching posts:', error);
      // Show sample data on error
      if (location) {
        const samplePosts: ExchangePost[] = [
          {
            id: 'demo-1',
            userId: 'demo-user-1',
            userInfo: { 
              name: 'John Doe', 
              rating: 4.8, 
              verified: true,
              completedExchanges: 15
            },
            giveAmount: 1000,
            giveType: 'bill',
            needAmount: 1000,
            needType: 'coins',
            location: { 
              lat: location.lat + 0.002, 
              lng: location.lng + 0.001 
            },
            status: 'active',
            timestamp: new Date(),
            notes: 'Need coins for commute'
          }
        ];
        setAllPosts(samplePosts);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, user?.uid, location]);

  // Apply filters
  useEffect(() => {
    let filtered = [...allPosts];

    // Search term filter
    if (searchTerm) {
      filtered = filtered.filter(post => 
        post.userInfo?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Distance filter
    if (location) {
      filtered = filtered.filter(post => {
        const dist = distance(location.lat, location.lng, post.location.lat, post.location.lng);
        return dist <= filters.maxDistance;
      });
    }

    // Give type filter
    if (filters.giveType !== 'all') {
      filtered = filtered.filter(post => post.giveType === filters.giveType);
    }

    // Need type filter
    if (filters.needType !== 'all') {
      filtered = filtered.filter(post => post.needType === filters.needType);
    }

    // Amount filter
    filtered = filtered.filter(post => 
      post.giveAmount >= filters.minAmount && 
      post.giveAmount <= filters.maxAmount
    );

    // Verified filter
    if (filters.verifiedOnly) {
      filtered = filtered.filter(post => post.userInfo?.verified);
    }

    // Rating filter
    filtered = filtered.filter(post => 
      (post.userInfo?.rating || 0) >= filters.minRating
    );

    // Sort
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'distance':
          const distA = location ? distance(location.lat, location.lng, a.location.lat, a.location.lng) : 0;
          const distB = location ? distance(location.lat, location.lng, b.location.lat, b.location.lng) : 0;
          return distA - distB;
        case 'amount':
          return b.giveAmount - a.giveAmount;
        case 'rating':
          return (b.userInfo?.rating || 0) - (a.userInfo?.rating || 0);
        case 'recent':
          return b.timestamp.getTime() - a.timestamp.getTime();
        default:
          return 0;
      }
    });

    setFilteredPosts(filtered);
  }, [allPosts, searchTerm, filters, location]);

  const resetFilters = () => {
    setFilters({
      maxDistance: 10,
      giveType: 'all',
      needType: 'all',
      minAmount: 0,
      maxAmount: 10000,
      verifiedOnly: false,
      minRating: 0,
      sortBy: 'distance'
    });
    setSearchTerm('');
  };

  const handleSelectPost = (post: ExchangePost) => {
    onSelectPost(post);
    onClose();
  };

  return (
    <>
      {/* Main Find Exchange Dialog */}
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-6xl w-[95vw] h-[95vh] sm:h-auto glass-effect border-white/20 bg-blue-900/95 max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-6 border-b border-white/10 relative">
            <DialogTitle className="text-white text-2xl flex items-center pr-10">
              <Search className="mr-3 h-6 w-6" />
              Find Safe Exchange
            </DialogTitle>
            <DialogDescription className="text-blue-100 text-base mt-2">
              Search for nearby exchange opportunities and filter by your preferences
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 py-4">
            {/* Search and Filters */}
            <div className="lg:w-80 space-y-6">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-blue-300" />
                <Input
                  placeholder="Search by user name or notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 bg-white/10 border-white/20 text-white placeholder:text-blue-300 text-base"
                />
              </div>

              {/* Filter Toggle */}
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="w-full h-12 bg-white/10 border-white/20 text-white hover:bg-white/20 text-base"
              >
                <Filter className="mr-2 h-4 w-4" />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </Button>

              {/* Filters */}
              {showFilters && (
                <Card className="glass-dark border-white/10">
                  <CardContent className="p-6 space-y-6">
                    {/* Distance Filter */}
                    <div className="space-y-3">
                      <Label className="text-white text-sm font-medium">Max Distance: {filters.maxDistance}km</Label>
                      <Slider
                        value={[filters.maxDistance]}
                        onValueChange={(value) => setFilters(prev => ({ ...prev, maxDistance: value[0] }))}
                        max={50}
                        min={1}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    {/* Amount Range */}
                    <div className="space-y-3">
                      <Label className="text-white text-sm font-medium">Amount Range</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-blue-200 text-xs">Min Amount</Label>
                          <Input
                            type="number"
                            value={filters.minAmount}
                            onChange={(e) => setFilters(prev => ({ ...prev, minAmount: Number(e.target.value) }))}
                            className="h-10 bg-white/10 border-white/20 text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-blue-200 text-xs">Max Amount</Label>
                          <Input
                            type="number"
                            value={filters.maxAmount}
                            onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: Number(e.target.value) }))}
                            className="h-10 bg-white/10 border-white/20 text-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Type Filters */}
                    <div className="space-y-3">
                      <Label className="text-white text-sm font-medium">Exchange Types</Label>
                      <div className="grid grid-cols-1 gap-3">
                        <div className="space-y-2">
                          <Label className="text-blue-200 text-xs">Give Type</Label>
                          <Select value={filters.giveType} onValueChange={(value) => setFilters(prev => ({ ...prev, giveType: value as any }))}>
                            <SelectTrigger className="h-10 bg-white/10 border-white/20 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Types</SelectItem>
                              <SelectItem value="bill">Bills</SelectItem>
                              <SelectItem value="coins">Coins</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-blue-200 text-xs">Need Type</Label>
                          <Select value={filters.needType} onValueChange={(value) => setFilters(prev => ({ ...prev, needType: value as any }))}>
                            <SelectTrigger className="h-10 bg-white/10 border-white/20 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Types</SelectItem>
                              <SelectItem value="bill">Bills</SelectItem>
                              <SelectItem value="coins">Coins</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Sort By */}
                    <div className="space-y-2">
                      <Label className="text-white text-sm font-medium">Sort By</Label>
                      <Select value={filters.sortBy} onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value as any }))}>
                        <SelectTrigger className="h-10 bg-white/10 border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="distance">Distance</SelectItem>
                          <SelectItem value="amount">Amount</SelectItem>
                          <SelectItem value="rating">Rating</SelectItem>
                          <SelectItem value="recent">Most Recent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Additional Options */}
                    <div className="space-y-4 pt-4 border-t border-white/10">
                      <div className="flex items-center justify-between">
                        <Label className="text-white text-sm">Verified users only</Label>
                        <Switch
                          checked={filters.verifiedOnly}
                          onCheckedChange={(checked) => setFilters(prev => ({ ...prev, verifiedOnly: checked }))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-white text-sm">Minimum Rating</Label>
                        <Select value={filters.minRating.toString()} onValueChange={(value) => setFilters(prev => ({ ...prev, minRating: Number(value) }))}>
                          <SelectTrigger className="h-10 bg-white/10 border-white/20 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Any Rating</SelectItem>
                            <SelectItem value="3">3.0+ Stars</SelectItem>
                            <SelectItem value="4">4.0+ Stars</SelectItem>
                            <SelectItem value="4.5">4.5+ Stars</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Reset Filters Button */}
                    <Button
                      variant="outline"
                      onClick={resetFilters}
                      className="w-full h-10 bg-white/5 border-white/20 text-blue-200 hover:bg-white/10"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reset Filters
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {/* Results Header */}
              <div className="flex items-center justify-between sticky top-0 bg-blue-900/95 backdrop-blur-sm p-2 rounded-lg border border-white/10">
                <div className="text-white font-medium">
                  {loading ? 'Searching...' : `${filteredPosts.length} exchange${filteredPosts.length !== 1 ? 's' : ''} found`}
                </div>
                {filteredPosts.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={resetFilters}
                    className="text-blue-200 hover:text-white hover:bg-white/10"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                )}
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="text-blue-200 text-lg">Finding exchanges...</div>
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-blue-300 mx-auto mb-4" />
                  <div className="text-blue-200 mb-2 text-lg">No exchanges found</div>
                  <div className="text-blue-300">Try adjusting your filters or search terms</div>
                </div>
              ) : (
                filteredPosts.map((post) => {
                  const dist = location ? distance(location.lat, location.lng, post.location.lat, post.location.lng) : 0;
                  return (
                    <Card key={post.id} className="glass-dark border-white/10 hover:border-white/20 transition-all duration-200 cursor-pointer hover:scale-[1.02]">
                      <CardContent className="p-6" onClick={() => handleSelectPost(post)}>
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-bold">
                                {post.userInfo?.name?.charAt(0) || 'U'}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-white font-medium text-base">{post.userInfo?.name || 'User'}</span>
                                {post.userInfo?.verified && (
                                  <Shield className="h-4 w-4 text-green-400" />
                                )}
                              </div>
                              <div className="flex items-center space-x-3 text-sm text-blue-200">
                                <div className="flex items-center space-x-1">
                                  <Star className="h-3 w-3" />
                                  <span>{(post.userInfo?.rating || 0).toFixed(1)}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <MapPin className="h-3 w-3" />
                                  <span>{dist.toFixed(1)}km away</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-blue-200 flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatTimeAgo(post.timestamp)}
                            </div>
                          </div>
                        </div>

                        {/* Exchange Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                          <div className="p-3 bg-green-500/5 rounded-lg border border-green-500/10">
                            <div className="text-green-300 font-medium flex items-center mb-1">
                              <DollarSign className="h-4 w-4 mr-1" />
                              Gives
                            </div>
                            <div className="text-white text-lg font-bold">₱{post.giveAmount}</div>
                            <div className="text-green-200 text-sm">{post.giveType}</div>
                          </div>
                          <div className="p-3 bg-blue-500/5 rounded-lg border border-blue-500/10">
                            <div className="text-blue-300 font-medium flex items-center mb-1">
                              <DollarSign className="h-4 w-4 mr-1" />
                              Needs
                            </div>
                            <div className="text-white text-lg font-bold">₱{post.needAmount}</div>
                            <div className="text-blue-200 text-sm">{post.needType}</div>
                          </div>
                        </div>

                        {/* Notes */}
                        {post.notes && (
                          <div className="p-3 bg-white/5 rounded-lg border border-white/10 mb-4">
                            <p className="text-blue-100">{post.notes}</p>
                          </div>
                        )}

                        {/* Tags */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          <Badge variant="outline" className="text-green-300 border-green-300/30 bg-green-500/5">
                            {post.giveType === 'bill' ? '💵' : '🪙'} {post.giveType}
                          </Badge>
                          <Badge variant="outline" className="text-blue-300 border-blue-300/30 bg-blue-500/5">
                            Wants {post.needType === 'bill' ? '💵' : '🪙'}
                          </Badge>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button
                            variant="outline"
                            className="flex-1 h-11 bg-white/10 text-white border-white/30 hover:bg-white/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPostForMap(post);
                              setShowMapView(true);
                            }}
                          >
                            <Map className="h-4 w-4 mr-2" />
                            View Location
                          </Button>
                          <Button
                            className="flex-1 h-11 bg-blue-500 hover:bg-blue-600 text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectPost(post);
                            }}
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Request Exchange
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>

            {/* Results Summary */}
            <div className="text-center pt-4 border-t border-white/10">
              <div className="text-blue-200 text-sm">
                {filteredPosts.length} exchange{filteredPosts.length !== 1 ? 's' : ''} found
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Map View Dialog */}
      <Dialog open={showMapView} onOpenChange={setShowMapView}>
        <DialogContent className="max-w-4xl h-[80vh] p-0 glass-effect border-white/20">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-white flex items-center">
              <Map className="h-5 w-5 mr-2" />
              {selectedPostForMap?.userInfo?.name || 'User'}'s Location
            </DialogTitle>
            <DialogDescription className="text-blue-200">
              View the exact location where this exchange is available
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 p-6 pt-4">
            {selectedPostForMap && (
              <div className="h-full rounded-lg overflow-hidden border border-white/20">
                <MapView
                  posts={[selectedPostForMap]}
                  selectedPost={selectedPostForMap}
                  onPostSelect={() => {}}
                  showUserLocation={true}
                />
              </div>
            )}
          </div>
          <div className="p-6 pt-0 border-t border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {selectedPostForMap && (
                  <>
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">
                          {selectedPostForMap.userInfo?.name?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div>
                        <div className="text-white font-medium">{selectedPostForMap.userInfo?.name || 'User'}</div>
                        <div className="text-blue-200 text-sm">
                          ₱{selectedPostForMap.giveAmount} {selectedPostForMap.giveType} → ₱{selectedPostForMap.needAmount} {selectedPostForMap.needType}
                        </div>
                      </div>
                    </div>
                    {location && (
                      <div className="text-blue-200 text-sm">
                        📍 {distance(location.lat, location.lng, selectedPostForMap.location.lat, selectedPostForMap.location.lng).toFixed(1)}km away
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={() => setShowMapView(false)}
                  variant="outline"
                  className="bg-white/10 text-white border-white/30 hover:bg-white/20"
                >
                  Close Map
                </Button>
                <Button
                  onClick={() => {
                    if (selectedPostForMap) {
                      onSelectPost(selectedPostForMap);
                      setShowMapView(false);
                      onClose();
                    }
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Request Exchange
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}