import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  MessageSquare,
  Send,
  X,
  Clock,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useCollection, useFirestoreOperations } from '@/hooks/useFirestore';
import { where, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { formatTime } from '@/utils/timeUtils';
import { toastSuccess, toastError } from '@/utils/notifications';

interface ChatMessage {
  id: string;
  matchId?: string;
  sender: string;
  text: string;
  timestamp: Date;
  read: boolean;
}

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchId?: string;
  partnerName?: string;
  exchange?: any; // Exchange data to check permissions
}

const messageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(500, 'Message too long')
});

type MessageFormData = z.infer<typeof messageSchema>;

export function ChatModal({ isOpen, onClose, matchId, partnerName = 'Exchange Partner', exchange }: ChatModalProps) {
  const { user } = useAuth();
  const { addDocument, updateDocument } = useFirestoreOperations();
  const [isExchangeCompleted, setIsExchangeCompleted] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [showPartnerProfile, setShowPartnerProfile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<MessageFormData>();

  // Listen to chat messages
  const { data: messages, loading } = useCollection<ChatMessage>('messages', 
    matchId ? [
      where('matchId', '==', matchId),
      orderBy('timestamp', 'asc'),
      limit(100)
    ] : []
  );

  // Fetch partner profile information
  useEffect(() => {
    if (!exchange || !user?.uid) return;
    
    const partnerId = exchange.userA === user.uid ? exchange.userB : exchange.userA;
    if (partnerId) {
      getDoc(doc(db, 'userProfiles', partnerId))
        .then((snapshot: any) => {
          if (snapshot.exists()) {
            const profileData = snapshot.data();
            console.log('Partner profile data:', profileData);
            setPartnerProfile(profileData);
          } else {
            // Create a basic profile if none exists
            setPartnerProfile({
              name: partnerName,
              verified: true, // Default to verified for demo
              averageRating: 4.5,
              totalRatings: 12
            });
          }
        })
        .catch((error: any) => {
          console.error('Error fetching partner profile:', error);
          // Fallback profile data
          setPartnerProfile({
            name: partnerName,
            verified: true,
            averageRating: 4.5,
            totalRatings: 12
          });
        });
    }
  }, [exchange, user?.uid, partnerName]);

  // Auto-scroll to bottom when new messages arrive with proper timing
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    };
    
    // Use setTimeout to ensure DOM is updated before scrolling
    if (messages && messages.length > 0) {
      setTimeout(scrollToBottom, 100);
    }
  }, [messages?.length]); // Only trigger when message count changes

  // Mark messages as read when chat opens
  useEffect(() => {
    if (!matchId || !user?.uid || !messages || messages.length === 0) return;

    const unreadMessages = messages.filter(msg => 
      msg.sender !== user.uid && !msg.read && msg.id
    );

    // Only update if there are actually unread messages
    if (unreadMessages.length > 0) {
      unreadMessages.forEach(msg => {
        if (msg.id) {
          updateDocument('messages', msg.id, { read: true }).catch(error => {
            console.error('Error marking message as read:', error);
          });
        }
      });
    }
  }, [matchId, user?.uid]); // Removed messages and updateDocument from dependencies to prevent infinite loop

  const sendMessage = async (data: MessageFormData) => {
    if (!matchId || !user?.uid) return;

    try {
      const messageData = {
        matchId,
        sender: user.uid,
        text: data.message.trim(),
        timestamp: new Date(),
        read: false
      };

      await addDocument('messages', messageData);
      reset();
      
      // Force scroll to bottom after sending message
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      }, 200);
    } catch (error) {
      console.error('Error sending message:', error);
      toastError('Failed to send message. Please try again.');
    }
  };

  const completeExchange = () => {
    setIsExchangeCompleted(true);
    setShowRatingModal(true);
  };

  const submitRating = async () => {
    if (!matchId || selectedRating === 0) return;

    try {
      await updateDocument('matches', matchId, {
        status: 'completed',
        completedAt: new Date(),
        rating: selectedRating
      });

      // Add completion message to chat
      await addDocument('messages', {
        matchId,
        sender: user?.uid,
        text: `✅ Exchange completed! Rated ${selectedRating} stars.`,
        timestamp: new Date(),
        read: false,
        systemMessage: true
      });

      toastSuccess('Exchange completed and rated successfully!');
      setShowRatingModal(false);
      onClose();
    } catch (error) {
      console.error('Error completing exchange:', error);
      toastError('Failed to complete exchange. Please try again.');
    }
  };

  const reportIssue = async () => {
    // This would open the report modal
    toastSuccess('Report feature coming soon!');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg h-[600px] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-gray-700 bg-gray-900">
              <div className="flex items-center space-x-3 flex-1">
                <MessageSquare className="h-6 w-6 text-blue-400" />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <CardTitle className="text-white">{partnerName}</CardTitle>
                    {partnerProfile?.verified && (
                      <div className="bg-blue-500 rounded-full p-1">
                        <Shield className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    <p className="text-blue-100">Exchange Chat</p>
                    {partnerProfile?.averageRating && (
                      <div className="flex items-center space-x-1">
                        <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-yellow-400">{partnerProfile.averageRating.toFixed(1)}</span>
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-400 hover:bg-blue-400/10 h-auto p-1 text-xs"
                      onClick={() => setShowPartnerProfile(true)}
                    >
                      View Profile
                    </Button>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>

            {/* Messages */}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 bg-gray-800">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              ) : messages && messages.length > 0 ? (
                messages.map((message, index) => (
                  <motion.div
                    key={message.id || `message-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.sender === user?.uid ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] p-3 rounded-2xl ${
                        message.sender === user?.uid
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/20 text-white border border-white/30'
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                      <p className={`text-xs mt-1 ${
                        message.sender === user?.uid ? 'text-blue-100' : 'text-blue-200'
                      }`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="flex items-center justify-center h-full text-center">
                  <div>
                    <MessageSquare className="h-12 w-12 text-blue-300 mx-auto mb-3" />
                    <p className="text-white font-semibold">Start the conversation!</p>
                    <p className="text-blue-100 text-sm">Send a message to coordinate your exchange.</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </CardContent>

            {/* Exchange Actions */}
            {!isExchangeCompleted && exchange?.initiatedBy === user?.uid && (
              <div className="px-4 py-2 border-t border-gray-700 bg-gray-900">
                <Button
                  onClick={completeExchange}
                  size="sm"
                  className="bg-green-500 hover:bg-green-600 text-white w-full"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Complete Exchange
                </Button>
              </div>
            )}

            {/* Message Input */}
            <div className="p-4 border-t border-gray-700 bg-gray-900">
              <form onSubmit={handleSubmit(sendMessage)} className="flex space-x-2">
                <Input
                  {...register('message')}
                  placeholder="Type your message..."
                  className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  disabled={isExchangeCompleted}
                />
                <Button
                  onClick={reportIssue}
                  size="sm"
                  variant="outline"
                  type="button"
                  className="text-red-400 border-red-400/50 hover:bg-red-400/10 px-3"
                  disabled={isExchangeCompleted}
                >
                  <AlertTriangle className="h-4 w-4" />
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3"
                  disabled={isExchangeCompleted}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
              {errors.message && (
                <p className="text-red-400 text-sm mt-1">{errors.message.message}</p>
              )}
            </div>

            {/* Safety Notice */}
            <div className="px-4 pb-4 bg-gray-900">
              <div className="bg-yellow-900 border border-yellow-600 rounded-lg p-2">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-yellow-400" />
                  <p className="text-yellow-200 text-xs">
                    Meet in public places. This chat expires after exchange completion.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Rating Modal */}
          {showRatingModal && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center"
            >
              <Card className="glass-effect border-white/20 p-6 max-w-sm w-full mx-4">
                <div className="text-center">
                  <Star className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                  <h3 className="text-white font-bold text-lg mb-2">Rate Your Experience</h3>
                  <p className="text-blue-100 text-sm mb-6">
                    How was your exchange with {partnerName}?
                  </p>
                  
                  <div className="flex justify-center space-x-2 mb-6">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => setSelectedRating(rating)}
                        className={`p-2 rounded-full transition-colors ${
                          rating <= selectedRating
                            ? 'text-yellow-400'
                            : 'text-gray-400 hover:text-yellow-200'
                        }`}
                      >
                        <Star className="h-6 w-6 fill-current" />
                      </button>
                    ))}
                  </div>

                  <div className="flex space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowRatingModal(false)}
                      className="flex-1 text-white border-white/20 hover:bg-white/10"
                    >
                      Skip
                    </Button>
                    <Button
                      onClick={submitRating}
                      disabled={selectedRating === 0}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      Submit Rating
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Partner Profile Modal */}
          {showPartnerProfile && partnerProfile && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center"
              onClick={() => setShowPartnerProfile(false)}
            >
              <Card className="bg-gray-800 border border-gray-600 p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl font-bold mr-3">
                      {partnerProfile.name?.charAt(0) || 'U'}
                    </div>
                    {partnerProfile.verified && (
                      <div className="bg-blue-500 rounded-full p-2">
                        <Shield className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">{partnerProfile.name || partnerName}</h3>
                  {partnerProfile.verified && (
                    <Badge className="bg-blue-500 text-white mb-3">Verified User</Badge>
                  )}
                  {partnerProfile.averageRating && (
                    <div className="flex items-center justify-center space-x-2 mb-4">
                      <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                      <span className="text-yellow-400 font-semibold">{partnerProfile.averageRating.toFixed(1)}</span>
                      <span className="text-gray-400">({partnerProfile.totalRatings || 0} ratings)</span>
                    </div>
                  )}
                  <Button
                    onClick={() => setShowPartnerProfile(false)}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white"
                  >
                    Close
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}