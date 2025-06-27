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
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { useMatching } from '@/hooks/useMatching';
import { CreatePostModal } from './CreatePostModal';
import { ChatModal } from './ChatModal';
import { ProfileModal } from './ProfileModal';
import { ExchangeCard } from './ExchangeCard';
import { NotificationSystem, useNotificationCount } from './NotificationSystem';

import { SafeMeetupModal } from './SafeMeetupModal';
import { VerificationModal } from './VerificationModal';
import { ReportModal } from './ReportModal';
import { getGreeting } from '@/utils/timeUtils';
import { toastInfo } from '@/utils/notifications';
import { useFirestoreOperations } from '@/hooks/useFirestore';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ExchangePost } from '@/types';

interface DashboardProps {
  onLogout: () => void;
}

export function Dashboard({ onLogout }: DashboardProps) {
  const { user, userProfile } = useAuth();
  const { location, hasPermission } = useLocation();
  const { matches: nearbyPosts = [], matchRequests: incomingRequests = [], isSearching: loading, requestMatch } = useMatching();
  
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const [showSafeMeetup, setShowSafeMeetup] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<ExchangePost[]>([]);
  const [loadingUserPosts, setLoadingUserPosts] = useState(false);
  
  const notificationCount = useNotificationCount();

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
      color: 'text-purple-400',
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
        <h2 className="text-2xl font-bold text-white mb-4">Active Exchanges</h2>
        <div className="space-y-4">
          {incomingRequests.length > 0 ? (
            incomingRequests.map((request) => (
              <Card key={request.id} className="glass-effect border-white/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold">Match Request</h3>
                      <p className="text-blue-100 text-sm">Someone wants to exchange with you!</p>
                    </div>
                    <Badge className="bg-green-500">New</Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="glass-effect border-white/20">
              <CardContent className="p-8 text-center">
                <Clock className="h-12 w-12 text-blue-300 mx-auto mb-3" />
                <p className="text-white font-semibold">No active exchanges</p>
                <p className="text-blue-100 text-sm">Create a post to start exchanging!</p>
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">Nearby Exchanges</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.reload()}
            className="glass-effect text-white hover:bg-white/10"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
        
        <div className="space-y-4">
          {loading ? (
            <Card className="glass-effect border-white/20">
              <CardContent className="p-8 text-center">
                <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-3"></div>
                <p className="text-white">Finding nearby exchanges...</p>
              </CardContent>
            </Card>
          ) : nearbyPosts.length > 0 ? (
            nearbyPosts.map((post) => (
              <ExchangeCard 
                key={post.id} 
                post={post} 
                onMatch={() => {
                  requestMatch(post, post).then(() => {
                    toastInfo('Match request sent!');
                  }).catch(() => {
                    toastInfo('Failed to send match request');
                  });
                }} 
              />
            ))
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
        <Button
          onClick={() => setShowCreatePost(true)}
          className="bg-green-500 hover:bg-green-600 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Exchange
        </Button>
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
                userPosts.map((post) => (
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
                ))
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

        {/* Match Requests */}
        <Card className="glass-effect border-white/20">
          <CardContent className="p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center">
              <Users className="mr-2 h-5 w-5 text-blue-400" />
              Match Requests
            </h3>
            <div className="space-y-4">
              {incomingRequests.length > 0 ? (
                incomingRequests.map((request) => (
                  <Card key={request.id} className="glass-dark border-white/10">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">New Match Request</p>
                          <p className="text-blue-100 text-sm">Someone wants to exchange with you</p>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white">
                            Accept
                          </Button>
                          <Button size="sm" variant="outline" className="text-white border-white/20">
                            Decline
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
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
              <Card className="glass-dark border-white/10">
                <CardContent className="p-4 text-center">
                  <MessageSquare className="h-8 w-8 text-blue-300 mx-auto mb-2" />
                  <p className="text-white text-sm">No active chats</p>
                  <p className="text-blue-100 text-xs">Start an exchange to begin chatting</p>
                </CardContent>
              </Card>
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
              <Card className="glass-dark border-white/10">
                <CardContent className="p-4 text-center">
                  <History className="h-8 w-8 text-blue-300 mx-auto mb-2" />
                  <p className="text-white text-sm">No completed exchanges yet</p>
                  <p className="text-blue-100 text-xs">Your exchange history will appear here</p>
                </CardContent>
              </Card>
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
                <p className="text-2xl font-bold text-white">{(userProfile?.rating || 5.0).toFixed(1)}</p>
                <p className="text-blue-100 text-sm">Rating</p>
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
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-cyan-500">
      {/* Desktop/Mobile Header */}
      <motion.header 
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-effect fixed top-0 left-0 right-0 z-40 px-4 lg:px-8 py-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <Coins className="h-6 w-6 text-blue-600" />
            </div>
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
              onClick={() => setShowNotifications(true)}
              className="relative p-2 text-white hover:bg-white/10"
            >
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 bg-red-500 text-white text-xs">
                  {notificationCount}
                </Badge>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowProfile(true)}
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
          onClick={() => setShowCreatePost(true)}
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
        onClose={() => setShowCreatePost(false)} 
      />
      
      <ChatModal 
        isOpen={showChat} 
        onClose={() => setShowChat(false)} 
      />
      
      <ProfileModal 
        isOpen={showProfile} 
        onClose={() => setShowProfile(false)}
        onLogout={onLogout}
      />

      <NotificationSystem
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
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
    </div>
  );
}
