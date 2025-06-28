import { Star, AlertTriangle } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  layout?: 'horizontal' | 'vertical';
  className?: string;
}

export function StarRating({ 
  rating, 
  showText = true, 
  size = 'md', 
  layout = 'horizontal',
  className = '' 
}: StarRatingProps) {
  
  // Star rating calculation
  const getStarRating = (rating: number) => {
    if (rating < 0) {
      return {
        stars: 0,
        showWarning: true,
        color: 'text-red-400'
      };
    }
    
    // Scale: 0-1 = 1 star, 1-2 = 2 stars, 2-3 = 3 stars, 3-4 = 4 stars, 4+ = 5 stars
    const stars = Math.min(5, Math.max(1, Math.ceil(rating)));
    
    return {
      stars,
      showWarning: false,
      color: rating >= 4 ? 'text-yellow-400' : rating >= 2 ? 'text-yellow-300' : 'text-yellow-200'
    };
  };

  const { stars, showWarning, color } = getStarRating(rating);
  
  // Size configurations
  const sizeConfig = {
    sm: { star: 'h-3 w-3', text: 'text-xs' },
    md: { star: 'h-4 w-4', text: 'text-sm' },
    lg: { star: 'h-5 w-5', text: 'text-base' }
  };
  
  const { star: starSize, text: textSize } = sizeConfig[size];
  
  if (showWarning) {
    return (
      <div className={`flex ${layout === 'vertical' ? 'flex-col' : 'flex-row'} items-center ${layout === 'vertical' ? 'space-y-1' : 'space-x-2'} ${className}`}>
        <div className="flex items-center space-x-1">
          <AlertTriangle className={`${starSize} text-red-400`} />
          <span className={`text-red-400 ${textSize}`}>Poor</span>
        </div>
        {showText && (
          <span className={`text-red-400 ${textSize} font-medium`}>{rating.toFixed(1)}</span>
        )}
      </div>
    );
  }
  
  return (
    <div className={`flex ${layout === 'vertical' ? 'flex-col' : 'flex-row'} items-center ${layout === 'vertical' ? 'space-y-1' : 'space-x-2'} ${className}`}>
      <div className="flex items-center space-x-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`${starSize} ${i < stars ? color + ' fill-current' : 'text-gray-400'}`}
          />
        ))}
      </div>
      {showText && (
        <span className={`text-white ${textSize} font-medium`}>{rating.toFixed(1)}</span>
      )}
    </div>
  );
}