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
  Users
} from 'lucide-react';
import { ExchangePost } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { distance } from '@/lib/geohash';
import { formatTimeAgo } from '@/utils/timeUtils';

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

  // Fetch all active posts
  useEffect(() => {
    if (!isOpen) return;

    const postsQuery = query(
      collection(db, 'posts'),
      where('status', '==', 'active'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const posts: ExchangePost[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.userId !== user?.uid) { // Exclude own posts
          posts.push({
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate() || new Date(),
          } as ExchangePost);
        }
      });
      setAllPosts(posts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, user?.uid]);

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

    // Amount range filter
    filtered = filtered.filter(post => 
      post.giveAmount >= filters.minAmount && 
      post.giveAmount <= filters.maxAmount
    );

    // Verified only filter
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
          if (!location) return 0;
          const distA = distance(location.lat, location.lng, a.location.lat, a.location.lng);
          const distB = distance(location.lat, location.lng, b.location.lat, b.location.lng);
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl w-[95vw] glass-effect border-white/20 bg-blue-900/95 max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-white text-xl flex items-center">
            <Search className="mr-2 h-5 w-5" />
            Find Safe Exchange
          </DialogTitle>
          <DialogDescription className="text-blue-100">
            Search for nearby exchange opportunities and filter by your preferences
          </DialogDescription>
        </DialogHeader>

        {/* Search and Filter Controls */}
        <div className="space-y-4 flex-shrink-0">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-300 h-4 w-4" />
              <Input
                placeholder="Search by user name or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-blue-200"
              />
            </div>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className="bg-white/10 text-white border-white/30 hover:bg-white/20"
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
            <Button
              onClick={resetFilters}
              variant="outline"
              size="sm"
              className="bg-white/10 text-white border-white/30 hover:bg-white/20"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <Card className="glass-dark border-white/10">
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Distance Filter */}
                  <div className="space-y-2">
                    <Label className="text-white">Max Distance: {filters.maxDistance}km</Label>
                    <Slider
                      value={[filters.maxDistance]}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, maxDistance: value[0] }))}
                      max={50}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  {/* Give Type Filter */}
                  <div className="space-y-2">
                    <Label className="text-white">They Give</Label>
                    <Select value={filters.giveType} onValueChange={(value) => setFilters(prev => ({ ...prev, giveType: value as any }))}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="bill">Bills</SelectItem>
                        <SelectItem value="coins">Coins</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Need Type Filter */}
                  <div className="space-y-2">
                    <Label className="text-white">They Need</Label>
                    <Select value={filters.needType} onValueChange={(value) => setFilters(prev => ({ ...prev, needType: value as any }))}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="bill">Bills</SelectItem>
                        <SelectItem value="coins">Coins</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Amount Range */}
                  <div className="space-y-2">
                    <Label className="text-white">Min Amount</Label>
                    <Input
                      type="number"
                      value={filters.minAmount}
                      onChange={(e) => setFilters(prev => ({ ...prev, minAmount: Number(e.target.value) }))}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Max Amount</Label>
                    <Input
                      type="number"
                      value={filters.maxAmount}
                      onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: Number(e.target.value) }))}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  {/* Sort By */}
                  <div className="space-y-2">
                    <Label className="text-white">Sort By</Label>
                    <Select value={filters.sortBy} onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value as any }))}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
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
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={filters.verifiedOnly}
                      onCheckedChange={(checked) => setFilters(prev => ({ ...prev, verifiedOnly: checked }))}
                    />
                    <Label className="text-white">Verified users only</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Label className="text-white">Min Rating:</Label>
                    <Select value={filters.minRating.toString()} onValueChange={(value) => setFilters(prev => ({ ...prev, minRating: Number(value) }))}>
                      <SelectTrigger className="w-20 bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Any</SelectItem>
                        <SelectItem value="3">3.0+</SelectItem>
                        <SelectItem value="4">4.0+</SelectItem>
                        <SelectItem value="4.5">4.5+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-blue-200">Finding exchanges...</div>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-blue-300 mx-auto mb-3" />
              <div className="text-blue-200 mb-2">No exchanges found</div>
              <div className="text-blue-300 text-sm">Try adjusting your filters or search terms</div>
            </div>
          ) : (
            filteredPosts.map((post) => {
              const dist = location ? distance(location.lat, location.lng, post.location.lat, post.location.lng) : 0;
              return (
                <Card key={post.id} className="glass-dark border-white/10 hover:border-white/20 transition-colors cursor-pointer">
                  <CardContent className="p-4" onClick={() => handleSelectPost(post)}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-bold">
                            {post.userInfo?.name?.charAt(0) || 'U'}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-white font-medium">{post.userInfo?.name || 'User'}</span>
                            {post.userInfo?.verified && (
                              <Shield className="h-3 w-3 text-green-400" />
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-blue-200">
                            <Star className="h-3 w-3" />
                            <span>{(post.userInfo?.rating || 0).toFixed(1)}</span>
                            <MapPin className="h-3 w-3 ml-2" />
                            <span>{dist.toFixed(1)}km away</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-blue-200 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatTimeAgo(post.timestamp)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div className="space-y-1">
                        <div className="text-green-400 text-sm font-medium flex items-center">
                          <DollarSign className="h-3 w-3 mr-1" />
                          Gives: ₱{post.giveAmount} {post.giveType}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-blue-400 text-sm font-medium flex items-center">
                          <DollarSign className="h-3 w-3 mr-1" />
                          Needs: ₱{post.needAmount} {post.needType}
                        </div>
                      </div>
                    </div>

                    {post.notes && (
                      <div className="p-2 bg-white/5 rounded border border-white/10 mb-3">
                        <p className="text-blue-100 text-sm">{post.notes}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex space-x-2">
                        <Badge variant="outline" className="text-green-400 border-green-400">
                          {post.giveType === 'bill' ? '💵' : '🪙'} {post.giveType}
                        </Badge>
                        <Badge variant="outline" className="text-blue-400 border-blue-400">
                          Wants {post.needType === 'bill' ? '💵' : '🪙'}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Request Exchange
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t border-white/10">
          <div className="text-blue-200 text-sm">
            {filteredPosts.length} exchange{filteredPosts.length !== 1 ? 's' : ''} found
          </div>
          <Button
            onClick={onClose}
            variant="outline"
            className="bg-white/10 text-white border-white/30 hover:bg-white/20"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}