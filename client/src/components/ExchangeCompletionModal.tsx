import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Clock, MessageSquare, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

      // Update match status to completed
      await updateDocument('matches', exchange.id, {
        status: 'completed',
        completedAt,
        duration,
        rating,
        notes,
        completedBy: user.uid
      });

      // Create exchange history record
      await addDocument('exchangeHistory', {
        matchId: exchange.id,
        partnerUserId: exchange.userA === user.uid ? exchange.userB : exchange.userA,
        partnerName: 'Exchange Partner',
        completedAt,
        duration,
        rating,
        notes,
        completedBy: user.uid,
        initiatedBy: exchange.userA,
        exchangeAmount: 1000,
        exchangeType: 'cash',
      });

      toast.success('Exchange completed successfully!');
      onClose();
      setRating(5);
      setNotes('');
    } catch (error) {
      console.error('Error completing exchange:', error);
      toast.error('Failed to complete exchange');
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
        <DialogHeader>
          <DialogTitle className="flex items-center text-white">
            <CheckCircle className="mr-2 h-5 w-5 text-green-400" />
            Complete Exchange
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Exchange Summary */}
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <h3 className="font-semibold mb-2">Exchange Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-100">Partner:</span>
                <span>{exchange.partnerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-100">Exchange Type:</span>
                <span>Cash Exchange</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-100">Partner:</span>
                <span>Exchange Partner</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-100">Duration:</span>
                <span className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDuration()}
                </span>
              </div>
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-medium mb-2">Rate this exchange</label>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`p-1 transition-colors ${
                    star <= rating ? 'text-yellow-400' : 'text-gray-400'
                  }`}
                >
                  <Star className="h-6 w-6 fill-current" />
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">Notes (optional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How was the exchange? Any feedback for your partner?"
              className="glass-input text-white placeholder:text-blue-200"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 glass-dark text-white border-white/20 hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleComplete}
              disabled={loading}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Completing...
                </div>
              ) : (
                'Complete Exchange'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}