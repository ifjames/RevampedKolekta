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

  // Handle edge cases for rating
  const normalizedRating = Math.max(0, Math.min(maxRating, rating || 0));
  
  const stars = Array.from({ length: maxRating }, (_, index) => {
    const starNumber = index + 1;
    const filled = starNumber <= normalizedRating;
    const partial = starNumber > normalizedRating && starNumber - 1 < normalizedRating;
    
    return (
      <Star
        key={index}
        className={cn(
          sizeClasses[size],
          filled ? 'fill-yellow-400 text-yellow-400' : 
          partial ? 'fill-yellow-400/50 text-yellow-400' : 
          'fill-gray-300 text-gray-300'
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
          {normalizedRating.toFixed(1)}
        </span>
      )}
    </div>
  );
}