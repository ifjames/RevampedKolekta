import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFirestoreOperations } from './useFirestore';
import { ExchangePost, Match } from '@/types';
import { toast } from '@/hooks/use-toast';

export function useMatchingSystem() {
  const { user } = useAuth();
  const { addDocument, updateDocument } = useFirestoreOperations();

  // Send a match request
  const sendMatchRequest = async (targetPost: ExchangePost) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to send match requests."
      });
      return;
    }

    try {
      // Check if user already sent a request to this post
      const existingMatch = await checkExistingMatch(user.uid, targetPost.userId, targetPost.id);
      if (existingMatch) {
        toast({
          title: "Request Already Sent",
          description: "You've already sent a match request to this user."
        });
        return;
      }

      const matchData = {
        userA: user.uid,
        userB: targetPost.userId,
        postAId: 'quick-match',
        postBId: targetPost.id,
        status: 'pending' as const,
        chatOpened: false,
        createdAt: new Date()
      };

      const matchRef = await addDocument('matches', matchData);
      console.log('Match created:', matchRef);

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

      toast({
        title: "Match Request Sent!",
        description: "You'll be notified when they respond."
      });

      return matchRef;
    } catch (error) {
      console.error('Error sending match request:', error);
      toast({
        title: "Error",
        description: "Failed to send match request. Please try again."
      });
    }
  };

  // Accept a match request
  const acceptMatchRequest = async (matchId: string, requesterUserId: string) => {
    if (!user) return;

    try {
      await updateDocument('matches', matchId, {
        status: 'confirmed',
        chatOpened: true
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

      // Create initial chat document
      await addDocument('chats', {
        matchId,
        participants: [requesterUserId, user.uid],
        lastMessage: null,
        lastMessageTime: new Date(),
        messages: [],
        createdAt: new Date()
      });

      toast({
        title: "Match Accepted!",
        description: "You can now chat with your exchange partner."
      });
    } catch (error) {
      console.error('Error accepting match:', error);
      toast({
        title: "Error",
        description: "Failed to accept match. Please try again."
      });
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

      toast({
        title: "Match Declined",
        description: "The match request has been declined."
      });
    } catch (error) {
      console.error('Error declining match:', error);
      toast({
        title: "Error",
        description: "Failed to decline match. Please try again."
      });
    }
  };

  // Check if user already has a pending/confirmed match with target user
  const checkExistingMatch = async (userA: string, userB: string, postId: string): Promise<boolean> => {
    try {
      // This would typically query the database
      // For now, we'll return false to allow the request
      return false;
    } catch (error) {
      console.error('Error checking existing match:', error);
      return false;
    }
  };

  return {
    sendMatchRequest,
    acceptMatchRequest,
    declineMatchRequest
  };
}