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
import { formatTimeAgo } from '@/utils/timeUtils';
import { toastSuccess } from '@/utils/notifications';

interface Notification {
  id: string;
  userId: string;
  type: 'match_found' | 'match_confirmed' | 'meetup_reminder' | 'exchange_completed' | 'rating_received' | 'no_show_reported' | 'verification_approved';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
}

interface NotificationSystemProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationSystem({ isOpen, onClose }: NotificationSystemProps) {
  const { user } = useAuth();
  const { updateDocument } = useFirestoreOperations();

  const { data: notifications, loading } = useCollection<Notification>('notifications', [
    where('userId', '==', user?.uid || ''),
    orderBy('createdAt', 'desc'),
    limit(20)
  ]);

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

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      await Promise.all(
        unreadNotifications.map(n => updateDocument('notifications', n.id, { read: true }))
      );
      toastSuccess('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="glass-effect rounded-2xl p-6 max-w-md w-full mx-4 max-h-[70vh] overflow-hidden border-white/20"
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
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0 ml-2"></div>
                              )}
                            </div>
                            <p className="text-blue-100 text-sm mb-2">
                              {notification.message}
                            </p>
                            <p className="text-blue-200 text-xs">
                              {formatTimeAgo(notification.createdAt)}
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
  
  const { data: notifications } = useCollection<Notification>('notifications', [
    where('userId', '==', user?.uid || ''),
    where('read', '==', false),
    limit(50)
  ]);

  return notifications.length;
}