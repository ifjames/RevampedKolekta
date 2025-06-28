import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export interface CompletedExchange {
  id: string;
  matchId: string;
  partnerUserId: string;
  partnerName: string;
  completedAt: Date;
  duration: number; // in minutes
  rating: number;
  notes: string;
  completedBy: string;
  initiatedBy: string;
  exchangeAmount: number;
  exchangeType: string;
}

export function useExchangeHistory() {
  const { user } = useAuth();
  const [completedExchanges, setCompletedExchanges] = useState<CompletedExchange[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCompletedExchanges([]);
      setLoading(false);
      return;
    }

    // Listen to completed exchanges from matches collection
    const matchesQuery = query(
      collection(db, 'matches'),
      where('status', '==', 'completed')
    );

    const unsubscribe = onSnapshot(matchesQuery, (snapshot) => {
      const allMatches = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        completedAt: doc.data().completedAt?.toDate() || new Date(),
      }));
      
      const userExchanges = allMatches
        .filter((match: any) => match.userA === user.uid || match.userB === user.uid)
        .map((match: any) => ({
          id: match.id,
          matchId: match.id,
          partnerUserId: match.userA === user.uid ? match.userB : match.userA,
          partnerName: 'Exchange Partner',
          completedAt: match.completedAt,
          duration: match.duration || 30,
          rating: match.rating || 5,
          notes: match.notes || '',
          completedBy: match.completedBy || match.userA,
          initiatedBy: match.userA,
          exchangeAmount: 1000,
          exchangeType: 'cash',
        })) as CompletedExchange[];
      
      // Sort by completion date (most recent first)
      userExchanges.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
      
      setCompletedExchanges(userExchanges);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const getRecentExchanges = (limit: number = 3) => {
    return completedExchanges.slice(0, limit);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
  };

  return {
    completedExchanges,
    loading,
    getRecentExchanges,
    formatDuration,
  };
}