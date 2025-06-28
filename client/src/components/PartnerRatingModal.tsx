import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, CheckCircle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useFirestoreOperations } from '@/hooks/useFirestore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';

interface PartnerRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  exchange: any | null;
  partnerName: string;
}

export function PartnerRatingModal({ isOpen, onClose, exchange, partnerName }: PartnerRatingModalProps) {
  const [rating, setRating] = useState(5);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { updateDocument, addDocument } = useFirestoreOperations();

  const handleRatePartner = async () => {
    if (!exchange || !user) return;
    
    setLoading(true);
    try {
      const partnerId = exchange.userA === user.uid ? exchange.userB : exchange.userA;
      const completedAt = new Date();

      // Update match with partner's rating
      await updateDocument('matches', exchange.id, {
        [`${user.uid}_rating`]: rating,
        [`${user.uid}_notes`]: notes,
        [`${user.uid}_completed`]: true,
        partnerRatedAt: completedAt
      });

      // Create exchange history record for current user
      await addDocument('exchangeHistory', {
        matchId: exchange.id,
        userId: user.uid,
        partnerUserId: partnerId,
        partnerName: partnerName,
        completedAt,
        duration: exchange.duration || 0,
        myRating: rating,
        myNotes: notes,
        exchangeAmount: exchange.exchangeDetails?.giveAmount || 0,
        exchangeType: exchange.exchangeDetails?.giveType || 'cash',
        initiatedBy: exchange.initiatedBy,
        completedBy: exchange.completedBy
      });

      // Add rating to user ratings collection
      await addDocument('userRatings', {
        ratedUserId: partnerId,
        raterUserId: user.uid,
        rating: rating,
        notes: notes,
        matchId: exchange.id,
        createdAt: completedAt
      });

      // Update user profile
      try {
        const { doc, updateDoc, increment } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        
        await updateDoc(doc(db, 'users', user.uid), {
          completedExchanges: increment(1),
          lastExchangeAt: completedAt
        });
      } catch (error) {
        console.error('Error updating user profile:', error);
      }

      toast.success('Thank you for rating your exchange partner!');
      onClose();
      setRating(5);
      setNotes('');
      
      // Reload to refresh data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('Error rating partner:', error);
      toast.error('Failed to submit rating. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!exchange) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-effect border-white/20 text-white max-w-md">
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl text-white mb-4">Rate Your Exchange</DialogTitle>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Partner Info */}
          <div className="bg-blue-900/30 rounded-lg p-4 text-center">
            <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-2" />
            <h3 className="text-lg font-semibold text-white">Exchange Completed!</h3>
            <p className="text-blue-100">
              Your exchange with <span className="font-medium">{partnerName}</span> is complete.
            </p>
          </div>

          {/* Rating Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-blue-100 mb-2">
                Rate your experience (1-5 stars)
              </label>
              <div className="flex justify-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="focus:outline-none transition-colors"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= rating
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-400'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-100 mb-2">
                Additional Comments (Optional)
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Share your experience..."
                className="glass-dark text-white border-white/20 focus:border-white/40"
                rows={3}
              />
            </div>
          </div>

          <Button
            onClick={handleRatePartner}
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting Rating...
              </>
            ) : (
              'Submit Rating'
            )}
          </Button>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}