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
  Map,
  ArrowLeftRight,
  Handshake
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
      

      
      setAllPosts(posts);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching posts:', error);
      setAllPosts([]);
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
        <DialogContent className="sm:max-w-2xl w-[95vw] h-[95vh] sm:h-auto glass-effect border-white/20 bg-blue-900/95 max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-6 border-b border-white/10 relative">
            <DialogTitle className="text-white text-2xl flex items-center pr-10">
              <Search className="mr-3 h-6 w-6" />
              Find Safe Exchange
            </DialogTitle>
            <DialogDescription className="text-blue-100 text-base mt-2">
              Search for nearby exchange opportunities and filter by your preferences
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-6 flex-1 min-h-0 py-4">
            {/* Search and Filters */}
            <div className="space-y-4">
              {/* Search and Filter Row */}
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-blue-300" />
                  <Input
                    placeholder="Search by name or notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-11 bg-white/10 border-white/20 text-white placeholder:text-blue-300"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="h-11 px-4 bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </div>

              {/* Compact Filters */}
              {showFilters && (
                <Card className="glass-dark border-white/10">
                  <CardContent className="p-4 space-y-4">
                    {/* Quick Filters Row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-white text-xs">Distance: {filters.maxDistance}km</Label>
                        <Slider
                          value={[filters.maxDistance]}
                          onValueChange={(value) => setFilters(prev => ({ ...prev, maxDistance: value[0] }))}
                          max={20}
                          min={1}
                          step={1}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label className="text-white text-xs">Sort By</Label>
                        <Select value={filters.sortBy} onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value as any }))}>
                          <SelectTrigger className="h-9 bg-white/10 border-white/20 text-white mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="distance">Distance</SelectItem>
                            <SelectItem value="amount">Amount</SelectItem>
                            <SelectItem value="rating">Rating</SelectItem>
                            <SelectItem value="recent">Recent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Type Filters Row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-white text-xs">Give Type</Label>
                        <Select value={filters.giveType} onValueChange={(value) => setFilters(prev => ({ ...prev, giveType: value as any }))}>
                          <SelectTrigger className="h-9 bg-white/10 border-white/20 text-white mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="bill">Bills</SelectItem>
                            <SelectItem value="coins">Coins</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-white text-xs">Need Type</Label>
                        <Select value={filters.needType} onValueChange={(value) => setFilters(prev => ({ ...prev, needType: value as any }))}>
                          <SelectTrigger className="h-9 bg-white/10 border-white/20 text-white mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="bill">Bills</SelectItem>
                            <SelectItem value="coins">Coins</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Toggle Options */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={filters.verifiedOnly}
                          onCheckedChange={(checked) => setFilters(prev => ({ ...prev, verifiedOnly: checked }))}
                        />
                        <Label className="text-white">Verified only</Label>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetFilters}
                        className="text-blue-200 hover:text-white hover:bg-white/10 h-8"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Reset
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto space-y-3">
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
                    <Card key={post.id} className="glass-dark border-white/10 hover:border-white/20 transition-all duration-200 cursor-pointer">
                      <CardContent className="p-4" onClick={() => handleSelectPost(post)}>
                        {/* Compact Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm font-bold">
                                {post.userInfo?.name?.charAt(0) || 'U'}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center space-x-1">
                                <span className="text-white font-medium">{post.userInfo?.name || 'User'}</span>
                                {post.userInfo?.verified && (
                                  <Shield className="h-3 w-3 text-green-400" />
                                )}
                              </div>
                              <div className="flex items-center space-x-2 text-xs text-blue-200">
                                <Star className="h-3 w-3" />
                                <span>{(post.userInfo?.rating || 0).toFixed(1)}</span>
                                <span>•</span>
                                <span>{dist.toFixed(1)}km away</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-blue-200">
                            {formatTimeAgo(post.timestamp)}
                          </div>
                        </div>

                        {/* Compact Exchange Details */}
                        <div className="flex items-center justify-between mb-3 p-3 bg-white/5 rounded-lg">
                          <div className="text-center">
                            <div className="text-green-300 text-xs">Gives</div>
                            <div className="text-white font-bold">₱{post.giveAmount}</div>
                            <div className="text-green-200 text-xs">{post.giveType}</div>
                          </div>
                          <div className="text-cyan-400">
                            <ArrowLeftRight className="h-4 w-4" />
                          </div>
                          <div className="text-center">
                            <div className="text-blue-300 text-xs">Needs</div>
                            <div className="text-white font-bold">₱{post.needAmount}</div>
                            <div className="text-blue-200 text-xs">{post.needType}</div>
                          </div>
                        </div>

                        {/* Notes */}
                        {post.notes && (
                          <div className="p-2 bg-white/5 rounded text-blue-100 text-sm mb-3">
                            {post.notes}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 bg-white/10 text-white border-white/30 hover:bg-white/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPostForMap(post);
                              setShowMapView(true);
                            }}
                          >
                            <Map className="h-3 w-3 mr-1" />
                            Map
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectPost(post);
                            }}
                          >
                            <Handshake className="h-3 w-3 mr-1" />
                            Match
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
              <div className="bg-white/10 rounded-lg px-3 py-2 text-white text-sm font-medium inline-block">
                {filteredPosts.length} exchange{filteredPosts.length !== 1 ? 's' : ''} found
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Map View Dialog */}
      <Dialog open={showMapView} onOpenChange={setShowMapView}>
        <DialogContent className="max-w-5xl w-[95vw] h-[85vh] p-0 glass-effect border-white/20">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-white flex items-center">
              <Map className="h-5 w-5 mr-2" />
              {selectedPostForMap?.userInfo?.name || 'User'}'s Location
            </DialogTitle>
            <DialogDescription className="text-blue-200">
              View the exact location where this exchange is available
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 p-6 pt-4 h-full">
            {selectedPostForMap && (
              <div className="h-full rounded-lg overflow-hidden border border-white/20 min-h-[500px]">
                <MapView
                  posts={[selectedPostForMap]}
                  selectedPost={selectedPostForMap}
                  onPostSelect={() => {}}
                  showUserLocation={true}
                />
              </div>
            )}
          </div>

        </DialogContent>
      </Dialog>
    </>
  );
}