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
      
      try {
        // 1. Delete active exchange documents
        console.log('🧹 Starting cleanup for matchId:', exchange.id);
        console.log('🧹 Exchange object:', exchange);
        
        const activeExchangeQuery = query(
          collection(db, 'activeExchanges'),
          where('matchId', '==', exchange.id)
        );
        const activeExchangeDocs = await getDocs(activeExchangeQuery);
        
        console.log('🔍 Found', activeExchangeDocs.size, 'active exchange documents to delete');
        
        if (activeExchangeDocs.size === 0) {
          // Try searching by other possible IDs
          console.log('⚠️ No active exchanges found with matchId, trying other search methods...');
          
          // Try searching by document ID
          const altQuery1 = query(
            collection(db, 'activeExchanges'),
            where('id', '==', exchange.id)
          );
          const altDocs1 = await getDocs(altQuery1);
          console.log('🔍 Found', altDocs1.size, 'active exchanges with id field');
          
          // Try getting all active exchanges for this user
          const userExchangesQuery = query(
            collection(db, 'activeExchanges'),
            where('userA', '==', user.uid)
          );
          const userExchanges1 = await getDocs(userExchangesQuery);
          
          const otherUserExchangesQuery = query(
            collection(db, 'activeExchanges'),
            where('userB', '==', user.uid)
          );
          const userExchanges2 = await getDocs(otherUserExchangesQuery);
          
          console.log('🔍 Found', userExchanges1.size + userExchanges2.size, 'total active exchanges for user');
          
          // Combine all found documents
          const allFoundDocs = [...altDocs1.docs, ...userExchanges1.docs, ...userExchanges2.docs];
          
          for (const docSnapshot of allFoundDocs) {
            const data = docSnapshot.data();
            console.log('📄 Active exchange document:', docSnapshot.id, data);
            
            // Delete if it matches our exchange
            if (data.matchId === exchange.id || data.id === exchange.id) {
              console.log('🗑️ Deleting matching active exchange:', docSnapshot.id);
              await deleteDoc(docSnapshot.ref);
              console.log('✅ Deleted active exchange document:', docSnapshot.id);
            }
          }
        } else {
          for (const docSnapshot of activeExchangeDocs.docs) {
            console.log('🗑️ Deleting active exchange:', docSnapshot.id, docSnapshot.data());
            await deleteDoc(docSnapshot.ref);
            console.log('✅ Deleted active exchange document:', docSnapshot.id);
          }
        }
        
        // 2. Delete chat documents 
        console.log('Looking for chats with matchId:', exchange.id);
        const chatQuery = query(
          collection(db, 'chats'),
          where('matchId', '==', exchange.id)
        );
        const chatDocs = await getDocs(chatQuery);
        
        console.log('Found', chatDocs.size, 'chat documents to delete');
        for (const doc of chatDocs.docs) {
          await deleteDoc(doc.ref);
          console.log('✅ Deleted chat document:', doc.id);
        }
        
        // 3. Delete message documents for this match
        console.log('Looking for messages with matchId:', exchange.id);
        const messageQuery = query(
          collection(db, 'messages'),
          where('matchId', '==', exchange.id)
        );
        const messageDocs = await getDocs(messageQuery);
        
        console.log('Found', messageDocs.size, 'message documents to delete');
        for (const doc of messageDocs.docs) {
          await deleteDoc(doc.ref);
          console.log('✅ Deleted message document:', doc.id);
        }
        
        // 4. Delete related posts
        if (exchange.postAId && exchange.postAId !== 'quick-match') {
          try {
            const postARef = doc(db, 'posts', exchange.postAId);
            const postADoc = await getDoc(postARef);
            if (postADoc.exists()) {
              await deleteDoc(postARef);
              console.log('✅ Deleted Post A:', exchange.postAId);
            } else {
              console.log('Post A already deleted or not found:', exchange.postAId);
            }
          } catch (error) {
            console.log('Error deleting Post A:', error);
          }
        }
        
        if (exchange.postBId && exchange.postBId !== 'quick-match') {
          try {
            const postBRef = doc(db, 'posts', exchange.postBId);
            const postBDoc = await getDoc(postBRef);
            if (postBDoc.exists()) {
              await deleteDoc(postBRef);
              console.log('✅ Deleted Post B:', exchange.postBId);
            } else {
              console.log('Post B already deleted or not found:', exchange.postBId);
            }
          } catch (error) {
            console.log('Error deleting Post B:', error);
          }
        }
        
        console.log('✅ Successfully cleaned up all exchange-related documents');
      } catch (error) {
        console.error('Error during cleanup:', error);
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

      // Save exchange history with corrected logic
      console.log('🔄 Creating exchange history records with corrected logic...');
      
      // When you rate Katrina:
      // - Your history should show what Katrina rated YOU (empty for now, filled when she rates you)
      // - Katrina's history should show what YOU rated HER (your rating and notes)
      
      try {
        // 1. Create/update partner's history record with YOUR rating of THEM
        const partnerHistoryRecord = {
          ...baseHistoryData,
          userId: partnerId, // This goes in Katrina's history
          partnerUserId: user.uid,
          partnerName: user.displayName || user.email || 'Exchange Partner',
          rating: selectedRating, // YOUR rating of Katrina goes in HER history
          notes: exchangeNotes,   // YOUR notes about Katrina go in HER history
          ratedBy: user.uid,
          completedBy: user.uid
        };

        // Check if partner already has a history record
        const partnerExistingQuery = query(
          collection(db, 'exchangeHistory'),
          where('matchId', '==', exchange.id),
          where('userId', '==', partnerId)
        );
        const partnerExistingDocs = await getDocs(partnerExistingQuery);
        
        if (partnerExistingDocs.empty) {
          await addDoc(collection(db, 'exchangeHistory'), partnerHistoryRecord);
          console.log('✅ Created new history record for partner with your rating');
        } else {
          const partnerDoc = partnerExistingDocs.docs[0];
          await updateDoc(doc(db, 'exchangeHistory', partnerDoc.id), {
            rating: selectedRating,
            notes: exchangeNotes,
            ratedBy: user.uid,
            completedBy: user.uid
          });
          console.log('✅ Updated partner history record with your rating');
        }

        // 2. Create/update your own history record (waiting for partner to rate you)
        const myHistoryRecord = {
          ...baseHistoryData,
          userId: user.uid, // This goes in YOUR history
          partnerUserId: partnerId,
          partnerName: partnerName,
          rating: 0, // Will be filled when Katrina rates YOU
          notes: '', // Will be filled when Katrina rates YOU
          ratedBy: null, // Will be set when partner rates you
          waitingForPartnerRating: true,
          completedBy: user.uid
        };

        // Check if you already have a history record
        const myExistingQuery = query(
          collection(db, 'exchangeHistory'),
          where('matchId', '==', exchange.id),
          where('userId', '==', user.uid)
        );
        const myExistingDocs = await getDocs(myExistingQuery);
        
        if (myExistingDocs.empty) {
          await addDoc(collection(db, 'exchangeHistory'), myHistoryRecord);
          console.log('✅ Created placeholder history record for yourself');
        } else {
          console.log('✅ Your history record already exists');
        }

      } catch (error) {
        console.error('Error saving exchange history:', error);
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

      // Update partner's rating with multiplier system
      try {
        console.log('🎯 Updating rating for partner:', partnerId, 'with rating:', selectedRating);
        
        // Try users collection first
        let partnerRef = doc(db, 'users', partnerId);
        let partnerDoc = await getDoc(partnerRef);
        
        // If not found in users, try userProfiles
        if (!partnerDoc.exists()) {
          console.log('Partner not found in users, trying userProfiles...');
          partnerRef = doc(db, 'userProfiles', partnerId);
          partnerDoc = await getDoc(partnerRef);
        }
        
        if (partnerDoc.exists()) {
          const partnerData = partnerDoc.data();
          const currentRating = partnerData.averageRating || partnerData.rating || 3.0;
          const totalRatings = partnerData.totalRatings || 0;
          
          const ratingImpact = calculateRatingImpact(selectedRating, currentRating, totalRatings);
          const newRating = Math.max(1.0, Math.min(5.0, currentRating + ratingImpact));
          
          await updateDoc(partnerRef, {
            averageRating: newRating,
            rating: newRating, // Also update rating field for compatibility
            totalRatings: totalRatings + 1,
            completedExchanges: (partnerData.completedExchanges || 0) + 1,
            lastRatingAt: completedAt
          });
          
          console.log(`✅ Updated partner rating: ${currentRating} -> ${newRating} (impact: ${ratingImpact})`);
        } else {
          console.error('❌ Partner document not found in either collection:', partnerId);
        }
      } catch (error) {
        console.error('Error updating partner rating:', error);
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

      console.log('Exchange completion successful - all operations completed');
      console.log('Exchange history saved:', {
        exchangeId: exchange.id,
        userId: user.uid,
        partnerName: partnerName,
        rating: selectedRating,
        notes: exchangeNotes,
        participants: [user.uid, partnerId]
      });
      console.log('Active exchange should be removed from list after page reload');
      toastSuccess('Exchange completed and rated successfully!');
      setShowRatingModal(false);
      setIsExchangeCompleted(true);

      // Close the modal after a brief delay to show the success message
      setTimeout(() => {
        console.log('Closing modal and refreshing data...');
        onClose();
        // Trigger a data refresh instead of full page reload
        if (window.location.pathname === '/') {
          window.location.reload();
        }
      }, 1500);

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