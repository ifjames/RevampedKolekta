export interface Location {
  lat: number;
  lng: number;
  geohash?: string;
}

export interface ExchangePost {
  id: string;
  userId: string;
  userInfo?: {
    name: string;
    rating: number;
    verified: boolean;
    completedExchanges?: number;
  };
  giveAmount: number;
  giveType: 'bill' | 'coins';
  needAmount: number;
  needType: 'bill' | 'coins';
  needBreakdown?: number[];
  notes?: string;
  location: Location;
  status: 'active' | 'matched' | 'completed' | 'cancelled';
  timestamp: Date;
  distance?: number;
}

export interface MatchRequest {
  id: string;
  postId: string;
  requesterUserId: string;
  postOwnerUserId: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: Date;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  verified: boolean;
  rating: number;
  completedExchanges: number;
  location?: Location;
  createdAt: Date;
}

export interface ChatMessage {
  id: string;
  matchId: string;
  sender: string;
  text: string;
  timestamp: Date;
  read: boolean;
  systemMessage?: boolean;
}

export interface Match {
  id: string;
  userA: string;
  userB: string;
  postAId: string;
  postBId: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  chatOpened: boolean;
  meetupLocation?: string;
  meetupTime?: Date;
  createdAt: Date;
}

export interface NotificationData {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  data?: Record<string, any>;
}
