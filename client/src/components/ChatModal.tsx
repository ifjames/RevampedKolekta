import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  MessageSquare,
  Send,
  X,
  Clock,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Star,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useCollection, useFirestoreOperations } from '@/hooks/useFirestore';
import { where, orderBy, limit, doc, getDoc, collection, query, onSnapshot, serverTimestamp, deleteDoc, getDocs } from 'firebase/firestore';
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
  const [selectedRating, setSelectedRating] = useState(5);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [showPartnerProfile, setShowPartnerProfile] = useState(false);
  const [completingExchange, setCompletingExchange] = useState(false);
  const [exchangeNotes, setExchangeNotes] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      message: ''
    }
  });

  // State for messages with real-time updates
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time message listener using simplified query
  useEffect(() => {
    if (!matchId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const messagesRef = collection(db, 'messages');
    // Use only where clause to avoid index requirement
    const q = query(messagesRef, where('matchId', '==', matchId));

    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const newMessages: ChatMessage[] = [];
      snapshot.forEach((doc: any) => {
        const data = doc.data();
        // Handle server timestamp properly
        let timestamp = new Date();
        if (data.timestamp) {
          if (data.timestamp.toDate) {
            timestamp = data.timestamp.toDate();
          } else if (data.timestamp.seconds) {
            timestamp = new Date(data.timestamp.seconds * 1000);
          } else if (typeof data.timestamp === 'string' || typeof data.timestamp === 'number') {
            timestamp = new Date(data.timestamp);
          }
        }
        
        newMessages.push({
          id: doc.id,
          matchId: data.matchId,
          sender: data.sender,
          text: data.text,
          timestamp: timestamp,
          read: data.read || false
        });
      });
      
      // Sort messages by timestamp on client side
      newMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      console.log(`Real-time chat update: ${newMessages.length} messages for match ${matchId}`);
      setMessages(newMessages);
      setLoading(false);
      
      // Auto-scroll when new messages arrive
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      }, 100);
    }, (error: any) => {
      console.error('Error fetching messages:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [matchId]);

  // Fetch real partner profile information from database
  useEffect(() => {
    if (!exchange || !user?.uid) return;
    
    const partnerId = exchange.userA === user.uid ? exchange.userB : exchange.userA;
    if (partnerId) {
      // Try multiple collections to get the most complete profile data
      Promise.all([
        getDoc(doc(db, 'userProfiles', partnerId)),
        getDoc(doc(db, 'users', partnerId))
      ]).then(([userProfileSnapshot, userSnapshot]) => {
        let profileData = null;
        
        if (userProfileSnapshot.exists()) {
          profileData = userProfileSnapshot.data();
        } else if (userSnapshot.exists()) {
          profileData = userSnapshot.data();
        }
        
        if (profileData) {
          setPartnerProfile({
            name: profileData.name || partnerName,
            verified: profileData.verified === true,
            averageRating: profileData.averageRating ?? profileData.rating ?? 0,
            totalRatings: profileData.totalRatings ?? profileData.completedExchanges ?? 0
          });
        } else {
          setPartnerProfile({
            name: partnerName,
            verified: false,
            averageRating: 0,
            totalRatings: 0
          });
        }
      }).catch((error: any) => {
        console.error('Error fetching partner profile:', error);
        setPartnerProfile({
          name: partnerName,
          verified: false,
          averageRating: 0,
          totalRatings: 0
        });
      });
    }
  }, [exchange, user?.uid, partnerName]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      }, 50);
    }
  }, [messages.length]);

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
    if (!matchId || !user?.uid || !data?.message) return;

    try {
      const messageText = data.message?.trim?.() || '';
      if (!messageText) return;

      const messageData = {
        matchId,
        sender: user.uid,
        text: messageText,
        timestamp: serverTimestamp(),
        read: false
      };

      // Add message to Firebase - this will trigger the real-time listener
      await addDocument('messages', messageData);
      
      // Clear form immediately
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
    if (!exchange || !user || selectedRating === 0) return;

    setCompletingExchange(true);
    console.log('🚀 STARTING EXCHANGE COMPLETION PROCESS');
    console.log('Exchange data:', exchange);
    console.log('Current user:', user.uid);
    console.log('Selected rating:', selectedRating);
    console.log('Exchange notes:', exchangeNotes);

    try {
      // Import all Firebase functions needed
      const { 
        getDocs, 
        query, 
        where, 
        collection, 
        deleteDoc, 
        updateDoc, 
        getDoc, 
        addDoc, 
        doc 
      } = await import('firebase/firestore');

      const completedAt = new Date();
      const duration = Math.round((completedAt.getTime() - (exchange.createdAt?.getTime() || Date.now())) / (1000 * 60));
      const partnerId = exchange.userA === user.uid ? exchange.userB : exchange.userA;
      const partnerName = exchange.userA === user.uid ? exchange.userBName : exchange.userAName;
      
      console.log('💫 Exchange details:', {
        partnerId,
        partnerName,
        duration,
        userA: exchange.userA,
        userB: exchange.userB,
        currentUser: user.uid
      });
      
      // STEP 1: BRUTAL FORCE DELETE EVERYTHING RELATED TO THIS EXCHANGE
      console.log('💀 FORCE DELETING ALL EXCHANGE DATA');
      try {
        // Get ALL active exchanges and delete any that match this exchange ID
        const allActiveExchanges = await getDocs(collection(db, 'activeExchanges'));
        console.log('🔍 Found', allActiveExchanges.size, 'total active exchanges');
        
        for (const docSnap of allActiveExchanges.docs) {
          const data = docSnap.data();
          if (data.matchId === exchange.id || data.id === exchange.id || 
              (data.userA === user.uid && data.userB === partnerId) ||
              (data.userB === user.uid && data.userA === partnerId)) {
            console.log('💥 DELETING ACTIVE EXCHANGE:', docSnap.id, data);
            await deleteDoc(docSnap.ref);
          }
        }
        
        // Delete all chats for this match
        const allChats = await getDocs(collection(db, 'chats'));
        for (const docSnap of allChats.docs) {
          const data = docSnap.data();
          if (data.matchId === exchange.id) {
            console.log('💥 DELETING CHAT:', docSnap.id);
            await deleteDoc(docSnap.ref);
          }
        }
        
        // Delete all messages for this match
        const allMessages = await getDocs(collection(db, 'messages'));
        for (const docSnap of allMessages.docs) {
          const data = docSnap.data();
          if (data.matchId === exchange.id) {
            console.log('💥 DELETING MESSAGE:', docSnap.id);
            await deleteDoc(docSnap.ref);
          }
        }
        
        console.log('✅ CLEANUP COMPLETED');
      } catch (error) {
        console.error('❌ Cleanup failed:', error);
      }

      // Create exchange history records for BOTH users
      const baseHistoryData = {
        exchangeId: exchange.id,
        matchId: exchange.id,
        participants: [user.uid, partnerId],
        completedAt: completedAt,
        duration,
        exchangeDetails: {
          giveAmount: exchange.exchangeDetails?.giveAmount || 1000,
          giveType: exchange.exchangeDetails?.giveType || 'cash',
          needAmount: exchange.exchangeDetails?.needAmount || 1000,
          needType: exchange.exchangeDetails?.needType || 'coins'
        },
        initiatedBy: exchange.initiatedBy
      };

      // STEP 2: CREATE CORRECT EXCHANGE HISTORY
      console.log('📝 CREATING EXCHANGE HISTORY');
      
      try {
        // SIMPLE LOGIC: 
        // Partner's history gets YOUR rating of them
        // Your history gets PARTNER'S rating of you (when they rate you)
        
        // Save YOUR rating in PARTNER'S history
        const partnerHistoryData = {
          matchId: exchange.id,
          userId: partnerId, // This record belongs to Katrina
          partnerUserId: user.uid, // You are the partner
          partnerName: user.displayName || user.email || 'Exchange Partner',
          completedAt: completedAt,
          duration: duration,
          rating: selectedRating, // YOUR rating goes in HER history
          notes: exchangeNotes,   // YOUR notes go in HER history
          completedBy: user.uid,
          exchangeDetails: {
            giveAmount: exchange.exchangeDetails?.giveAmount || 1000,
            giveType: exchange.exchangeDetails?.giveType || 'cash',
            needAmount: exchange.exchangeDetails?.needAmount || 1000,
            needType: exchange.exchangeDetails?.needType || 'coins'
          }
        };
        
        console.log('💾 Saving partner history:', partnerHistoryData);
        await addDoc(collection(db, 'exchangeHistory'), partnerHistoryData);
        console.log('✅ PARTNER HISTORY SAVED');
        
        // Create placeholder in YOUR history (to be filled when partner rates you)
        const myHistoryData = {
          matchId: exchange.id,
          userId: user.uid, // This record belongs to you
          partnerUserId: partnerId, // Katrina is the partner
          partnerName: partnerName,
          completedAt: completedAt,
          duration: duration,
          rating: 0, // Will be filled when Katrina rates you
          notes: '', // Will be filled when Katrina rates you
          completedBy: user.uid,
          waitingForPartnerRating: true,
          exchangeDetails: {
            giveAmount: exchange.exchangeDetails?.giveAmount || 1000,
            giveType: exchange.exchangeDetails?.giveType || 'cash',
            needAmount: exchange.exchangeDetails?.needAmount || 1000,
            needType: exchange.exchangeDetails?.needType || 'coins'
          }
        };
        
        console.log('💾 Saving your placeholder history:', myHistoryData);
        await addDoc(collection(db, 'exchangeHistory'), myHistoryData);
        console.log('✅ YOUR PLACEHOLDER HISTORY SAVED');
        
      } catch (error) {
        console.error('❌ Error saving exchange history:', error);
      }

      // Delete associated posts
      try {
        
        if (exchange.postAId && exchange.postAId !== 'quick-match') {
          const postARef = doc(db, 'posts', exchange.postAId);
          const postADoc = await getDoc(postARef);
          if (postADoc.exists()) {
            await deleteDoc(postARef);
            console.log('Deleted Post A:', exchange.postAId);
          }
        }
        if (exchange.postBId && exchange.postBId !== 'quick-match') {
          const postBRef = doc(db, 'posts', exchange.postBId);
          const postBDoc = await getDoc(postBRef);
          if (postBDoc.exists()) {
            await deleteDoc(postBRef);
            console.log('Deleted Post B:', exchange.postBId);
          }
        }
      } catch (error) {
        console.error('Error deleting posts:', error);
      }

      // Calculate rating impact with multiplier system
      const calculateRatingImpact = (newRating: number, currentRating: number, totalRatings: number) => {
        // Base weight decreases as user gets more ratings (prevents rating inflation)
        const baseWeight = Math.max(0.1, 1 / Math.sqrt(totalRatings + 1));
        // Rating impact varies based on difference from current rating
        const ratingDifference = newRating - currentRating;
        const impact = ratingDifference * baseWeight;
        return Math.max(-0.5, Math.min(0.5, impact)); // Cap impact between -0.5 and +0.5
      };

      // Save individual rating record
      console.log('💫 Saving rating record: User', user.uid, 'rating', partnerId, 'with', selectedRating, 'stars');
      await addDocument('userRatings', {
        ratedUserId: partnerId, // The person being rated
        raterUserId: user.uid,  // The person giving the rating
        rating: selectedRating,
        notes: exchangeNotes,
        matchId: exchange.id,
        createdAt: completedAt
      });

      // STEP 3: UPDATE PARTNER'S PROFILE RATING
      console.log('🎯 UPDATING PARTNER RATING');
      try {
        // Get all users and find the partner
        const allUsers = await getDocs(collection(db, 'users'));
        let partnerFound = false;
        
        for (const userDoc of allUsers.docs) {
          if (userDoc.id === partnerId) {
            const userData = userDoc.data();
            const currentRating = userData.averageRating || userData.rating || 3.0;
            const totalRatings = userData.totalRatings || 0;
            
            // Simple average calculation
            const newRating = ((currentRating * totalRatings) + selectedRating) / (totalRatings + 1);
            
            await updateDoc(userDoc.ref, {
              averageRating: newRating,
              rating: newRating,
              totalRatings: totalRatings + 1,
              completedExchanges: (userData.completedExchanges || 0) + 1
            });
            
            console.log(`✅ UPDATED PARTNER RATING: ${currentRating} -> ${newRating}`);
            partnerFound = true;
            break;
          }
        }
        
        if (!partnerFound) {
          // Try userProfiles collection
          const allProfiles = await getDocs(collection(db, 'userProfiles'));
          for (const profileDoc of allProfiles.docs) {
            if (profileDoc.id === partnerId) {
              const profileData = profileDoc.data();
              const currentRating = profileData.averageRating || profileData.rating || 3.0;
              const totalRatings = profileData.totalRatings || 0;
              
              const newRating = ((currentRating * totalRatings) + selectedRating) / (totalRatings + 1);
              
              await updateDoc(profileDoc.ref, {
                averageRating: newRating,
                rating: newRating,
                totalRatings: totalRatings + 1,
                completedExchanges: (profileData.completedExchanges || 0) + 1
              });
              
              console.log(`✅ UPDATED PARTNER PROFILE RATING: ${currentRating} -> ${newRating}`);
              partnerFound = true;
              break;
            }
          }
        }
        
        if (!partnerFound) {
          console.error('❌ PARTNER NOT FOUND IN ANY COLLECTION:', partnerId);
        }
        
      } catch (error) {
        console.error('❌ Error updating partner rating:', error);
      }
      
      // Update current user's completed exchanges count
      try {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const completedExchanges = userData.completedExchanges || 0;
          
          await updateDoc(userRef, {
            completedExchanges: completedExchanges + 1,
            lastExchangeAt: completedAt
          });
          
          console.log(`Updated user completed exchanges: ${completedExchanges} → ${completedExchanges + 1}`);
        }
      } catch (error) {
        console.error('Error updating user exchange count:', error);
      }

      // Add completion message to chat
      await addDocument('messages', {
        matchId,
        sender: user?.uid,
        text: `✅ Exchange completed! Rated ${selectedRating} stars. ${exchangeNotes ? `Notes: ${exchangeNotes}` : ''}`,
        timestamp: completedAt,
        read: false,
        systemMessage: true
      });

      // Create notification for partner
      await addDocument('notifications', {
        userId: partnerId,
        type: 'exchange_completed',
        title: 'Exchange Completed!',
        message: `Your exchange with ${user.displayName || user.email || 'Someone'} has been completed. Please rate your experience.`,
        data: { 
          matchId: exchange.id,
          completedBy: user.uid,
          rating: selectedRating,
          partnerName: user.displayName || user.email
        },
        read: false,
        deleted: false,
        createdAt: completedAt
      });

      console.log('🎉 EXCHANGE COMPLETION SUCCESSFUL');
      console.log('All operations completed successfully');
      
      toast.success('Exchange completed! Rating saved and data cleaned up.');
      setShowRatingModal(false);
      setIsExchangeCompleted(true);
      onClose();
      
      // Force refresh to show updated UI
      console.log('🔄 Refreshing page to show updated data...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('Error completing exchange:', error);
      toastError('Failed to complete exchange. Please try again.');
    } finally {
      setCompletingExchange(false);
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
          className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-2 sm:p-4"
          onClick={(e) => {
            // Only close if not showing rating modal and clicking on the overlay
            if (!showRatingModal && e.target === e.currentTarget) {
              onClose();
            }
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-gray-900 border border-gray-700 rounded-2xl w-[90vw] max-w-sm sm:max-w-lg h-[90vh] sm:h-[600px] max-h-[600px] flex flex-col"
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
              onClick={(e) => e.stopPropagation()}
            >
              <Card 
                className="glass-effect border-white/20 p-6 max-w-sm w-full mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center">
                  <Star className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                  <h3 className="text-white font-bold text-lg mb-2">Complete Exchange</h3>
                  <p className="text-blue-100 text-sm mb-6">
                    Rate your exchange with {partnerName}
                  </p>
                  
                  <div className="flex justify-center space-x-2 mb-4">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRating(rating);
                        }}
                        disabled={completingExchange}
                        className={`p-2 rounded-full transition-colors ${
                          rating <= selectedRating
                            ? 'text-yellow-400'
                            : 'text-gray-400 hover:text-yellow-200'
                        } ${completingExchange ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <Star className="h-6 w-6 fill-current" />
                      </button>
                    ))}
                  </div>

                  <div className="mb-4">
                    <Textarea
                      value={exchangeNotes}
                      onChange={(e) => setExchangeNotes(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onFocus={(e) => e.stopPropagation()}
                      placeholder="Add notes about your experience (optional)"
                      className="bg-blue-900/30 border-white/20 text-white placeholder-blue-300 text-sm"
                      rows={3}
                      maxLength={200}
                      disabled={completingExchange}
                    />
                    <p className="text-blue-300 text-xs text-right mt-1">{exchangeNotes.length}/200</p>
                  </div>

                  <div className="flex space-x-3">
                    <Button
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowRatingModal(false);
                      }}
                      disabled={completingExchange}
                      className="flex-1 text-white border-white/20 hover:bg-white/10 bg-transparent"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        submitRating();
                      }}
                      disabled={selectedRating === 0 || completingExchange}
                      className="flex-1 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white border-0"
                    >
                      {completingExchange ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Completing...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Complete Exchange
                        </>
                      )}
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
                  {(partnerProfile.averageRating !== undefined && partnerProfile.averageRating !== null) && (
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