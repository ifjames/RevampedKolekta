import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  X, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Users,
  MessageSquare,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useCollection, useFirestoreOperations } from '@/hooks/useFirestore';
import { where, orderBy, limit } from 'firebase/firestore';
import { useMatching } from '@/hooks/useMatching';
import { toast } from '@/hooks/use-toast';
import { formatTimeAgo } from '@/utils/timeUtils';

interface Notification {
  id: string;
  userId: string;
  type: 'match_found' | 'match_confirmed' | 'match_declined' | 'meetup_reminder' | 'exchange_completed' | 'rating_received' | 'no_show_reported' | 'verification_approved';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  deleted?: boolean;
  createdAt: Date;
}

interface NotificationSystemProps {
  isOpen: boolean;
  onClose: () => void;
  onExchangeCompleted?: (exchange: any, partnerName: string) => void;
}

export function NotificationSystem({ isOpen, onClose, onExchangeCompleted }: NotificationSystemProps) {
  const { user } = useAuth();
  const { updateDocument } = useFirestoreOperations();
  const { acceptMatch, declineMatch } = useMatching();

  const { data: allNotifications = [], loading } = useCollection<Notification>('notifications', user?.uid ? [
    where('userId', '==', user.uid),
    limit(50)
  ] : []);

  // Debug logging
  console.log('NotificationSystem Debug:', {
    user: user?.uid,
    allNotifications: allNotifications.length,
    loading
  });

  // Filter out deleted notifications
  const notifications = allNotifications.filter(n => !(n as any).deleted);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'match_found':
        return <Users className="h-5 w-5 text-green-400" />;
      case 'match_confirmed':
        return <CheckCircle className="h-5 w-5 text-blue-400" />;
      case 'meetup_reminder':
        return <Clock className="h-5 w-5 text-yellow-400" />;
      case 'exchange_completed':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'rating_received':
        return <Star className="h-5 w-5 text-yellow-400" />;
      case 'no_show_reported':
        return <AlertTriangle className="h-5 w-5 text-red-400" />;
      case 'verification_approved':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      default:
        return <Bell className="h-5 w-5 text-blue-400" />;
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDocument('notifications', notificationId, { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleAcceptMatch = async (matchId: string, notificationId: string) => {
    try {
      console.log('Accepting match:', matchId);
      await acceptMatch(matchId);
      await markAsRead(notificationId);
      
      // Force close notification modal to refresh dashboard
      onClose();
      
      toast({
        title: "Match Accepted!",
        description: "You can now chat with your exchange partner."
      });
    } catch (error) {
      console.error('Error accepting match:', error);
      toast({
        title: "Error", 
        description: "Failed to accept match request"
      });
    }
  };

  const handleDeclineMatch = async (matchId: string, notificationId: string) => {
    try {
      console.log('Declining match:', matchId);
      await declineMatch(matchId);
      await markAsRead(notificationId);
      
      // Force close notification modal to refresh dashboard
      onClose();
      
      toast({
        title: "Match Declined",
        description: "The match request has been declined."
      });
    } catch (error) {
      console.error('Error declining match:', error);
      toast({
        title: "Error",
        description: "Failed to decline match request"
      });
    }
  };

  const handleExchangeCompleted = async (notification: Notification) => {
    try {
      await markAsRead(notification.id);
      if (onExchangeCompleted && notification.data?.matchId) {
        const partnerName = notification.data.partnerName || 'Exchange Partner';
        const exchange = {
          id: notification.data.matchId,
          completedBy: notification.data.completedBy,
          ...notification.data
        };
        onExchangeCompleted(exchange, partnerName);
      }
      onClose();
    } catch (error) {
      console.error('Error handling exchange completion:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      for (const notification of unreadNotifications) {
        await updateDocument('notifications', notification.id, { read: true });
      }
      toast({
        title: "Success",
        description: "All notifications marked as read"
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await updateDocument('notifications', notificationId, { deleted: true });
      toast({
        title: "Notification Removed",
        description: "The notification has been deleted"
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-4 sm:pt-20 p-2 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="glass-effect rounded-2xl p-4 w-[90vw] max-w-sm sm:max-w-md mx-4 max-h-[80vh] overflow-hidden border-white/20 bg-blue-900/95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Bell className="h-6 w-6 text-white" />
                <h2 className="text-xl font-bold text-white">Notifications</h2>
                {unreadCount > 0 && (
                  <Badge className="bg-red-500 text-white">
                    {unreadCount}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {unreadCount > 0 && (
              <Button
                onClick={markAllAsRead}
                size="sm"
                className="w-full mb-4 bg-blue-500 hover:bg-blue-600 text-white"
              >
                Mark All as Read
              </Button>
            )}

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-3"></div>
                  <p className="text-blue-100">Loading notifications...</p>
                </div>
              ) : notifications.length > 0 ? (
                notifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`cursor-pointer ${!notification.read ? 'opacity-100' : 'opacity-70'}`}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                  >
                    <Card className={`glass-dark border-white/10 hover:bg-white/5 transition-all duration-200 ${
                      !notification.read ? 'ring-1 ring-blue-400/50' : ''
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="text-white font-medium text-sm truncate">
                                {notification.title}
                              </h3>
                              <div className="flex items-center space-x-2">
                                {!notification.read && (
                                  <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0"></div>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNotification(notification.id);
                                  }}
                                  className="h-6 w-6 p-0 text-gray-400 hover:text-red-400"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-blue-100 text-sm mb-2">
                              {notification.message}
                            </p>
                            
                            {/* Match request action buttons */}
                            {notification.type === 'match_found' && notification.data && notification.data.matchId && !notification.read && (
                              <div className="flex space-x-2 mt-3">
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAcceptMatch(notification.data!.matchId, notification.id);
                                  }}
                                  className="bg-green-500 hover:bg-green-600 text-white flex-1"
                                >
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeclineMatch(notification.data!.matchId, notification.id);
                                  }}
                                  className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white flex-1"
                                >
                                  Decline
                                </Button>
                              </div>
                            )}

                            {/* Exchange completion action button */}
                            {notification.type === 'exchange_completed' && notification.data && notification.data.matchId && !notification.read && (
                              <div className="mt-3">
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExchangeCompleted(notification);
                                  }}
                                  className="bg-yellow-500 hover:bg-yellow-600 text-white w-full"
                                >
                                  <Star className="h-4 w-4 mr-2" />
                                  Rate Your Partner
                                </Button>
                              </div>
                            )}
                            
                            <p className="text-blue-200 text-xs mt-2">
                              {notification.createdAt && typeof notification.createdAt.getTime === 'function' 
                                ? formatTimeAgo(notification.createdAt)
                                : 'Recently'
                              }
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 text-blue-300 mx-auto mb-3" />
                  <p className="text-white font-semibold">No notifications</p>
                  <p className="text-blue-100 text-sm">You're all caught up!</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook to manage notification count for the main UI
export function useNotificationCount() {
  const { user } = useAuth();
  
  const { data: allNotifications = [] } = useCollection<Notification>('notifications', user?.uid ? [
    where('userId', '==', user.uid),
    where('read', '==', false),
    limit(50)
  ] : []);

  // Filter out deleted notifications
  const notifications = allNotifications.filter(n => !(n as any).deleted);

  return notifications.length;
}