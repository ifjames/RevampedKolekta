import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { useFirestoreOperations, useCollection } from '@/hooks/useFirestore';
import { ExchangePost, MatchRequest } from '@/types';
import { distance } from '@/lib/geohash';
import { where, orderBy, limit } from 'firebase/firestore';
import { showMatchFound, toastSuccess, toastError } from '@/utils/notifications';

export function useMatching() {
  const { user } = useAuth();
  const { location } = useLocation();
  const { addDocument, updateDocument } = useFirestoreOperations();
  const [matches, setMatches] = useState<ExchangePost[]>([]);
  const [loading, setLoading] = useState(false);

  // Get nearby posts that could match
  const { data: nearbyPosts } = useCollection<ExchangePost>('posts', [
    where('status', '==', 'active'),
    where('userId', '!=', user?.uid || ''),
    orderBy('userId'),
    orderBy('timestamp', 'desc'),
    limit(50)
  ]);

  // Get incoming match requests
  const { data: incomingRequests } = useCollection<MatchRequest>('matchRequests', [
    where('postOwnerUserId', '==', user?.uid || ''),
    where('status', 'in', ['pending'])
  ]);

  // Get outgoing match requests
  const { data: outgoingRequests } = useCollection<MatchRequest>('matchRequests', [
    where('requesterUserId', '==', user?.uid || ''),
    where('status', 'in', ['pending', 'accepted'])
  ]);

  const findMatches = (userPost: Omit<ExchangePost, 'id' | 'timestamp'>) => {
    if (!location || !nearbyPosts.length) return [];

    const potentialMatches = nearbyPosts.filter(post => {
      // Check for reciprocal exchange
      const isReciprocalMatch = 
        post.giveAmount === userPost.needAmount &&
        post.giveType === userPost.needType &&
        post.needAmount === userPost.giveAmount &&
        post.needType === userPost.giveType;

      if (!isReciprocalMatch) return false;

      // Check proximity (within 5km)
      const dist = distance(
        location.lat,
        location.lng,
        post.location.lat,
        post.location.lng
      );

      return dist <= 5; // 5km radius
    });

    // Sort by distance, then by verification status, then by rating
    return potentialMatches
      .map(post => ({
        ...post,
        distance: distance(
          location.lat,
          location.lng,
          post.location.lat,
          post.location.lng
        )
      }))
      .sort((a, b) => {
        // Prioritize by distance
        if (a.distance !== b.distance) {
          return a.distance - b.distance;
        }
        
        // Then by verification status
        const aVerified = a.userInfo?.verified || false;
        const bVerified = b.userInfo?.verified || false;
        if (aVerified !== bVerified) {
          return bVerified ? 1 : -1;
        }
        
        // Finally by rating
        const aRating = a.userInfo?.rating || 0;
        const bRating = b.userInfo?.rating || 0;
        return bRating - aRating;
      });
  };

  const requestMatch = async (postId: string) => {
    if (!user) {
      toastError('Please log in to request matches');
      return;
    }

    setLoading(true);
    
    try {
      // Check if already requested
      const existingRequest = outgoingRequests.find(req => req.postId === postId);
      if (existingRequest) {
        toastError('Match request already sent');
        setLoading(false);
        return;
      }

      const post = nearbyPosts.find(p => p.id === postId);
      if (!post) {
        toastError('Post not found');
        setLoading(false);
        return;
      }

      await addDocument('matchRequests', {
        postId,
        requesterUserId: user.uid,
        postOwnerUserId: post.userId,
        status: 'pending',
      });

      toastSuccess('Match request sent!');
    } catch (error) {
      console.error('Error requesting match:', error);
      toastError('Failed to send match request');
    } finally {
      setLoading(false);
    }
  };

  const respondToMatch = async (requestId: string, accept: boolean) => {
    if (!user) return;

    setLoading(true);
    
    try {
      const status = accept ? 'accepted' : 'declined';
      await updateDocument('matchRequests', requestId, { status });

      if (accept) {
        const request = incomingRequests.find(req => req.id === requestId);
        if (request) {
          // Create actual match
          await addDocument('matches', {
            userA: request.requesterUserId,
            userB: user.uid,
            postAId: '', // Will need to find the requester's post
            postBId: request.postId,
            status: 'pending',
            chatOpened: false,
          });

          // Show success notification
          await showMatchFound({
            giveAmount: 1000, // This would come from actual post data
            needAmount: 1000,
          });
          
          toastSuccess('Match confirmed! You can now chat.');
        }
      } else {
        toastSuccess('Match request declined');
      }
    } catch (error) {
      console.error('Error responding to match:', error);
      toastError('Failed to respond to match request');
    } finally {
      setLoading(false);
    }
  };

  return {
    matches,
    nearbyPosts: nearbyPosts.map(post => ({
      ...post,
      distance: location ? distance(
        location.lat,
        location.lng,
        post.location.lat,
        post.location.lng
      ) : undefined
    })),
    incomingRequests,
    outgoingRequests,
    loading,
    findMatches,
    requestMatch,
    respondToMatch,
  };
}
