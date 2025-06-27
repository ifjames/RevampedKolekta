import { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { 
  X, 
  DollarSign, 
  HandCoins, 
  MapPin, 
  Send,
  Crosshair,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { useFirestoreOperations } from '@/hooks/useFirestore';
import { encode } from '@/lib/geohash';
import { toastSuccess, toastError } from '@/utils/notifications';

const createPostSchema = z.object({
  giveAmount: z.number().min(1, 'Amount must be at least 1'),
  giveType: z.enum(['bill', 'coins']),
  needAmount: z.number().min(1, 'Amount must be at least 1'),
  needType: z.enum(['bill', 'coins']),
  needBreakdown: z.string().optional(),
  notes: z.string().optional(),
});

type CreatePostFormData = z.infer<typeof createPostSchema>;

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreatePostModal({ isOpen, onClose }: CreatePostModalProps) {
  const { user } = useAuth();
  const { location, requestLocation } = useLocation();
  const { addDocument } = useFirestoreOperations();
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const form = useForm<CreatePostFormData>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      giveAmount: 1000,
      giveType: 'bill',
      needAmount: 1000,
      needType: 'coins',
      needBreakdown: '',
      notes: '',
    },
  });

  const handleSubmit = async (data: CreatePostFormData) => {
    if (!user) {
      toastError('Please log in to create posts');
      return;
    }

    if (!location) {
      toastError('Location access is required to create posts');
      return;
    }

    setLoading(true);
    
    try {
      const needBreakdown = data.needBreakdown 
        ? data.needBreakdown.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n))
        : [];

      const postData = {
        userId: user.uid,
        giveAmount: data.giveAmount,
        giveType: data.giveType,
        needAmount: data.needAmount,
        needType: data.needType,
        needBreakdown,
        notes: data.notes,
        location: {
          geohash: encode(location.lat, location.lng, 5),
          lat: location.lat,
          lng: location.lng,
        },
        status: 'active' as const,
        timestamp: new Date(),
      };

      await addDocument('posts', postData);
      
      toastSuccess('Exchange post created successfully!');
      onClose();
      form.reset();
    } catch (error) {
      console.error('Error creating post:', error);
      toastError('Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  const handleGetLocation = async () => {
    setLocationLoading(true);
    try {
      requestLocation();
    } finally {
      setLocationLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg glass-effect border-white/20 bg-blue-900/95 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center">
            <DollarSign className="mr-2 h-6 w-6" />
            Create Exchange Post
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* What you have section */}
          <Card className="glass-dark border-white/10">
            <CardContent className="p-4">
              <h3 className="text-white font-semibold mb-4 flex items-center">
                <HandCoins className="text-green-400 mr-2 h-5 w-5" />
                What you have
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="giveAmount" className="text-blue-100">Amount</Label>
                  <Input
                    id="giveAmount"
                    type="number"
                    {...form.register('giveAmount', { valueAsNumber: true })}
                    className="bg-white/10 border-white/20 text-white placeholder:text-blue-200 focus:ring-green-400"
                    placeholder="1000"
                  />
                  {form.formState.errors.giveAmount && (
                    <p className="text-red-400 text-sm mt-1">
                      {form.formState.errors.giveAmount.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="giveType" className="text-blue-100">Type</Label>
                  <Select 
                    onValueChange={(value) => form.setValue('giveType', value as 'bill' | 'coins')}
                    defaultValue="bill"
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white focus:ring-green-400">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bill">Bills</SelectItem>
                      <SelectItem value="coins">Coins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What you need section */}
          <Card className="glass-dark border-white/10">
            <CardContent className="p-4">
              <h3 className="text-white font-semibold mb-4 flex items-center">
                <DollarSign className="text-blue-400 mr-2 h-5 w-5" />
                What you need
              </h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="needAmount" className="text-blue-100">Amount</Label>
                  <Input
                    id="needAmount"
                    type="number"
                    {...form.register('needAmount', { valueAsNumber: true })}
                    className="bg-white/10 border-white/20 text-white placeholder:text-blue-200 focus:ring-blue-400"
                    placeholder="1000"
                  />
                  {form.formState.errors.needAmount && (
                    <p className="text-red-400 text-sm mt-1">
                      {form.formState.errors.needAmount.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="needType" className="text-blue-100">Type</Label>
                  <Select 
                    onValueChange={(value) => form.setValue('needType', value as 'bill' | 'coins')}
                    defaultValue="coins"
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white focus:ring-blue-400">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="coins">Coins</SelectItem>
                      <SelectItem value="bill">Bills</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="needBreakdown" className="text-blue-100">
                  Breakdown (optional)
                </Label>
                <Input
                  id="needBreakdown"
                  {...form.register('needBreakdown')}
                  className="bg-white/10 border-white/20 text-white placeholder:text-blue-200 focus:ring-blue-400"
                  placeholder="e.g., 500,500 or 20,20,20..."
                />
                <p className="text-blue-200 text-xs mt-1">
                  Specify denominations separated by commas
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Additional details */}
          <div>
            <Label htmlFor="notes" className="text-blue-100">
              Additional Notes (optional)
            </Label>
            <Textarea
              id="notes"
              {...form.register('notes')}
              rows={3}
              className="bg-white/10 border-white/20 text-white placeholder:text-blue-200 focus:ring-blue-400"
              placeholder="Any special requirements or preferred meeting locations..."
            />
          </div>

          {/* Location info */}
          <Card className="glass-dark border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center mb-2">
                <MapPin className="text-red-400 mr-2 h-5 w-5" />
                <span className="text-white font-medium">Your Location</span>
              </div>
              <p className="text-blue-100 text-sm mb-3">
                We'll use your approximate location to find nearby matches. 
                Exact location is only shared after mutual confirmation.
              </p>
              
              {location ? (
                <div className="flex items-center text-green-400 text-sm">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Location obtained ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center text-yellow-400 text-sm">
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Location access needed
                  </div>
                  <Button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={locationLoading}
                    size="sm"
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    {locationLoading ? (
                      <>Loading...</>
                    ) : (
                      <>
                        <Crosshair className="mr-1 h-4 w-4" />
                        Get Current Location
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white"
            disabled={loading || !location}
          >
            {loading ? (
              <>Creating...</>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Post Exchange Request
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
