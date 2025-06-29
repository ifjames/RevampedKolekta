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
  showValue = false,
  className 
}: StarRatingProps) {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const stars = Array.from({ length: maxRating }, (_, index) => {
    const starNumber = index + 1;
    const filled = starNumber <= rating;
    const partial = starNumber > rating && starNumber - 1 < rating;
    
    return (
      <Star
        key={index}
        className={cn(
          sizeClasses[size],
          filled ? 'fill-yellow-400 text-yellow-400' : 
          partial ? 'fill-yellow-400/50 text-yellow-400' : 
          'text-gray-300 dark:text-gray-600'
        )}
      />
    );
  });

  return (
    <div className={cn(
      'flex items-center',
      layout === 'vertical' ? 'flex-col space-y-1' : 'flex-row space-x-1',
      className
    )}>
      <div className={cn(
        'flex items-center',
        layout === 'vertical' ? 'flex-col space-y-1' : 'flex-row space-x-1'
      )}>
        {stars}
      </div>
      {showValue && (
        <span className="text-sm text-muted-foreground ml-2">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}