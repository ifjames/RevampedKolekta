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
  Users
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
import { getGreeting } from '@/utils/timeUtils';
import { toastInfo } from '@/utils/notifications';

interface DashboardProps {
  onLogout: () => void;
}

export function Dashboard({ onLogout }: DashboardProps) {
  const { user, userProfile } = useAuth();
  const { location, hasPermission } = useLocation();
  const { nearbyPosts, incomingRequests, loading, requestMatch } = useMatching();
  
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    setNotificationCount(incomingRequests.length);
  }, [incomingRequests]);

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
      value: '0', // Active posts count
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
    { id: 'home', icon: Home, label: 'Home', active: true },
    { id: 'exchanges', icon: ExternalLink, label: 'Exchanges' },
    { id: 'chat', icon: MessageSquare, label: 'Chat' },
    { id: 'history', icon: History, label: 'History' },
  ];

  const handleNavClick = (navId: string) => {
    setActiveTab(navId);
    if (navId !== 'home') {
      toastInfo(`${navId.charAt(0).toUpperCase() + navId.slice(1)} coming soon!`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-cyan-500">
      {/* Mobile Header */}
      <motion.header 
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-effect fixed top-0 left-0 right-0 z-40 px-4 py-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <Coins className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-white font-bold">Kolekta</h1>
              <p className="text-blue-100 text-sm">
                {getGreeting()}, {userProfile?.name || user?.displayName || 'User'}!
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toastInfo('Notifications coming soon!')}
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
      <main className="pt-20 pb-20 px-4">
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
              onClick={() => toastInfo('Refreshing...')}
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
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-3"></div>
                  <p className="text-blue-100">Loading nearby exchanges...</p>
                </CardContent>
              </Card>
            ) : nearbyPosts.length > 0 ? (
              nearbyPosts.map((post) => (
                <ExchangeCard
                  key={post.id}
                  post={post}
                  onMatch={() => requestMatch(post.id)}
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
      </main>

      {/* Floating Action Button */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.6, type: "spring" }}
      >
        <Button
          onClick={() => setShowCreatePost(true)}
          className="floating-btn fixed bottom-24 right-6 w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-full shadow-2xl z-30"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </motion.div>

      {/* Bottom Navigation */}
      <motion.nav 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-effect fixed bottom-0 left-0 right-0 z-40 px-4 py-3"
      >
        <div className="flex items-center justify-around max-w-md mx-auto">
          {navItems.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              onClick={() => handleNavClick(item.id)}
              className={`flex flex-col items-center space-y-1 p-2 ${
                activeTab === item.id 
                  ? 'text-white' 
                  : 'text-blue-200 hover:text-white'
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
    </div>
  );
}
