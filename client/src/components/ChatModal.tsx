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
import { where, orderBy, limit } from 'firebase/firestore';
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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
            className="glass-effect rounded-2xl w-full max-w-lg h-[600px] flex flex-col border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-white/10">
              <div className="flex items-center space-x-3">
                <MessageSquare className="h-6 w-6 text-blue-400" />
                <div>
                  <CardTitle className="text-white">{partnerName}</CardTitle>
                  <p className="text-blue-100 text-sm">Exchange Chat</p>
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
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
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
            {!isExchangeCompleted && (
              <div className="px-4 py-2 border-t border-white/10">
                <div className="flex space-x-2">
                  {/* Only show Complete button if current user is the one who initiated the exchange */}
                  {exchange?.initiatedBy === user?.uid && (
                    <Button
                      onClick={completeExchange}
                      size="sm"
                      className="bg-green-500 hover:bg-green-600 text-white flex-1"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Complete Exchange
                    </Button>
                  )}
                  <Button
                    onClick={reportIssue}
                    size="sm"
                    variant="outline"
                    className="text-red-400 border-red-400/50 hover:bg-red-400/10"
                  >
                    <AlertTriangle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Message Input */}
            <div className="p-4 border-t border-white/10">
              <form onSubmit={handleSubmit(sendMessage)} className="flex space-x-2">
                <Input
                  {...register('message')}
                  placeholder="Type your message..."
                  className="flex-1 bg-white/10 border-white/20 text-white placeholder-blue-200"
                  disabled={isExchangeCompleted}
                />
                <Button
                  type="submit"
                  size="sm"
                  className="bg-blue-500 hover:bg-blue-600 text-white"
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
            <div className="px-4 pb-4">
              <div className="bg-yellow-900/30 border border-yellow-400/30 rounded-lg p-2">
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}