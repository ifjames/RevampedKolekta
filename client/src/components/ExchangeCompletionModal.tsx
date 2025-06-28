import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Clock, MessageSquare, CheckCircle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useFirestoreOperations } from '@/hooks/useFirestore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';

interface ExchangeCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  exchange: any | null;
}

export function ExchangeCompletionModal({ isOpen, onClose, exchange }: ExchangeCompletionModalProps) {
  const [rating, setRating] = useState(5);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { addDocument, updateDocument } = useFirestoreOperations();

  const handleComplete = async () => {
    if (!exchange || !user) return;
    
    setLoading(true);
    try {
      const completedAt = new Date();
      const duration = Math.round((completedAt.getTime() - (exchange.createdAt?.getTime() || Date.now())) / (1000 * 60));
      const partnerId = exchange.userA === user.uid ? exchange.userB : exchange.userA;
      const partnerName = exchange.userA === user.uid ? exchange.userBName : exchange.userAName;

      // Update match status to completed
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      
      try {
        await updateDoc(doc(db, 'matches', exchange.id), {
          status: 'completed',
          completedAt,
          duration,
          [`${user.uid}_rating`]: rating,
          [`${user.uid}_notes`]: notes,
          [`${user.uid}_completed`]: true,
          completedBy: user.uid
        });
      } catch (error) {
        console.error('Error updating match:', error);
        // If match doesn't exist, continue with other operations
      }

      // Create exchange history record for current user
      await addDocument('exchangeHistory', {
        matchId: exchange.id,
        userId: user.uid,
        partnerUserId: partnerId,
        partnerName: partnerName,
        completedAt,
        duration,
        myRating: rating,
        myNotes: notes,
        exchangeAmount: exchange.exchangeDetails?.giveAmount || 0,
        exchangeType: exchange.exchangeDetails?.giveType || 'cash',
        initiatedBy: exchange.initiatedBy
      });

      // Remove the posts associated with this exchange by deleting them
      if (exchange.postAId && exchange.postAId !== 'quick-match') {
        try {
          const { deleteDoc, doc } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase');
          await deleteDoc(doc(db, 'posts', exchange.postAId));
        } catch (error) {
          console.log('Post A may have already been deleted:', error);
        }
      }
      if (exchange.postBId && exchange.postBId !== 'quick-match') {
        try {
          const { deleteDoc, doc } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase');
          await deleteDoc(doc(db, 'posts', exchange.postBId));
        } catch (error) {
          console.log('Post B may have already been deleted:', error);
        }
      }

      // Update user ratings and profile
      await addDocument('userRatings', {
        ratedUserId: partnerId,
        raterUserId: user.uid,
        rating: rating,
        notes: notes,
        matchId: exchange.id,
        createdAt: completedAt
      });

      // Update user profiles with new exchange count and rating
      try {
        const { doc, updateDoc, increment } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        
        // Update current user's profile
        await updateDoc(doc(db, 'users', user.uid), {
          completedExchanges: increment(1),
          lastExchangeAt: completedAt
        });

        // Update partner's profile  
        await updateDoc(doc(db, 'users', partnerId), {
          completedExchanges: increment(1),
          lastExchangeAt: completedAt
        });
      } catch (error) {
        console.error('Error updating user profiles:', error);
      }

      // Create notification for partner about exchange completion
      await addDocument('notifications', {
        userId: partnerId,
        type: 'exchange_completed',
        title: 'Exchange Completed!',
        message: `Your exchange with ${user.displayName || user.email || 'Someone'} has been completed. Please rate your experience.`,
        data: { 
          matchId: exchange.id,
          completedBy: user.uid,
          rating: rating,
          partnerName: user.displayName || user.email
        },
        read: false,
        deleted: false,
        createdAt: completedAt
      });

      toast.success('Exchange completed successfully! Posts have been removed and your rating has been submitted.');
      onClose();
      setRating(5);
      setNotes('');
      
      // Reload the page to refresh all data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('Error completing exchange:', error);
      toast.error('Failed to complete exchange. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = () => {
    const now = new Date();
    const createdTime = exchange?.createdAt?.getTime ? exchange.createdAt.getTime() : Date.now();
    const diffInMinutes = Math.round((now.getTime() - createdTime) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes`;
    } else {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
  };

  if (!exchange) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-effect border-white/20 text-white max-w-md">
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl text-white mb-4">Complete Exchange</DialogTitle>
          <DialogDescription className="text-blue-100">
            Rate your exchange experience and complete the transaction
          </DialogDescription>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Exchange Summary */}
          <div className="bg-blue-900/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-blue-100">Partner:</span>
              <span className="text-white font-medium">{exchange.partnerName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-blue-100">Duration:</span>
              <Badge variant="outline" className="text-cyan-400 border-cyan-400/50">
                <Clock className="mr-1 h-3 w-3" />
                {formatDuration()}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-blue-100">Amount:</span>
              <span className="text-green-400 font-bold">
                ₱{exchange.exchangeDetails?.giveAmount || 0}
              </span>
            </div>
          </div>

          {/* Rating Section */}
          <div className="space-y-3">
            <label className="text-white font-medium">Rate your experience:</label>
            <div className="flex items-center justify-center space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="transition-colors duration-200"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= rating
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-400'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-blue-100 text-sm">
              {rating === 5 && "Excellent!"}
              {rating === 4 && "Good"}
              {rating === 3 && "Average"}
              {rating === 2 && "Poor"}
              {rating === 1 && "Very Poor"}
            </p>
          </div>

          {/* Notes Section */}
          <div className="space-y-2">
            <label className="text-white font-medium">Additional notes (optional):</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Share your experience..."
              className="bg-blue-900/30 border-white/20 text-white placeholder-blue-300 min-h-[80px]"
              maxLength={500}
            />
            <p className="text-blue-300 text-xs text-right">{notes.length}/500</p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1 border-white/30 text-white hover:bg-white/10 bg-transparent"
            >
              Cancel
            </Button>
            <Button
              onClick={handleComplete}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white border-0"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Complete
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}