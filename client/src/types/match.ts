import { Match as BaseMatch } from '@/types';

export interface ExtendedMatch extends BaseMatch {
  userAName?: string;
  userBName?: string;
  duration?: number;
  rating?: number;
  notes?: string;
  completedBy?: string;
}