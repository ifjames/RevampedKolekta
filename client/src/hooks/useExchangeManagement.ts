import { useState } from 'react';
import { useFirestoreOperations } from './useFirestore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';

export function useExchangeManagement() {
  const { user } = useAuth();
  const { addDocument, updateDocument } = useFirestoreOperations();
  const [loading, setLoading] = useState(false);

  const createActiveExchange = async (match: any, postA: any, postB: any) => {
    if (!user) throw new Error('User not authenticated');
    
    setLoading(true);
    try {
      const exchangeData = {
        matchId: match.id,
        userA: match.userA,
        userB: match.userB,
        userAName: match.userAName || 'User A',
        userBName: match.userBName || 'User B',
        postAId: match.postAId,
        postBId: match.postBId,
        status: 'active',
        participants: [match.userA, match.userB],
        initiatedBy: match.userA, // User who created the original post
        exchangeDetails: {
          giveAmount: postA?.giveAmount || 0,
          giveType: postA?.giveType || '',
          needAmount: postA?.needAmount || 0,
          needType: postA?.needType || '',
          location: postA?.location || null,
        },
        createdAt: new Date(),
      };

      const exchangeId = await addDocument('activeExchanges', exchangeData);
      
      // Create chat document
      await addDocument('chats', {
        exchangeId,
        participants: [match.userA, match.userB],
        participantNames: [match.userAName || 'User A', match.userBName || 'User B'],
        lastMessage: '',
        lastMessageAt: new Date(),
        createdAt: new Date(),
      });

      toast.success('Exchange created! You can now chat with your partner.');
      return exchangeId;
    } catch (error) {
      console.error('Error creating active exchange:', error);
      toast.error('Failed to create exchange');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const completeExchange = async (exchangeId: string, rating: number, notes: string = '') => {
    if (!user) throw new Error('User not authenticated');
    
    setLoading(true);
    try {
      // Get the active exchange
      const exchange = await fetch(`/api/activeExchanges/${exchangeId}`).then(res => res.json());
      
      if (exchange.initiatedBy !== user.uid) {
        toast.error('Only the post creator can complete the exchange');
        return;
      }

      const completedAt = new Date();
      const duration = Math.round((completedAt.getTime() - exchange.createdAt.getTime()) / (1000 * 60)); // in minutes

      // Update active exchange to completed
      await updateDocument('activeExchanges', exchangeId, {
        status: 'completed',
        completedAt,
        duration,
        rating,
        notes,
      });

      // Create exchange history record
      await addDocument('exchangeHistory', {
        exchangeId,
        partnerName: exchange.userA === user.uid ? exchange.userBName : exchange.userAName,
        partnerUserId: exchange.userA === user.uid ? exchange.userB : exchange.userA,
        completedAt,
        duration,
        rating,
        notes,
        exchangeDetails: exchange.exchangeDetails,
        initiatedBy: exchange.initiatedBy,
        participants: [exchange.userA, exchange.userB],
      });

      // Update user profiles with completed exchange count and rating
      const partnerUserId = exchange.userA === user.uid ? exchange.userB : exchange.userA;
      
      // Update both users' stats
      await Promise.all([
        updateUserStats(user.uid, rating),
        updateUserStats(partnerUserId, rating),
      ]);

      toast.success('Exchange completed successfully!');
      return true;
    } catch (error) {
      console.error('Error completing exchange:', error);
      toast.error('Failed to complete exchange');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateUserStats = async (userId: string, rating: number) => {
    try {
      // In a real app, this would update the user's profile in Firestore
      // For now, we'll just log it
      console.log(`Updating stats for user ${userId} with rating ${rating}`);
    } catch (error) {
      console.error('Error updating user stats:', error);
    }
  };

  const cancelExchange = async (exchangeId: string, reason: string = '') => {
    if (!user) throw new Error('User not authenticated');
    
    setLoading(true);
    try {
      await updateDocument('activeExchanges', exchangeId, {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy: user.uid,
        cancelReason: reason,
      });

      toast.success('Exchange cancelled');
      return true;
    } catch (error) {
      console.error('Error cancelling exchange:', error);
      toast.error('Failed to cancel exchange');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    createActiveExchange,
    completeExchange,
    cancelExchange,
    loading,
  };
}