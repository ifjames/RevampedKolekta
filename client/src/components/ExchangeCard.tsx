import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { MapPin, ArrowLeftRight, Handshake, Star, Shield, Map, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExchangePost } from '@/types';
import { formatTimeAgo } from '@/utils/timeUtils';
import { getUserVerificationStatus } from '@/utils/dataCleanup';

interface ExchangeCardProps {
  post: ExchangePost;
  onMatch: () => void;
  onViewMap?: () => void;
}

export function ExchangeCard({ post, onMatch, onViewMap }: ExchangeCardProps) {
  const [isVerified, setIsVerified] = useState(false);
  
  // Check actual verification status from database
  useEffect(() => {
    if (post.userId) {
      getUserVerificationStatus(post.userId).then(setIsVerified);
    }
  }, [post.userId]);

  // Star rating calculation
  const getStarRating = (rating: number) => {
    if (rating < 0) {
      return {
        stars: 0,
        showWarning: true,
        color: 'text-red-400'
      };
    }
    
    const stars = Math.min(5, Math.max(1, Math.ceil(rating)));
    
    return {
      stars,
      showWarning: false,
      color: rating >= 4 ? 'text-yellow-400' : rating >= 2 ? 'text-yellow-300' : 'text-yellow-200'
    };
  };

  const renderStarRating = (rating: number) => {
    const { stars, showWarning, color } = getStarRating(rating);
    
    if (showWarning) {
      return (
        <div className="flex items-center space-x-1">
          <AlertTriangle className="h-3 w-3 text-red-400" />
          <span className="text-red-400 text-xs">Poor</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center space-x-1">
        {[...Array(Math.min(3, stars))].map((_, i) => (
          <Star
            key={i}
            className={`h-3 w-3 ${color} fill-current`}
          />
        ))}
        <span className="text-blue-200 text-xs">{rating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="glass-effect rounded-xl hover:bg-opacity-20 transition-all duration-300 border-white/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-semibold">
                  {post.userInfo?.name?.charAt(0) || 'U'}
                </span>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-white font-medium">{post.userInfo?.name || 'User'}</span>
                  {isVerified && (
                    <Badge className="bg-green-500 text-white text-xs px-1 py-0">
                      <Shield className="h-2 w-2 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-1 mt-1">
                  {post.userInfo?.rating !== undefined && (
                    renderStarRating(post.userInfo.rating)
                  )}
                </div>
              </div>
            </div>
            <span className="text-blue-100 text-sm">
              {formatTimeAgo(post.timestamp)}
            </span>
          </div>
          
          <div className="grid grid-cols-3 gap-4 items-center mb-4">
            <div className="text-center">
              <p className="text-green-400 font-bold text-lg">₱{post.giveAmount}</p>
              <p className="text-blue-100 text-sm capitalize">{post.giveType}</p>
              <Badge variant="outline" className="text-xs border-green-400/50 text-green-400">
                Give
              </Badge>
            </div>
            <div className="text-center">
              <ArrowLeftRight className="h-6 w-6 text-cyan-400 mx-auto" />
            </div>
            <div className="text-center">
              <p className="text-blue-400 font-bold text-lg">₱{post.needAmount}</p>
              <p className="text-blue-100 text-sm capitalize">{post.needType}</p>
              <Badge variant="outline" className="text-xs border-blue-400/50 text-blue-400">
                Need
              </Badge>
            </div>
          </div>
          
          {post.needBreakdown && post.needBreakdown.length > 0 && (
            <div className="mb-3">
              <p className="text-blue-100 text-sm">
                <span className="font-medium">Breakdown:</span> {post.needBreakdown.join(' + ')}
              </p>
            </div>
          )}

          {post.notes && (
            <div className="mb-4">
              <p className="text-blue-100 text-sm">
                <span className="font-medium">Notes:</span> {post.notes}
              </p>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center text-blue-100 text-sm">
              <MapPin className="h-4 w-4 mr-1" />
              <span>
                {post.distance 
                  ? `${post.distance.toFixed(1)}km away`
                  : 'Nearby'
                }
              </span>
            </div>
            <div className="flex gap-2">
              {onViewMap && (
                <Button
                  onClick={onViewMap}
                  size="sm"
                  variant="outline"
                  className="glass-dark text-white border-white/20 hover:bg-white/10"
                >
                  <Map className="mr-1 h-4 w-4" />
                  View Map
                </Button>
              )}
              <Button
                onClick={onMatch}
                size="sm"
                className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white"
              >
                <Handshake className="mr-1 h-4 w-4" />
                Match
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
