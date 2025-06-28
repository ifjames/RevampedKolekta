import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFirestoreOperations } from './useFirestore';
import { useExchangeManagement } from './useExchangeManagement';
import { ExchangePost, Match } from '@/types';
import { toast } from 'react-hot-toast';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function useMatchingSystem() {
  const { user } = useAuth();
  const { addDocument, updateDocument } = useFirestoreOperations();
  const { createActiveExchange } = useExchangeManagement();

  // Send a match request
  const sendMatchRequest = async (targetPost: ExchangePost) => {
    if (!user) {
      toast.error("Please log in to send match requests.");
      return;
    }

    try {
      // Check if user already sent a request to this post
      const existingMatch = await checkExistingMatch(user.uid, targetPost.userId, targetPost.id);
      if (existingMatch) {
        toast.error("You've already sent a match request to this user.");
        return;
      }

      const matchData = {
        userA: user.uid,
        userB: targetPost.userId,
        userAName: user.displayName || user.email || 'User',
        userBName: targetPost.userInfo?.name || 'Exchange Partner',
        postAId: 'quick-match',
        postBId: targetPost.id,
        status: 'pending' as const,
        chatOpened: false,
        createdAt: new Date()
      };

      const matchRef = await addDocument('matches', matchData);
      console.log('Match created:', matchRef);
      
      // Add console log to track the success path
      console.log('About to show success toast for match request');

      // Create notification for the target user
      const notificationData = {
        userId: targetPost.userId,
        type: 'match_found',
        title: 'New Match Request!',
        message: `${user.displayName || user.email || 'Someone'} wants to exchange with you!`,
        data: { 
          matchId: matchRef,
          requesterName: user.displayName || user.email,
          postId: targetPost.id
        },
        read: false,
        deleted: false,
        createdAt: new Date()
      };

      const notificationRef = await addDocument('notifications', notificationData);
      console.log('Notification created:', notificationRef);

      toast.success("Match request sent! You'll be notified when they respond.");

      return matchRef;
    } catch (error) {
      console.error('Error sending match request:', error);
      toast.error("Failed to send match request. Please try again.");
    }
  };

  // Accept a match request
  const acceptMatchRequest = async (matchId: string, requesterUserId: string) => {
    if (!user) return;

    try {
      // Get match details to create active exchange
      const matchQuery = query(collection(db, 'matches'), where('__name__', '==', matchId));
      const matchSnapshot = await getDocs(matchQuery);
      const matchData = matchSnapshot.docs[0]?.data();

      if (!matchData) {
        toast.error("Match not found");
        return;
      }

      // Update match status
      await updateDocument('matches', matchId, {
        status: 'confirmed',
        chatOpened: true
      });

      // Create active exchange
      const exchangeData = {
        matchId,
        userA: matchData.userA,
        userB: matchData.userB,
        userAName: user.displayName || user.email || 'User A',
        userBName: 'Exchange Partner',
        postAId: matchData.postAId,
        postBId: matchData.postBId,
        status: 'active',
        participants: [matchData.userA, matchData.userB],
        initiatedBy: matchData.userA,
        partnerUser: matchData.userA === user.uid ? matchData.userB : matchData.userA,
        partnerName: 'Exchange Partner',
        exchangeDetails: {
          giveAmount: 1000,
          giveType: 'bill',
          needAmount: 1000,
          needType: 'coins',
        },
        createdAt: new Date(),
      };

      await addDocument('activeExchanges', exchangeData);

      // Create chat document
      await addDocument('chats', {
        exchangeId: matchId,
        participants: [matchData.userA, matchData.userB],
        participantNames: [user.displayName || user.email || 'User', 'Exchange Partner'],
        lastMessage: '',
        lastMessageAt: new Date(),
        createdAt: new Date(),
      });

      // Create notification for requester
      await addDocument('notifications', {
        userId: requesterUserId,
        type: 'match_confirmed',
        title: 'Match Confirmed!',
        message: 'Your exchange request has been accepted. You can now chat with your match.',
        data: { matchId },
        read: false,
        deleted: false,
        createdAt: new Date()
      });

      toast.success("Match accepted! You can now chat with your exchange partner.");
    } catch (error) {
      console.error('Error accepting match:', error);
      toast.error("Failed to accept match. Please try again.");
    }
  };

  // Decline a match request
  const declineMatchRequest = async (matchId: string, requesterUserId: string) => {
    if (!user) return;

    try {
      await updateDocument('matches', matchId, {
        status: 'declined'
      });

      // Create notification for requester
      await addDocument('notifications', {
        userId: requesterUserId,
        type: 'match_declined',
        title: 'Match Declined',
        message: 'Your exchange request was declined.',
        data: { matchId },
        read: false,
        deleted: false,
        createdAt: new Date()
      });

      toast.success("Match request has been declined.");
    } catch (error) {
      console.error('Error declining match:', error);
      toast.error("Failed to decline match. Please try again.");
    }
  };

  // Check if user already has a pending/confirmed match with target user
  const checkExistingMatch = async (userA: string, userB: string, postId: string): Promise<boolean> => {
    try {
      const { getDocs, query, collection, where } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      
      // Check userA -> userB
      const query1 = query(
        collection(db, 'matches'),
        where('userA', '==', userA),
        where('userB', '==', userB),
        where('status', 'in', ['pending', 'confirmed'])
      );
      
      // Check userB -> userA  
      const query2 = query(
        collection(db, 'matches'),
        where('userA', '==', userB),
        where('userB', '==', userA),
        where('status', 'in', ['pending', 'confirmed'])
      );
      
      const [result1, result2] = await Promise.all([
        getDocs(query1),
        getDocs(query2)
      ]);
      
      return !result1.empty || !result2.empty;
    } catch (error) {
      console.error('Error checking existing match:', error);
      return false; // Allow the request if we can't check
    }
  };

  return {
    sendMatchRequest,
    acceptMatchRequest,
    declineMatchRequest
  };
}