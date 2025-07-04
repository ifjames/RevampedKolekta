import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { MapView } from './MapView';

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
  editingPost?: any;
}

export function CreatePostModal({ isOpen, onClose, editingPost }: CreatePostModalProps) {
  const { user, userProfile } = useAuth();
  const { location, requestLocation } = useLocation();
  const { addDocument, updateDocument } = useFirestoreOperations();
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);

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

  // Watch form values for dynamic icon changes
  const watchedGiveType = form.watch('giveType');
  const watchedNeedType = form.watch('needType');

  // Reset form when editingPost changes
  useEffect(() => {
    if (editingPost) {
      form.reset({
        giveAmount: editingPost.giveAmount,
        giveType: editingPost.giveType,
        needAmount: editingPost.needAmount,
        needType: editingPost.needType,
        needBreakdown: editingPost.needBreakdown?.join(', ') || '',
        notes: editingPost.notes || '',
      });
      setSelectedLocation(editingPost.location || null);
    } else {
      form.reset({
        giveAmount: 1000,
        giveType: 'bill',
        needAmount: 1000,
        needType: 'coins',
        needBreakdown: '',
        notes: '',
      });
      setSelectedLocation(null);
    }
  }, [editingPost, form]);

  const handleSubmit = async (data: CreatePostFormData) => {
    if (!user) {
      toastError('Please log in to create posts');
      return;
    }

    const postLocation = selectedLocation || (editingPost?.location || location);
    if (!postLocation) {
      toastError('Please select a location for your exchange post');
      return;
    }

    setLoading(true);
    
    try {
      const needBreakdown = data.needBreakdown 
        ? data.needBreakdown.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n))
        : [];

      const postData = {
        userId: user.uid,
        userInfo: {
          name: userProfile?.name || user.displayName || 'Anonymous User',
          rating: userProfile?.rating || 5.0,
          verified: userProfile?.verified || false,
          completedExchanges: userProfile?.completedExchanges || 0
        },
        giveAmount: data.giveAmount,
        giveType: data.giveType,
        needAmount: data.needAmount,
        needType: data.needType,
        needBreakdown,
        notes: data.notes,
        location: {
          geohash: encode(postLocation.lat, postLocation.lng, 5),
          lat: postLocation.lat,
          lng: postLocation.lng,
        },
        status: 'active' as const,
        ...(editingPost ? {} : { timestamp: new Date() }), // Keep original timestamp when editing
      };

      if (editingPost) {
        await updateDocument('posts', editingPost.id, postData);
        toastSuccess('Exchange post updated successfully!');
      } else {
        await addDocument('posts', { ...postData, timestamp: new Date() });
        toastSuccess('Exchange post created successfully!');
      }
      
      onClose();
      form.reset();
    } catch (error) {
      console.error('Error saving post:', error);
      toastError(editingPost ? 'Failed to update post' : 'Failed to create post');
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
      <DialogContent className="w-[90vw] max-w-md sm:max-w-2xl glass-effect border-white/20 bg-blue-900/95 max-h-[85vh] flex flex-col p-4">
        <DialogHeader>
          <DialogTitle className="text-white text-xl flex items-center">
            <span className="mr-2 text-xl">₱</span>
            {editingPost ? 'Edit Post' : 'Create Post'}
          </DialogTitle>
          <DialogDescription className="text-blue-100">
            Create exchange request to find nearby cash denomination help.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* What you have section */}
            <Card className="glass-dark border-white/10">
              <CardContent className="p-4">
                <h3 className="text-white font-semibold mb-4 flex items-center">
                  <img 
                    src={watchedGiveType === 'bill' ? '/cash-icon.png' : '/coin-icon.png'} 
                    alt={watchedGiveType === 'bill' ? 'Cash' : 'Coins'} 
                    className="w-5 h-5 mr-2" 
                  />
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
                <img 
                  src={watchedNeedType === 'bill' ? '/cash-icon.png' : '/coin-icon.png'} 
                  alt={watchedNeedType === 'bill' ? 'Cash' : 'Coins'} 
                  className="w-5 h-5 mr-2" 
                />
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
              
              <div className="space-y-3">
                {(selectedLocation || location) ? (
                  <div className="flex items-center text-green-400 text-sm">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Location selected ({(selectedLocation || location)!.lat.toFixed(4)}, {(selectedLocation || location)!.lng.toFixed(4)})
                  </div>
                ) : (
                  <div className="flex items-center text-yellow-400 text-sm">
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Location needed for exchange post
                  </div>
                )}
                
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={locationLoading}
                    size="sm"
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    {locationLoading ? (
                      <>Getting Location...</>
                    ) : (
                      <>
                        <Crosshair className="mr-1 h-4 w-4" />
                        Use Current Location
                      </>
                    )}
                  </Button>
                  
                  <Button
                    type="button"
                    onClick={() => setShowLocationPicker(true)}
                    size="sm"
                    variant="outline"
                    className="glass-dark text-white border-white/20 hover:bg-white/10"
                  >
                    <MapPin className="mr-1 h-4 w-4" />
                    Choose on Map
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white"
            disabled={loading || (!selectedLocation && !location)}
          >
            {loading ? (
              <>{editingPost ? 'Updating...' : 'Creating...'}</>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {editingPost ? 'Update Exchange Request' : 'Post Exchange Request'}
              </>
            )}
          </Button>
          </form>
        </div>
      </DialogContent>

      {/* Location Picker Modal */}
      {showLocationPicker && (
        <Dialog open={showLocationPicker} onOpenChange={setShowLocationPicker}>
          <DialogContent className="sm:max-w-4xl w-[95vw] glass-effect border-white/20 bg-blue-900/95 max-h-[90vh] p-3 sm:p-6">
            <DialogHeader className="pb-3">
              <DialogTitle className="text-white text-lg sm:text-xl">Choose Exchange Location</DialogTitle>
              <DialogDescription className="text-blue-100 text-sm">
                Click on the map to select where you want to make the exchange
              </DialogDescription>
            </DialogHeader>
            <div className="h-[50vh] sm:h-96 w-full rounded-lg overflow-hidden border border-white/10">
              <MapView
                posts={[]}
                onLocationSelect={(location) => {
                  setSelectedLocation(location);
                }}
                isLocationPicker={true}
                showUserLocation={true}
              />
            </div>
            <div className="flex justify-end space-x-2 mt-4 pt-3 border-t border-white/10">
              <Button
                variant="outline"
                onClick={() => setShowLocationPicker(false)}
                className="bg-white/10 text-white border-white/30 hover:bg-white/20 backdrop-blur-sm"
              >
                Cancel
              </Button>
              <Button
                onClick={() => setShowLocationPicker(false)}
                className="bg-green-500 hover:bg-green-600 text-white disabled:bg-gray-500 disabled:opacity-50"
                disabled={!selectedLocation}
              >
                Use Selected Location
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
