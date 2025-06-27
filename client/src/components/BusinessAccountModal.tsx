import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Building2,
  X,
  Upload,
  FileText,
  Shield,
  CheckCircle,
  Clock,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useFirestoreOperations } from '@/hooks/useFirestore';
import { toastSuccess, toastError } from '@/utils/notifications';

const businessAccountSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  businessType: z.enum(['retail', 'transport', 'food', 'services', 'other']),
  businessAddress: z.string().min(10, 'Please provide a complete address'),
  businessPhone: z.string().min(10, 'Please provide a valid phone number'),
  businessEmail: z.string().email('Please provide a valid email'),
  businessDescription: z.string().min(20, 'Please describe your business (minimum 20 characters)'),
  businessRegistration: z.string().min(5, 'Please provide business registration number'),
  averageExchangesPerDay: z.string(),
  operatingHours: z.string().min(5, 'Please specify operating hours'),
});

type BusinessAccountFormData = z.infer<typeof businessAccountSchema>;

interface BusinessAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BusinessAccountModal({ isOpen, onClose }: BusinessAccountModalProps) {
  const { user } = useAuth();
  const { addDocument, updateDocument } = useFirestoreOperations();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [documentFiles, setDocumentFiles] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset
  } = useForm<BusinessAccountFormData>({
    resolver: zodResolver(businessAccountSchema)
  });

  const businessTypes = [
    { value: 'retail', label: 'Retail Store/Sari-sari Store' },
    { value: 'transport', label: 'Transportation (Jeepney, Tricycle)' },
    { value: 'food', label: 'Food & Beverage' },
    { value: 'services', label: 'Services' },
    { value: 'other', label: 'Other' }
  ];

  const exchangeVolumes = [
    { value: '1-10', label: '1-10 exchanges per day' },
    { value: '11-25', label: '11-25 exchanges per day' },
    { value: '26-50', label: '26-50 exchanges per day' },
    { value: '50+', label: '50+ exchanges per day' }
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    // In a real app, upload to storage service
    const newFiles = Array.from(files).map((file, index) => 
      `business_doc_${Date.now()}_${index}_${file.name}`
    );
    
    setDocumentFiles(prev => [...prev, ...newFiles]);
  };

  const removeDocument = (index: number) => {
    setDocumentFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: BusinessAccountFormData) => {
    if (!user?.uid) {
      toastError('You must be logged in to apply for business account');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create business account application
      await addDocument('businessApplications', {
        ...data,
        userId: user.uid,
        documents: documentFiles,
        status: 'pending',
        appliedAt: new Date(),
        reviewedAt: null,
        notes: '',
        priority: data.averageExchangesPerDay === '50+' ? 'high' : 'normal'
      });

      // Update user profile to show pending business application
      await updateDocument('users', user.uid, {
        businessApplicationPending: true,
        lastActive: new Date()
      });

      toastSuccess('Business account application submitted! We\'ll review it within 2-3 business days.');
      reset();
      setDocumentFiles([]);
      onClose();
    } catch (error) {
      console.error('Error submitting business application:', error);
      toastError('Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="glass-effect rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-white/10">
              <div className="flex items-center space-x-3">
                <Building2 className="h-6 w-6 text-blue-400" />
                <div>
                  <CardTitle className="text-white">Business Account Application</CardTitle>
                  <p className="text-blue-100 text-sm">Apply for verified business status and increased limits</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Business Benefits */}
              <div className="bg-blue-900/30 border border-blue-400/30 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-3 flex items-center">
                  <Star className="h-5 w-5 text-yellow-400 mr-2" />
                  Business Account Benefits
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center text-blue-100">
                    <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
                    Higher exchange limits
                  </div>
                  <div className="flex items-center text-blue-100">
                    <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
                    Priority matching
                  </div>
                  <div className="flex items-center text-blue-100">
                    <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
                    Business verification badge
                  </div>
                  <div className="flex items-center text-blue-100">
                    <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
                    Analytics dashboard
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="businessName" className="text-white">
                      Business Name *
                    </Label>
                    <Input
                      id="businessName"
                      {...register('businessName')}
                      className="bg-white/10 border-white/20 text-white placeholder-blue-200"
                      placeholder="Enter business name"
                    />
                    {errors.businessName && (
                      <p className="text-red-400 text-sm mt-1">{errors.businessName.message}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-white">Business Type *</Label>
                    <Select onValueChange={(value) => setValue('businessType', value as any)}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Select business type" />
                      </SelectTrigger>
                      <SelectContent>
                        {businessTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.businessType && (
                      <p className="text-red-400 text-sm mt-1">{errors.businessType.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="businessAddress" className="text-white">
                    Business Address *
                  </Label>
                  <Textarea
                    id="businessAddress"
                    {...register('businessAddress')}
                    className="bg-white/10 border-white/20 text-white placeholder-blue-200"
                    placeholder="Enter complete business address"
                    rows={2}
                  />
                  {errors.businessAddress && (
                    <p className="text-red-400 text-sm mt-1">{errors.businessAddress.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="businessPhone" className="text-white">
                      Business Phone *
                    </Label>
                    <Input
                      id="businessPhone"
                      {...register('businessPhone')}
                      className="bg-white/10 border-white/20 text-white placeholder-blue-200"
                      placeholder="+639123456789"
                    />
                    {errors.businessPhone && (
                      <p className="text-red-400 text-sm mt-1">{errors.businessPhone.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="businessEmail" className="text-white">
                      Business Email *
                    </Label>
                    <Input
                      id="businessEmail"
                      type="email"
                      {...register('businessEmail')}
                      className="bg-white/10 border-white/20 text-white placeholder-blue-200"
                      placeholder="business@email.com"
                    />
                    {errors.businessEmail && (
                      <p className="text-red-400 text-sm mt-1">{errors.businessEmail.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="businessDescription" className="text-white">
                    Business Description *
                  </Label>
                  <Textarea
                    id="businessDescription"
                    {...register('businessDescription')}
                    className="bg-white/10 border-white/20 text-white placeholder-blue-200"
                    placeholder="Describe your business and how you plan to use Kolekta"
                    rows={3}
                  />
                  {errors.businessDescription && (
                    <p className="text-red-400 text-sm mt-1">{errors.businessDescription.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="businessRegistration" className="text-white">
                      Business Registration Number *
                    </Label>
                    <Input
                      id="businessRegistration"
                      {...register('businessRegistration')}
                      className="bg-white/10 border-white/20 text-white placeholder-blue-200"
                      placeholder="DTI/SEC/BIR Number"
                    />
                    {errors.businessRegistration && (
                      <p className="text-red-400 text-sm mt-1">{errors.businessRegistration.message}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-white">Expected Exchange Volume *</Label>
                    <Select onValueChange={(value) => setValue('averageExchangesPerDay', value)}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Select volume" />
                      </SelectTrigger>
                      <SelectContent>
                        {exchangeVolumes.map((volume) => (
                          <SelectItem key={volume.value} value={volume.value}>
                            {volume.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.averageExchangesPerDay && (
                      <p className="text-red-400 text-sm mt-1">{errors.averageExchangesPerDay.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="operatingHours" className="text-white">
                    Operating Hours *
                  </Label>
                  <Input
                    id="operatingHours"
                    {...register('operatingHours')}
                    className="bg-white/10 border-white/20 text-white placeholder-blue-200"
                    placeholder="e.g., Mon-Fri 8AM-6PM, Sat 8AM-2PM"
                  />
                  {errors.operatingHours && (
                    <p className="text-red-400 text-sm mt-1">{errors.operatingHours.message}</p>
                  )}
                </div>

                {/* Document Upload */}
                <div>
                  <Label className="text-white">Supporting Documents</Label>
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-white border-white/20 hover:bg-white/10"
                      onClick={() => document.getElementById('document-upload')?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Business Documents
                    </Button>
                    <input
                      id="document-upload"
                      type="file"
                      accept="image/*,.pdf"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <p className="text-blue-200 text-xs">
                      Upload business registration, permits, or other verification documents
                    </p>
                    
                    {documentFiles.length > 0 && (
                      <div className="space-y-2">
                        {documentFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-white/5 rounded-lg p-2">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-blue-400" />
                              <span className="text-white text-sm truncate">{file}</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeDocument(index)}
                              className="text-red-400 hover:bg-red-400/10"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-yellow-900/30 border border-yellow-400/30 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <Clock className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-yellow-100 text-sm font-medium">Review Process</p>
                      <p className="text-yellow-200 text-xs">
                        Applications are typically reviewed within 2-3 business days. You'll receive an email notification once approved.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="flex-1 text-white border-white/20 hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Submitting...</span>
                      </div>
                    ) : (
                      'Submit Application'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}