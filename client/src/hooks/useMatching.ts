import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { ExchangePost, Match } from '@/types';
import { distance } from '@/lib/geohash';
import { useFirestoreOperations } from './useFirestore';
import { toastSuccess, showMatchFound } from '@/utils/notifications';

interface MatchingOptions {
  maxDistance: number; // in kilometers
  prioritizeVerified: boolean;
  prioritizeHighRated: boolean;
  autoAcceptMatches: boolean;
}

export function useMatching() {
  const { user } = useAuth();
  const { location } = useLocation();
  const { addDocument, updateDocument } = useFirestoreOperations();
  const [matches, setMatches] = useState<ExchangePost[]>([]);
  const [matchRequests, setMatchRequests] = useState<Match[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [matchingOptions, setMatchingOptions] = useState<MatchingOptions>({
    maxDistance: 5,
    prioritizeVerified: true,
    prioritizeHighRated: true,
    autoAcceptMatches: false
  });

  // Smart matching algorithm
  const findMatches = (userPost: ExchangePost, availablePosts: ExchangePost[]): ExchangePost[] => {
    if (!location) return [];

    const potentialMatches = availablePosts.filter(post => {
      // Exclude own posts
      if (post.userId === user?.uid) return false;

      // Check if it's a reciprocal match
      const isReciprocalMatch = 
        post.giveAmount === userPost.needAmount &&
        post.giveType === userPost.needType &&
        post.needAmount === userPost.giveAmount &&
        post.needType === userPost.giveType;

      if (!isReciprocalMatch) return false;

      // Check distance
      const dist = distance(
        location.lat, 
        location.lng, 
        post.location.lat, 
        post.location.lng
      );

      return dist <= matchingOptions.maxDistance;
    });

    // Sort by priority algorithm
    return potentialMatches
      .map(post => {
        const dist = distance(location.lat, location.lng, post.location.lat, post.location.lng);
        let score = 0;

        // Distance score (closer = higher score)
        score += Math.max(0, 100 - (dist * 20));

        // Verification bonus
        if (matchingOptions.prioritizeVerified && post.userInfo?.verified) {
          score += 50;
        }

        // Rating bonus
        if (matchingOptions.prioritizeHighRated && post.userInfo?.rating) {
          score += post.userInfo.rating * 10;
        }

        // Recency bonus (newer posts get priority)
        const hoursSincePost = (Date.now() - post.timestamp.getTime()) / (1000 * 60 * 60);
        score += Math.max(0, 20 - hoursSincePost);

        return { ...post, distance: dist, matchScore: score };
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  };

  // Listen for potential matches based on user's active posts
  useEffect(() => {
    if (!user?.uid || !location) return;

    setIsSearching(true);

    // Listen to user's active posts
    const userPostsQuery = query(
      collection(db, 'posts'),
      where('userId', '==', user.uid),
      where('status', '==', 'active'),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const unsubscribeUserPosts = onSnapshot(userPostsQuery, (userPostsSnapshot) => {
      const userPosts = userPostsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      })) as ExchangePost[];

      if (userPosts.length === 0) {
        setMatches([]);
        setIsSearching(false);
        return;
      }

      // Listen to all other active posts for matching
      const allPostsQuery = query(
        collection(db, 'posts'),
        where('status', '==', 'active'),
        where('userId', '!=', user.uid),
        orderBy('timestamp', 'desc'),
        limit(100)
      );

      const unsubscribeAllPosts = onSnapshot(allPostsQuery, (allPostsSnapshot) => {
        const allPosts = allPostsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date()
        })) as ExchangePost[];

        // Find matches for each user post
        const allMatches: ExchangePost[] = [];
        userPosts.forEach(userPost => {
          const postMatches = findMatches(userPost, allPosts);
          allMatches.push(...postMatches);
        });

        // Remove duplicates and set matches
        const uniqueMatches = allMatches.filter((match, index, self) =>
          index === self.findIndex(m => m.id === match.id)
        );

        setMatches(uniqueMatches);
        setIsSearching(false);

        // Notify user of new matches
        if (uniqueMatches.length > 0) {
          const newMatches = uniqueMatches.filter(match => 
            !matches.some(existing => existing.id === match.id)
          );
          
          if (newMatches.length > 0) {
            showMatchFound({
              count: newMatches.length,
              closest: newMatches[0]
            });
          }
        }
      });

      return () => unsubscribeAllPosts();
    });

    return () => unsubscribeUserPosts();
  }, [user?.uid, location, matchingOptions]);

  // Listen for match requests
  useEffect(() => {
    if (!user?.uid) return;

    const matchRequestsQuery = query(
      collection(db, 'matches'),
      where('userB', '==', user.uid),
      where('status', 'in', ['pending', 'confirmed']),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(matchRequestsQuery, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Match[];

      setMatchRequests(requests);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Request a match with another user
  const requestMatch = async (targetPost: ExchangePost, userPost: ExchangePost) => {
    if (!user?.uid) throw new Error('User not authenticated');

    try {
      const matchData = {
        userA: user.uid,
        userB: targetPost.userId,
        postAId: userPost.id,
        postBId: targetPost.id,
        status: 'pending' as const,
        chatOpened: false,
        createdAt: new Date()
      };

      const matchRef = await addDocument('matches', matchData);

      // Create notification for the target user
      await addDocument('notifications', {
        userId: targetPost.userId,
        type: 'match_found',
        title: 'New Match Request!',
        message: `Someone wants to exchange with you: ₱${userPost.giveAmount} ${userPost.giveType} for ₱${userPost.needAmount} ${userPost.needType}`,
        data: { matchId: matchRef },
        read: false,
        createdAt: new Date()
      });

      toastSuccess('Match request sent!');
      return matchRef;
    } catch (error) {
      console.error('Error requesting match:', error);
      throw error;
    }
  };

  // Accept a match request
  const acceptMatch = async (matchId: string) => {
    try {
      await updateDocument('matches', matchId, {
        status: 'confirmed',
        chatOpened: true
      });

      const match = matchRequests.find(m => m.id === matchId);
      if (match) {
        // Create notification for requester
        await addDocument('notifications', {
          userId: match.userA,
          type: 'match_confirmed',
          title: 'Match Confirmed!',
          message: 'Your exchange request has been accepted. You can now chat with your match.',
          data: { matchId },
          read: false,
          createdAt: new Date()
        });
      }

      toastSuccess('Match accepted! You can now chat.');
    } catch (error) {
      console.error('Error accepting match:', error);
      throw error;
    }
  };

  // Decline a match request
  const declineMatch = async (matchId: string) => {
    try {
      await updateDocument('matches', matchId, {
        status: 'declined'
      });

      toastSuccess('Match declined.');
    } catch (error) {
      console.error('Error declining match:', error);
      throw error;
    }
  };

  // Complete an exchange
  const completeExchange = async (matchId: string, rating: number) => {
    try {
      await updateDocument('matches', matchId, {
        status: 'completed',
        completedAt: new Date()
      });

      const match = matchRequests.find(m => m.id === matchId);
      if (match) {
        // Update user ratings and exchange counts
        // This would typically be done in a cloud function for security
        
        // Create notification for other user
        await addDocument('notifications', {
          userId: match.userA === user?.uid ? match.userB : match.userA,
          type: 'exchange_completed',
          title: 'Exchange Completed!',
          message: 'Your exchange has been marked as completed. Please rate your experience.',
          data: { matchId, rating },
          read: false,
          createdAt: new Date()
        });
      }

      toastSuccess('Exchange completed successfully!');
    } catch (error) {
      console.error('Error completing exchange:', error);
      throw error;
    }
  };

  // Report no-show
  const reportNoShow = async (matchId: string, reason: string) => {
    try {
      await updateDocument('matches', matchId, {
        status: 'no_show',
        noShowReason: reason,
        reportedAt: new Date()
      });

      const match = matchRequests.find(m => m.id === matchId);
      if (match) {
        // Create report document
        await addDocument('reports', {
          reporterId: user?.uid,
          reportedUser: match.userA === user?.uid ? match.userB : match.userA,
          matchId,
          issueType: 'no_show',
          description: reason,
          status: 'pending',
          createdAt: new Date()
        });

        // Create notification for reported user
        await addDocument('notifications', {
          userId: match.userA === user?.uid ? match.userB : match.userA,
          type: 'no_show_reported',
          title: 'No-Show Reported',
          message: 'You have been reported for not showing up to an exchange.',
          data: { matchId },
          read: false,
          createdAt: new Date()
        });
      }

      toastSuccess('No-show reported.');
    } catch (error) {
      console.error('Error reporting no-show:', error);
      throw error;
    }
  };

  return {
    matches,
    matchRequests,
    isSearching,
    matchingOptions,
    setMatchingOptions,
    requestMatch,
    acceptMatch,
    declineMatch,
    completeExchange,
    reportNoShow
  };
}