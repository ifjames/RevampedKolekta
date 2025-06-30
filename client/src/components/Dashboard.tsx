import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Coins, 
  Bell, 
  User, 
  Plus, 
  RotateCcw, 
  Home, 
  MessageSquare, 
  History, 
  ExternalLink,
  Star,
  Clock,
  Users,
  Shield,
  MapPin,
  Building2,
  AlertTriangle,
  Handshake,
  CheckCircle,
  Map,
  Minus,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { useMatching } from '@/hooks/useMatching';
import { useMatchingSystem } from '@/hooks/useMatchingSystem';
import { useExchangeHistory } from '@/hooks/useExchangeHistory';
import { CreatePostModal } from './CreatePostModal';
import { ChatModal } from './ChatModal';
import { ProfileModal } from './ProfileModal';
import { MyPostsModal } from './MyPostsModal';
import { FindExchangeModal } from './FindExchangeModal';
import { ExchangeCard } from './ExchangeCard';
import { NotificationSystem, useNotificationCount } from './NotificationSystem';

import { SafeMeetupModal } from './SafeMeetupModal';
import { VerificationModal } from './VerificationModal';
import { ReportModal } from './ReportModal';
import { MapView } from './MapView';
import { ExchangeCompletionModal } from './ExchangeCompletionModal';
import { PartnerRatingModal } from './PartnerRatingModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'react-hot-toast';
import { getGreeting, formatDate } from '@/utils/timeUtils';
import { useFirestoreOperations } from '@/hooks/useFirestore';
import { useActiveExchanges } from '@/hooks/useActiveExchanges';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ExchangePost } from '@/types';
import { distance } from '@/lib/geohash';

interface DashboardProps {
  onLogout: () => void;
}

export function Dashboard({ onLogout }: DashboardProps) {
  const { user, userProfile } = useAuth();
  const { location, hasPermission } = useLocation();
  const { matches: nearbyPosts = [], matchRequests: allMatchRequests = [], isSearching: loading, requestMatch } = useMatching();
  const { completedExchanges, getRecentExchanges, formatDuration } = useExchangeHistory();
  const { activeExchanges } = useActiveExchanges();
  
  // Get pending requests from match requests
  const pendingRequests = allMatchRequests.filter(match => match.status === 'pending' && match.userB === user?.uid);
  const [showAllHistory, setShowAllHistory] = useState(false);
  
  // UI state management
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [showChat, setShowChat] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMyPosts, setShowMyPosts] = useState(false);
  const [showFindExchange, setShowFindExchange] = useState(false);
  const [showSafeMeetup, setShowSafeMeetup] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showMapView, setShowMapView] = useState(false);
  const [mapDistance, setMapDistance] = useState(10); // Default 10km

  // Close all modals function
  const closeAllModals = () => {
    setShowCreatePost(false);
    setEditingPost(null);
    setShowChat(false);
    setShowProfile(false);
    setShowNotifications(false);
    setShowMyPosts(false);
    setShowFindExchange(false);
    setShowSafeMeetup(false);
    setShowVerification(false);
    setShowReport(false);
    setShowMapView(false);
    setSelectedChatExchange(null);
    setShowExchangeCompletion(false);
    setShowPartnerRating(false);
  };
  
  // Exchange completion states
  const [showExchangeCompletion, setShowExchangeCompletion] = useState(false);
  const [selectedExchangeForCompletion, setSelectedExchangeForCompletion] = useState<any>(null);
  const [showPartnerRating, setShowPartnerRating] = useState(false);
  const [selectedExchangeForRating, setSelectedExchangeForRating] = useState<any>(null);
  const [partnerNameForRating, setPartnerNameForRating] = useState('');
  
  const [selectedPostForMap, setSelectedPostForMap] = useState<ExchangePost | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<ExchangePost[]>([]);
  const [loadingUserPosts, setLoadingUserPosts] = useState(false);
  const [selectedChatExchange, setSelectedChatExchange] = useState<any>(null);
  const [matchingPostId, setMatchingPostId] = useState<string | null>(null);
  
  const notificationCount = useNotificationCount();

  const { sendMatchRequest, acceptMatchRequest, declineMatchRequest } = useMatchingSystem();

  // Fetch user's posts from Firebase
  useEffect(() => {
    if (!user) return;

    setLoadingUserPosts(true);
    const postsQuery = query(
      collection(db, 'posts'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const posts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      })) as ExchangePost[];
      
      // Filter active posts on the client side
      const activePosts = posts.filter(post => post.status === 'active');
      setUserPosts(activePosts);
      setLoadingUserPosts(false);
    }, (error) => {
      console.error('Error fetching user posts:', error);
      setLoadingUserPosts(false);
    });

    return () => unsubscribe();
  }, [user]);


  const stats = [
    {
      icon: ExternalLink,
      value: userProfile?.completedExchanges || 0,
      label: 'Exchanges',
      color: 'text-cyan-400',
    },
    {
      icon: Star,
      value: (userProfile?.rating || 5.0).toFixed(1),
      label: 'Rating',
      color: 'text-yellow-400',
    },
    {
      icon: Clock,
      value: userPosts.length,
      label: 'Active',
      color: 'text-green-400',
    },
    {
      icon: Users,
      value: nearbyPosts.length,
      label: 'Nearby',
      color: 'text-blue-400',
    },
  ];

  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'exchanges', icon: ExternalLink, label: 'Exchanges' },
    { id: 'chat', icon: MessageSquare, label: 'Chat' },
    { id: 'history', icon: History, label: 'History' },
  ];

  const handleNavClick = (navId: string) => {
    setActiveTab(navId);
  };

  // Handle match request with loading state
  const handleMatchRequest = async (targetPost: ExchangePost) => {
    if (!user) {
      toast.error("Please log in to send match requests.");
      return;
    }

    setMatchingPostId(targetPost.id);
    try {
      await sendMatchRequest(targetPost);
    } catch (error) {
      console.error('Error sending match request:', error);
      toast.error("Failed to send match request. Please try again.");
    } finally {
      setMatchingPostId(null);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'exchanges':
        return renderExchangesTab();
      case 'chat':
        return renderChatTab();
      case 'history':
        return renderHistoryTab();
      default:
        return renderHomeTab();
    }
  };

  const renderHomeTab = () => (
    <>
      {/* Active Exchanges Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="max-w-6xl mx-auto mb-8"
      >
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">Active Exchanges</h2>
        <div className="space-y-4">
          {activeExchanges.length > 0 ? (
            activeExchanges.map((exchange) => (
              <Card key={exchange.id} className="glass-effect border-white/20">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                        <h3 className="text-white font-semibold text-sm sm:text-base">Active Exchange</h3>
                        <Badge className="bg-green-500 w-fit">Confirmed</Badge>
                      </div>
                      <p className="text-blue-100 text-sm mb-2">
                        Partner: {(() => {
                          return exchange.userA === user?.uid 
                            ? (exchange.userBName || 'Exchange Partner')
                            : (exchange.userAName || 'Exchange Partner');
                        })()}
                      </p>
                      <p className="text-blue-200 text-xs">
                        Chat with your partner to coordinate the meetup and exchange
                      </p>
                    </div>
                    <div className="flex flex-row sm:flex-col gap-2 sm:min-w-fit">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedChatExchange(exchange);
                          setShowChat(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white flex-1 sm:flex-none"
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Chat
                      </Button>
                      {exchange.initiatedBy === user?.uid && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedExchangeForCompletion(exchange);
                            setShowExchangeCompletion(true);
                          }}
                          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 shadow-lg flex-1 sm:flex-none"
                        >
                          <Handshake className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="glass-effect border-white/20">
              <CardContent className="p-4 sm:p-8 text-center">
                <Clock className="h-8 w-8 sm:h-12 sm:w-12 text-blue-300 mx-auto mb-2 sm:mb-3" />
                <p className="text-white font-semibold text-sm sm:text-base">No active exchanges</p>
                <p className="text-blue-100 text-xs sm:text-sm">Create a post to start exchanging!</p>
              </CardContent>
            </Card>
          )}
        </div>
      </motion.div>

      {/* Nearby Posts Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="max-w-6xl mx-auto"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-white">Nearby Exchanges</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.reload()}
            className="glass-effect text-white hover:bg-white/10 w-fit"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
        
        {/* Exchange Map - Always visible */}
        <Card className="glass-effect border-white/20 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Map className="h-5 w-5 text-blue-400" />
                <h3 className="text-white font-semibold">Exchange Map</h3>
              </div>
              <div className="flex items-center space-x-3">
                <Label className="text-white text-sm">Distance:</Label>
                <Select value={mapDistance.toString()} onValueChange={(value) => setMapDistance(Number(value))}>
                  <SelectTrigger className="w-24 h-8 glass-dark text-white border-white/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-dark border-white/20">
                    <SelectItem value="5">5km</SelectItem>
                    <SelectItem value="10">10km</SelectItem>
                    <SelectItem value="15">15km</SelectItem>
                    <SelectItem value="50">50km</SelectItem>
                    <SelectItem value="999">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="relative h-80 rounded-lg overflow-hidden border border-white/20">
              <MapView
                posts={nearbyPosts}
                onPostSelect={(post) => {
                  setSelectedPostForMap(post);
                  handleMatchRequest(post);
                }}
                selectedPost={selectedPostForMap}
                showUserLocation={true}
              />
              
              {/* Map Legend */}
              <div className="absolute top-4 left-4 glass-effect border-white/20 rounded-lg p-3 space-y-2 max-w-xs">
                <h4 className="text-white font-medium text-sm mb-2">Legend</h4>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-white text-xs">Your Location</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-3 bg-blue-500 rounded border border-white flex items-center justify-center">
                    <img src="/kolekta-logo.png" alt="Exchange" className="w-2 h-2" />
                  </div>
                  <span className="text-white text-xs">Exchange Posts</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <img src="/cash-icon.png" alt="Cash" className="w-3 h-3" />
                    <span className="text-white text-xs">→</span>
                    <img src="/coin-icon.png" alt="Coins" className="w-3 h-3" />
                  </div>
                  <span className="text-white text-xs">Cash to Coins</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <img src="/coin-icon.png" alt="Coins" className="w-3 h-3" />
                    <span className="text-white text-xs">→</span>
                    <img src="/cash-icon.png" alt="Cash" className="w-3 h-3" />
                  </div>
                  <span className="text-white text-xs">Coins to Cash</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <img src="/cash-icon.png" alt="Cash" className="w-3 h-3" />
                    <span className="text-white text-xs">⇄</span>
                    <img src="/coin-icon.png" alt="Coins" className="w-3 h-3" />
                  </div>
                  <span className="text-white text-xs">Both Ways</span>
                </div>
              </div>
              
              {/* Map Controls */}
              <div className="absolute top-4 right-4 flex flex-col space-y-2">
                <Button
                  size="sm"
                  onClick={() => {
                    // Zoom in functionality would be handled by MapView
                    console.log('Zoom in');
                  }}
                  className="w-8 h-8 p-0 glass-effect border-white/20 text-white hover:bg-white/10"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    // Zoom out functionality would be handled by MapView
                    console.log('Zoom out');
                  }}
                  className="w-8 h-8 p-0 glass-effect border-white/20 text-white hover:bg-white/10"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    // Center on user location
                    if (location) {
                      console.log('Center on user location');
                    }
                  }}
                  className="w-8 h-8 p-0 glass-effect border-white/20 text-white hover:bg-white/10"
                  title="Center on your location"
                >
                  <MapPin className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {loading ? (
            <Card className="glass-effect border-white/20">
              <CardContent className="p-8 text-center">
                <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-3"></div>
                <p className="text-white">Finding nearby exchanges...</p>
              </CardContent>
            </Card>
          ) : nearbyPosts.length > 0 ? (
            <>
              {nearbyPosts.slice(0, 5).map((post) => (
                <ExchangeCard 
                  key={post.id} 
                  post={post} 
                  onMatch={() => handleMatchRequest(post)}
                  isMatching={matchingPostId === post.id}
                  onViewMap={() => {
                    setSelectedPostForMap(post);
                    setShowMapView(true);
                  }}
                />
              ))}
              {nearbyPosts.length > 5 && (
                <Card className="glass-effect border-white/20">
                  <CardContent className="p-4 text-center">
                    <Button
                      onClick={() => setShowFindExchange(true)}
                      className="cosmic-gradient hover:opacity-80 text-white"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View All Exchanges ({nearbyPosts.length})
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="glass-effect border-white/20">
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 text-blue-300 mx-auto mb-3" />
                <p className="text-white font-semibold">No nearby exchanges found</p>
                <p className="text-blue-100 text-sm">Be the first to post an exchange in your area!</p>
              </CardContent>
            </Card>
          )}
        </div>
      </motion.div>
    </>
  );

  const renderExchangesTab = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Your Exchanges</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              closeAllModals();
              setShowMyPosts(true);
            }}
            variant="outline"
            className="glass-dark text-white border-white/20 hover:bg-white/10"
          >
            <History className="mr-2 h-4 w-4" />
            My Posts
          </Button>
          <Button
            onClick={() => {
              closeAllModals();
              setShowCreatePost(true);
            }}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Exchange
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Active Posts */}
        <Card className="glass-effect border-white/20">
          <CardContent className="p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center">
              <Clock className="mr-2 h-5 w-5 text-green-400" />
              Active Posts
            </h3>
            <div className="space-y-4">
              {loadingUserPosts ? (
                <Card className="glass-dark border-white/10">
                  <CardContent className="p-4 text-center">
                    <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-white text-sm">Loading your posts...</p>
                  </CardContent>
                </Card>
              ) : userPosts.length > 0 ? (
                <>
                  {userPosts.slice(0, 3).map((post) => (
                    <Card key={post.id} className="glass-dark border-white/10">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="text-white font-medium">
                              Exchange ₱{post.giveAmount} {post.giveType} → ₱{post.needAmount} {post.needType}
                            </h4>
                            <p className="text-blue-100 text-sm">
                              {post.notes || 'No additional notes'}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-green-400 border-green-400">
                            Active
                          </Badge>
                        </div>
                        <div className="flex items-center text-blue-200 text-xs">
                          <MapPin className="h-3 w-3 mr-1" />
                          {post.location ? `${post.location.lat.toFixed(4)}, ${post.location.lng.toFixed(4)}` : 'Location not available'}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {userPosts.length > 3 && (
                    <Card className="glass-dark border-white/10">
                      <CardContent className="p-4 text-center">
                        <Button
                          onClick={() => setShowMyPosts(true)}
                          className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View All Posts ({userPosts.length})
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card className="glass-dark border-white/10">
                  <CardContent className="p-4 text-center">
                    <Clock className="h-8 w-8 text-blue-300 mx-auto mb-2" />
                    <p className="text-white text-sm">No active posts</p>
                    <p className="text-blue-100 text-xs">Create your first exchange post</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="glass-effect border-white/20">
          <CardContent className="p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center">
              <Users className="mr-2 h-5 w-5 text-blue-400" />
              Find Safe Exchange
            </h3>
            <div className="mb-6">
              <p className="text-blue-100 text-sm mb-4">
                Search for specific exchanges with advanced filters instead of waiting for nearby matches.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  onClick={() => {
                    closeAllModals();
                    setShowFindExchange(true);
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Browse All Exchanges
                </Button>
                <Button
                  onClick={() => {
                    closeAllModals();
                    setShowCreatePost(true);
                  }}
                  variant="outline"
                  className="glass-dark text-white border-white/20 hover:bg-white/10"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Post
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Match Requests */}
        <Card className="glass-effect border-white/20">
          <CardContent className="p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center">
              <MessageSquare className="mr-2 h-5 w-5 text-green-400" />
              Match Requests
            </h3>
            <div className="space-y-4">
              {pendingRequests.length > 0 ? (
                <>
                  {pendingRequests.slice(0, 7).map((request) => (
                    <Card key={request.id} className="glass-dark border-white/10">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium">New Match Request</p>
                            <p className="text-blue-100 text-sm">Someone wants to exchange with you</p>
                          </div>
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              className="bg-green-500 hover:bg-green-600 text-white"
                              onClick={() => acceptMatchRequest(request.id, request.userA)}
                            >
                              Accept
                            </Button>
                            <Button 
                              size="sm" 
                              className="bg-red-500 hover:bg-red-600 text-white border-red-500"
                              onClick={() => declineMatchRequest(request.id, request.userA)}
                            >
                              Decline
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {pendingRequests.length > 7 && (
                    <Card className="glass-dark border-white/10">
                      <CardContent className="p-4 text-center">
                        <Button
                          onClick={() => setShowNotifications(true)}
                          className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View All Match Requests ({pendingRequests.length})
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card className="glass-dark border-white/10">
                  <CardContent className="p-4 text-center">
                    <Users className="h-8 w-8 text-blue-300 mx-auto mb-2" />
                    <p className="text-white text-sm">No pending requests</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );

  const renderChatTab = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto"
    >
      <h2 className="text-2xl font-bold text-white mb-6">Messages</h2>
      
      <div className="space-y-4">
        <Card className="glass-effect border-white/20">
          <CardContent className="p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center">
              <MessageSquare className="mr-2 h-5 w-5 text-blue-400" />
              Active Chats
            </h3>
            <div className="space-y-4">
              {activeExchanges.length > 0 ? (
                <>
                  {activeExchanges.slice(0, 5).map((exchange) => (
                    <Card key={exchange.id} className="glass-dark border-white/10 hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedChatExchange(exchange);
                        setShowChat(true);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                              <MessageSquare className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <p className="text-white font-medium">
                                {(() => {
                                  return exchange.userA === user?.uid 
                                    ? (exchange.userBName || 'Exchange Partner')
                                    : (exchange.userAName || 'Exchange Partner');
                                })()}
                              </p>
                              <p className="text-blue-100 text-sm">Active exchange • Click to chat</p>
                            </div>
                          </div>
                          <Badge className="bg-green-500">Active</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {activeExchanges.length > 5 && (
                    <Card className="glass-dark border-white/10">
                      <CardContent className="p-4 text-center">
                        <Button
                          onClick={() => {
                            // Open a modal or navigate to show all chats
                            // For now, we'll use the chat modal to show all
                            setShowChat(true);
                          }}
                          className="bg-gradient-to-r from-blue-500 to-green-600 hover:from-blue-600 hover:to-green-700 text-white"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View All Chats ({activeExchanges.length})
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card className="glass-dark border-white/10">
                  <CardContent className="p-4 text-center">
                    <MessageSquare className="h-8 w-8 text-blue-300 mx-auto mb-2" />
                    <p className="text-white text-sm">No active chats</p>
                    <p className="text-blue-100 text-xs">Start an exchange to begin chatting</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect border-white/20">
          <CardContent className="p-6">
            <h3 className="text-white font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => setShowVerification(true)}
                className="glass-dark text-white hover:bg-white/10 border-white/20"
                variant="outline"
              >
                <Shield className="mr-2 h-4 w-4" />
                Get Verified
              </Button>
              <Button
                onClick={() => setShowSafeMeetup(true)}
                className="glass-dark text-white hover:bg-white/10 border-white/20"
                variant="outline"
              >
                <MapPin className="mr-2 h-4 w-4" />
                Safe Locations
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );

  const renderHistoryTab = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto"
    >
      <h2 className="text-2xl font-bold text-white mb-6">Exchange History</h2>
      
      <div className="space-y-4">
        <Card className="glass-effect border-white/20">
          <CardContent className="p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center">
              <History className="mr-2 h-5 w-5 text-green-400" />
              Completed Exchanges
            </h3>
            <div className="space-y-4">
              {completedExchanges.length > 0 ? (
                <>
                  {(showAllHistory ? completedExchanges : getRecentExchanges(8)).map((exchange) => (
                    <Card key={exchange.id} className="glass-dark border-white/10">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="text-white font-medium">Exchange Completed</h4>
                            <p className="text-blue-100 text-sm">
                              {exchange.completedAt.toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center">
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${
                                  i < exchange.rating
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-400'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="text-blue-200 text-xs space-y-1 mb-2">
                          <p>Partner: {exchange.partnerName}</p>
                          <p>Duration: {formatDuration(exchange.duration)}</p>
                          {exchange.notes && <p>Notes: {exchange.notes}</p>}
                        </div>
                        <Badge variant="outline" className="text-green-400 border-green-400">
                          Completed
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {completedExchanges.length > 8 && !showAllHistory && (
                    <div className="text-center">
                      <Button
                        variant="outline"
                        onClick={() => setShowAllHistory(true)}
                        className="glass-dark text-white hover:bg-white/10 border-white/20"
                      >
                        Show All Exchanges ({completedExchanges.length})
                      </Button>
                    </div>
                  )}
                  
                  {showAllHistory && (
                    <div className="text-center">
                      <Button
                        variant="outline"
                        onClick={() => setShowAllHistory(false)}
                        className="glass-dark text-white hover:bg-white/10 border-white/20"
                      >
                        Show Less
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <Card className="glass-dark border-white/10">
                  <CardContent className="p-4 text-center">
                    <History className="h-8 w-8 text-blue-300 mx-auto mb-2" />
                    <p className="text-white text-sm">No completed exchanges yet</p>
                    <p className="text-blue-100 text-xs">Your exchange history will appear here</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect border-white/20">
          <CardContent className="p-6">
            <h3 className="text-white font-semibold mb-4">Statistics</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{userProfile?.completedExchanges || 0}</p>
                <p className="text-blue-100 text-sm">Total Exchanges</p>
              </div>
              <div className="text-center">
                <div className="flex justify-center mb-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.floor(userProfile?.rating || 0)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-400'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm text-white">{(userProfile?.rating || 0).toFixed(1)}</p>
                <p className="text-blue-100 text-xs">Rating</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">0</p>
                <p className="text-blue-100 text-sm">This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect border-white/20">
          <CardContent className="p-6">
            <h3 className="text-white font-semibold mb-4">Account Actions</h3>
            <div className="grid grid-cols-1 gap-4">
              <Button
                onClick={() => setShowReport(true)}
                className="glass-dark text-white hover:bg-white/10 border-white/20"
                variant="outline"
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Report Issue
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen">
      {/* Desktop/Mobile Header */}
      <motion.header 
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-effect fixed top-0 left-0 right-0 z-40 px-4 lg:px-8 py-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src="/kolekta-logo.png" alt="Kolekta" className="w-10 h-10" />
            <div>
              <h1 className="text-white font-bold">Kolekta</h1>
              <p className="text-blue-100 text-sm lg:hidden">
                {getGreeting()}, {userProfile?.name || user?.displayName || 'User'}!
              </p>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-6">
            {navItems.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === item.id
                    ? 'bg-white/20 text-white'
                    : 'text-blue-100 hover:text-white hover:bg-white/10'
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Button>
            ))}
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                closeAllModals();
                setShowNotifications(true);
              }}
              className="relative p-2 text-white hover:bg-white/10"
            >
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <Badge className="absolute top-0 right-0 h-5 w-5 rounded-full flex items-center justify-center bg-red-500 text-white text-xs transform translate-x-1 -translate-y-1">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </Badge>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                closeAllModals();
                setShowProfile(true);
              }}
              className="p-2 text-white hover:bg-white/10"
            >
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="pt-20 pb-20 lg:pb-8 px-4 lg:px-8">
        {/* Quick Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto mb-8"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="glass-effect rounded-xl text-center border-white/20">
                  <CardContent className="p-4">
                    <stat.icon className={`h-6 w-6 ${stat.color} mb-2 mx-auto`} />
                    <p className="text-white font-bold text-lg">{stat.value}</p>
                    <p className="text-blue-100 text-sm">{stat.label}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {!hasPermission && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto mb-8"
          >
            <Card className="glass-effect border-yellow-400/50 bg-yellow-500/10">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                    <Bell className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold">Location Access Needed</h3>
                    <p className="text-blue-100 text-sm">
                      Allow location access to find nearby exchanges and create posts.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Tab Content */}
        {renderTabContent()}
      </main>

      {/* Floating Action Button - Mobile Only */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.6, type: "spring" }}
        className="lg:hidden"
      >
        <Button
          onClick={() => {
            closeAllModals();
            setShowCreatePost(true);
          }}
          className="floating-btn fixed bottom-24 right-6 w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-full shadow-2xl z-30"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </motion.div>

      {/* Bottom Navigation - Hidden on Desktop */}
      <motion.nav 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-effect fixed bottom-0 left-0 right-0 z-40 px-4 py-3 lg:hidden"
      >
        <div className="flex items-center justify-around max-w-md mx-auto">
          {navItems.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              onClick={() => handleNavClick(item.id)}
              className={`flex flex-col items-center space-y-1 p-2 transition-colors ${
                activeTab === item.id 
                  ? 'text-white bg-white/20 rounded-lg' 
                  : 'text-blue-200 hover:text-white hover:bg-white/10 rounded-lg'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
            </Button>
          ))}
        </div>
      </motion.nav>

      {/* Modals */}
      <CreatePostModal 
        isOpen={showCreatePost} 
        onClose={() => {
          setShowCreatePost(false);
          setEditingPost(null);
        }}
        editingPost={editingPost}
      />
      
      <ChatModal 
        isOpen={showChat} 
        onClose={() => setShowChat(false)} 
      />
      
      <ProfileModal 
        isOpen={showProfile} 
        onClose={() => setShowProfile(false)}
        onLogout={onLogout}
        onOpenVerification={() => {
          closeAllModals();
          setShowVerification(true);
        }}
      />

      <NotificationSystem
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onExchangeCompleted={(exchange, partnerName) => {
          setSelectedExchangeForRating(exchange);
          setPartnerNameForRating(partnerName);
          setShowPartnerRating(true);
        }}
      />

      <SafeMeetupModal
        isOpen={showSafeMeetup}
        onClose={() => setShowSafeMeetup(false)}
        onLocationSelect={(location) => {
          setSelectedLocation(location);
          setShowSafeMeetup(false);
        }}
        userLocation={location && location.lat && location.lng ? { lat: location.lat, lng: location.lng } : undefined}
      />

      <VerificationModal
        isOpen={showVerification}
        onClose={() => setShowVerification(false)}
      />

      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
      />

      <MyPostsModal
        isOpen={showMyPosts}
        onClose={() => setShowMyPosts(false)}
        onEditPost={(post) => {
          closeAllModals();
          setEditingPost(post);
          setShowCreatePost(true);
        }}
      />

      <FindExchangeModal
        isOpen={showFindExchange}
        onClose={() => setShowFindExchange(false)}
        onSelectPost={(post) => {
          setShowFindExchange(false);
          // Handle post selection - could open chat or match request
          console.log('Selected post:', post);
        }}
      />

      {/* Map View Dialog */}
      <Dialog open={showMapView} onOpenChange={setShowMapView}>
        <DialogContent className="max-w-5xl w-[95vw] h-[85vh] p-0 glass-effect border-white/20">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-white flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              {selectedPostForMap?.userInfo?.name || 'User'}'s Exchange Location
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
                  onPostSelect={(post) => sendMatchRequest(post)}
                  showUserLocation={true}
                />
              </div>
            )}
          </div>

        </DialogContent>
      </Dialog>

      {/* Exchange Completion Modal */}
      <ExchangeCompletionModal
        isOpen={showExchangeCompletion}
        onClose={() => setShowExchangeCompletion(false)}
        exchange={selectedExchangeForCompletion}
      />

      {/* Partner Rating Modal */}
      <PartnerRatingModal
        isOpen={showPartnerRating}
        onClose={() => setShowPartnerRating(false)}
        exchange={selectedExchangeForRating}
        partnerName={partnerNameForRating}
      />

      {/* Chat Modal */}
      {showChat && selectedChatExchange && (
        <ChatModal
          isOpen={showChat}
          onClose={() => setShowChat(false)}
          matchId={selectedChatExchange.id}
          partnerName={(() => {
            const extMatch = selectedChatExchange as any;
            return selectedChatExchange.userA === user?.uid 
              ? (extMatch.userBName || 'Exchange Partner')
              : (extMatch.userAName || 'Exchange Partner');
          })()}
          exchange={selectedChatExchange}
        />
      )}
    </div>
  );
}
