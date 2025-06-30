import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, CheckCircle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc, 
  addDoc, 
  deleteDoc,
  getDoc
} from 'firebase/firestore';

interface MutualRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  exchange: any | null;
  partnerName: string;
}

export function MutualRatingModal({ isOpen, onClose, exchange, partnerName }: MutualRatingModalProps) {
  const [rating, setRating] = useState(5);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleSubmitRating = async () => {
    if (!exchange || !user) return;

    setLoading(true);
    try {
      const partnerId = exchange.userA === user.uid ? exchange.userB : exchange.userA;
      const completedAt = new Date();

      console.log('🌟 Submitting mutual rating:', {
        rater: user.uid,
        partner: partnerId,
        rating: rating,
        notes: notes
      });

      // 1. Save rating record
      await addDoc(collection(db, 'userRatings'), {
        ratedUserId: partnerId,
        raterUserId: user.uid,
        rating: rating,
        notes: notes,
        matchId: exchange.id,
        createdAt: completedAt
      });

      // 2. Update partner's rating
      let partnerRef = doc(db, 'users', partnerId);
      let partnerDoc = await getDoc(partnerRef);
      
      if (!partnerDoc.exists()) {
        partnerRef = doc(db, 'userProfiles', partnerId);
        partnerDoc = await getDoc(partnerRef);
      }

      if (partnerDoc.exists()) {
        const partnerData = partnerDoc.data();
        const currentRating = partnerData.averageRating || partnerData.rating || 3.0;
        const totalRatings = partnerData.totalRatings || 0;
        
        // Simple rating calculation
        const newRating = ((currentRating * totalRatings) + rating) / (totalRatings + 1);
        
        await updateDoc(partnerRef, {
          averageRating: newRating,
          rating: newRating,
          totalRatings: totalRatings + 1,
          completedExchanges: (partnerData.completedExchanges || 0) + 1
        });
        
        console.log('✅ Updated partner rating:', currentRating, '->', newRating);
      }

      // 3. Mark this user as having completed their rating
      const activeExchangeQuery = query(
        collection(db, 'activeExchanges'),
        where('matchId', '==', exchange.id)
      );
      const activeExchangeDocs = await getDocs(activeExchangeQuery);

      for (const docSnapshot of activeExchangeDocs.docs) {
        const data = docSnapshot.data();
        const updatedData = {
          ...data,
          [`${user.uid}_completed`]: true,
          [`${user.uid}_rating`]: rating,
          [`${user.uid}_notes`]: notes,
          [`${user.uid}_completedAt`]: completedAt
        };

        // Check if both users have completed
        const otherUserId = exchange.userA === user.uid ? exchange.userB : exchange.userA;
        const bothCompleted = updatedData[`${user.uid}_completed`] && updatedData[`${otherUserId}_completed`];

        if (bothCompleted) {
          // Both users have rated - delete the active exchange
          console.log('🎯 Both users completed rating - deleting active exchange');
          await deleteDoc(docSnapshot.ref);
          
          // Also delete chats and messages
          const chatQuery = query(collection(db, 'chats'), where('matchId', '==', exchange.id));
          const chatDocs = await getDocs(chatQuery);
          for (const chatDoc of chatDocs.docs) {
            await deleteDoc(chatDoc.ref);
          }
          
          const messageQuery = query(collection(db, 'messages'), where('matchId', '==', exchange.id));
          const messageDocs = await getDocs(messageQuery);
          for (const messageDoc of messageDocs.docs) {
            await deleteDoc(messageDoc.ref);
          }
        } else {
          // Only one user completed - keep the exchange active
          console.log('🔄 Only one user completed - keeping exchange active');
          await updateDoc(docSnapshot.ref, updatedData);
        }
      }

      // 4. Save exchange history
      await addDoc(collection(db, 'exchangeHistory'), {
        matchId: exchange.id,
        userId: user.uid,
        partnerUserId: partnerId,
        partnerName: partnerName,
        completedAt: completedAt,
        rating: rating,
        notes: notes,
        exchangeDetails: exchange.exchangeDetails,
        completedBy: user.uid
      });

      toast.success('Rating submitted successfully!');
      onClose();
      
      // Refresh page to update UI
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('Failed to submit rating');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate {partnerName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              How was your exchange with {partnerName}?
            </p>
            
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.button
                  key={star}
                  onClick={() => setRating(star)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-1"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= rating
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </motion.button>
              ))}
            </div>
            
            <p className="text-sm font-medium">
              {rating === 1 && "Poor"}
              {rating === 2 && "Fair"}
              {rating === 3 && "Good"}
              {rating === 4 && "Very Good"}
              {rating === 5 && "Excellent"}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Notes (optional)
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Share your experience..."
              className="min-h-[80px]"
            />
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitRating}
              className="flex-1"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Submit Rating
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}