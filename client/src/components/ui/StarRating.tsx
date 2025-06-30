import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  layout?: 'horizontal' | 'vertical';
  showValue?: boolean;
  className?: string;
}

export function StarRating({ 
  rating, 
  maxRating = 5, 
  size = 'md', 
  layout = 'horizontal',
  showValue = true,
  className 
}: StarRatingProps) {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  // Convert rating to star display (0-5 scale)
  // If rating is 0, show 0 stars
  // If rating is between 0.1-1.0, show 1 star
  // If rating is between 1.1-2.0, show 2 stars, etc.
  // Maximum 5 stars for rating >= 5.0
  const getStarCount = (ratingValue: number): number => {
    if (ratingValue <= 0) return 0;
    if (ratingValue <= 1) return 1;
    if (ratingValue <= 2) return 2;
    if (ratingValue <= 3) return 3;
    if (ratingValue <= 4) return 4;
    return 5; // 5 stars for rating >= 5.0
  };

  const starCount = getStarCount(rating || 0);
  
  const stars = Array.from({ length: maxRating }, (_, index) => {
    const starNumber = index + 1;
    const filled = starNumber <= starCount;
    
    return (
      <Star
        key={index}
        className={cn(
          sizeClasses[size],
          filled ? 'fill-yellow-400 text-yellow-400' : 'fill-transparent text-gray-400'
        )}
      />
    );
  });

  return (
    <div className={cn(
      'flex items-center justify-center',
      layout === 'vertical' ? 'flex-col space-y-1' : 'space-x-1',
      className
    )}>
      <div className={cn(
        'flex items-center justify-center',
        layout === 'vertical' ? 'flex-col space-y-1' : 'space-x-1'
      )}>
        {stars}
      </div>
      {showValue && (
        <span className="text-sm text-white font-medium ml-2">
          {(rating || 0).toFixed(1)}
        </span>
      )}
    </div>
  );
}