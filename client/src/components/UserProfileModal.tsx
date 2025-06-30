import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { StarRating } from '@/components/ui/StarRating';
import { 
  User, 
  Shield, 
  Star, 
  Clock, 
  CheckCircle,
  AlertTriangle 
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userInfo: {
    name?: string;
    rating?: number;
    verified?: boolean;
    completedExchanges?: number;
  } | null;
}

export function UserProfileModal({ isOpen, onClose, userInfo }: UserProfileModalProps) {
  if (!userInfo) return null;

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-400';
    if (rating >= 3.5) return 'text-yellow-400';
    if (rating >= 2.5) return 'text-orange-400';
    return 'text-red-400';
  };

  const getTrustLevel = (rating: number, exchanges: number) => {
    if (rating >= 4.5 && exchanges >= 20) return { level: 'Highly Trusted', color: 'bg-green-500' };
    if (rating >= 4.0 && exchanges >= 10) return { level: 'Trusted', color: 'bg-blue-500' };
    if (rating >= 3.5 && exchanges >= 5) return { level: 'Reliable', color: 'bg-yellow-500' };
    if (exchanges >= 1) return { level: 'New Member', color: 'bg-gray-500' };
    return { level: 'Beginner', color: 'bg-gray-400' };
  };

  const trustLevel = getTrustLevel(userInfo.rating || 0, userInfo.completedExchanges || 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md glass-effect border-white/20">
        <DialogHeader className="text-center">
          <div className="w-16 h-16 cosmic-gradient rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-white text-xl flex items-center justify-center space-x-2">
            <span>{userInfo.name || 'User'}</span>
            {userInfo.verified && (
              <Badge className="bg-green-500 text-white text-xs px-2 py-1">
                <Shield className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Trust Level */}
          <Card className="glass-dark border-white/10">
            <CardContent className="p-4 text-center">
              <Badge className={`${trustLevel.color} text-white px-3 py-1 mb-2`}>
                {trustLevel.level}
              </Badge>
              <div className="text-blue-200 text-sm">
                Based on rating and exchange history
              </div>
            </CardContent>
          </Card>

          {/* Rating */}
          <Card className="glass-dark border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium">Rating</span>
                <span className={`font-bold ${getRatingColor(userInfo.rating || 0)}`}>
                  {(userInfo.rating || 0).toFixed(1)}/5.0
                </span>
              </div>
              <StarRating 
                rating={userInfo.rating || 0} 
                layout="horizontal" 
                size="md"
              />
              <div className="text-blue-200 text-xs mt-1">
                {(userInfo.rating || 0) >= 4.5 ? 'Excellent' : 
                 (userInfo.rating || 0) >= 3.5 ? 'Good' : 
                 (userInfo.rating || 0) >= 2.5 ? 'Fair' : 'Needs Improvement'}
              </div>
            </CardContent>
          </Card>

          {/* Exchange History */}
          <Card className="glass-dark border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium">Exchange History</span>
                <div className="flex items-center space-x-1">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span className="text-white font-bold">{userInfo.completedExchanges || 0}</span>
                </div>
              </div>
              <div className="text-blue-200 text-xs">
                {(userInfo.completedExchanges || 0) === 0 ? 'No completed exchanges yet' :
                 (userInfo.completedExchanges || 0) === 1 ? '1 successful exchange' :
                 `${userInfo.completedExchanges} successful exchanges`}
              </div>
            </CardContent>
          </Card>

          {/* Safety Tips */}
          <Card className="glass-dark border-amber-400/20 border">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="h-4 w-4 text-amber-400" />
                <span className="text-amber-100 font-medium text-sm">Safety Reminder</span>
              </div>
              <div className="text-amber-200 text-xs space-y-1">
                <div className="flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-2 flex-shrink-0" />
                  <span>Always meet in public, well-lit areas</span>
                </div>
                <div className="flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-2 flex-shrink-0" />
                  <span>Trust your instincts about the exchange</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}