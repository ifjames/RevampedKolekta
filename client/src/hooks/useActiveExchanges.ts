import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, or, getDocs, getDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export interface ActiveExchange {
  id: string;
  matchId: string;
  userA: string;
  userB: string;
  userAName: string;
  userBName: string;
  postAId: string;
  postBId: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: Date;
  completedAt?: Date;
  initiatedBy: string; // Who created the original post
  partnerUser: string; // The other user in the exchange
  partnerName: string;
  exchangeDetails: {
    giveAmount: number;
    giveType: string;
    needAmount: number;
    needType: string;
    location?: {
      lat: number;
      lng: number;
      address?: string;
    };
  };
  duration?: number; // in minutes
  rating?: number;
  notes?: string;
}

export interface ExchangeHistory {
  id: string;
  exchangeId: string;
  partnerName: string;
  partnerUserId: string;
  completedAt: Date;
  duration: number; // in minutes
  rating: number;
  notes: string;
  exchangeDetails: {
    giveAmount: number;
    giveType: string;
    needAmount: number;
    needType: string;
  };
  initiatedBy: string;
}

export function useActiveExchanges() {
  const { user } = useAuth();
  const [activeExchanges, setActiveExchanges] = useState<ActiveExchange[]>([]);
  const [exchangeHistory, setExchangeHistory] = useState<ExchangeHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // Auto-recovery function to restore lost matches/chats
  const autoRecoverLostExchanges = async () => {
    if (!user?.uid) return;

    try {
      // Simplified auto-recovery - just ensure existing confirmed matches have active exchanges
      console.log('Running auto-recovery for user:', user.uid);
      
      // Skip complex recovery for now and focus on main functionality
      // This can be implemented later once the basic enhanced matching is working
    } catch (error) {
      console.error('Error in auto-recovery:', error);
    }
  };

  useEffect(() => {
    if (!user) {
      setActiveExchanges([]);
      setExchangeHistory([]);
      setLoading(false);
      return;
    }

    // Run auto-recovery on mount
    autoRecoverLostExchanges();

    // Listen to active exchanges where user is involved (using simpler query)
    const activeQuery = query(
      collection(db, 'activeExchanges'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribeActive = onSnapshot(activeQuery, (snapshot) => {
      const exchanges = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        completedAt: doc.data().completedAt?.toDate(),
      })) as ActiveExchange[];
      
      // Filter for active status on client side
      const activeOnly = exchanges.filter(ex => ex.status === 'active');
      setActiveExchanges(activeOnly);
      setLoading(false);
    });

    // Listen to exchange history (using or query to get both old and new records)
    const historyQuery = query(
      collection(db, 'exchangeHistory'),
      where('userId', '==', user.uid)
    );

    const unsubscribeHistory = onSnapshot(historyQuery, (snapshot) => {
      const history = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          exchangeId: data.exchangeId || data.matchId,
          partnerName: data.partnerName,
          partnerUserId: data.partnerUserId,
          completedAt: data.completedAt?.toDate() || new Date(),
          duration: data.duration || 0,
          rating: data.rating || data.myRating || 0,
          notes: data.notes || data.myNotes || '',
          exchangeDetails: data.exchangeDetails || {
            giveAmount: data.exchangeAmount || 0,
            giveType: data.exchangeType || 'cash',
            needAmount: 0,
            needType: 'cash'
          },
          initiatedBy: data.initiatedBy
        };
      }) as ExchangeHistory[];
      
      // Sort by completed date on client side
      history.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
      setExchangeHistory(history);
    });

    return () => {
      unsubscribeActive();
      unsubscribeHistory();
    };
  }, [user]);

  return {
    activeExchanges,
    exchangeHistory,
    loading,
  };
}