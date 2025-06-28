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

    // Listen to completed exchanges from exchangeHistory collection
    const historyQuery = query(
      collection(db, 'exchangeHistory'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(historyQuery, (snapshot) => {
      console.log('Exchange history query result:', snapshot.docs.length, 'documents');
      
      const userExchanges = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Exchange history document:', doc.id, data);
        
        return {
          id: doc.id,
          matchId: data.matchId || data.exchangeId,
          partnerUserId: data.partnerUserId,
          partnerName: data.partnerName || 'Exchange Partner',
          completedAt: data.completedAt?.toDate() || new Date(),
          duration: data.duration || 0,
          rating: data.rating || 0,
          notes: data.notes || '',
          completedBy: data.userId,
          initiatedBy: data.initiatedBy,
          exchangeAmount: data.exchangeDetails?.giveAmount || 0,
          exchangeType: data.exchangeDetails?.giveType || 'cash',
        };
      }) as CompletedExchange[];
      
      // Sort by completion date on client side (most recent first)
      userExchanges.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
      
      console.log('Processed exchange history:', userExchanges);
      setCompletedExchanges(userExchanges);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching exchange history:', error);
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