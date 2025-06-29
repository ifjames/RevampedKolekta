import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Shield,
  X,
  Upload,
  FileText,
  Camera,
  User,
  Phone,
  CheckCircle,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useFirestoreOperations } from '@/hooks/useFirestore';
import { toastSuccess, toastError } from '@/utils/notifications';

const verificationSchema = z.object({
  verificationType: z.enum(['government_id', 'phone_sms']),
  idType: z.enum(['drivers_license', 'national_id', 'passport', 'voters_id']).optional(),
  idNumber: z.string().min(5, 'Please provide a valid ID number').optional(),
  phoneNumber: z.string().min(11, 'Please provide a valid phone number').optional(),
  smsCode: z.string().length(6, 'SMS code must be 6 digits').optional(),
});

type VerificationFormData = z.infer<typeof verificationSchema>;

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VerificationModal({ isOpen, onClose }: VerificationModalProps) {
  const { user, userProfile, updateUserProfile } = useAuth();
  const { addDocument, updateDocument } = useFirestoreOperations();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationStep, setVerificationStep] = useState<'select' | 'id_upload' | 'sms_verify' | 'review'>('select');
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [smsCodeSent, setSmsCodeSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<VerificationFormData>({
    resolver: zodResolver(verificationSchema)
  });

  const watchedVerificationType = watch('verificationType');
  const watchedPhoneNumber = watch('phoneNumber');

  const idTypes = [
    { value: 'drivers_license', label: 'Driver\'s License' },
    { value: 'national_id', label: 'National ID (PhilID)' },
    { value: 'passport', label: 'Passport' },
    { value: 'voters_id', label: 'Voter\'s ID' }
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    // In a real app, upload to secure storage
    const newFiles = Array.from(files).map((file, index) => 
      `verification_${Date.now()}_${index}_${file.name}`
    );
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const sendSMSCode = async () => {
    if (!watchedPhoneNumber) {
      toastError('Please enter your phone number first');
      return;
    }

    setIsSubmitting(true);
    try {
      // For now, simulate SMS sending with random 6-digit code
      // In production, integrate with SMS service like Twilio
      const mockCode = Math.floor(100000 + Math.random() * 900000).toString();
      console.log('SMS Code for testing:', mockCode); // For demo purposes
      
      // Store the mock code temporarily (in production, server would handle this)
      localStorage.setItem('temp_sms_code', mockCode);
      
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      setSmsCodeSent(true);
      toastSuccess(`SMS verification code sent to your phone. For demo: ${mockCode}`);
      setVerificationStep('sms_verify');
    } catch (error) {
      toastError('Failed to send SMS code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = async (data: VerificationFormData) => {
    if (!user?.uid) {
      toastError('You must be logged in to verify your account');
      return;
    }

    setIsSubmitting(true);
    try {
      let verificationData: any = {
        userId: user.uid,
        type: data.verificationType,
        status: 'pending',
        submittedAt: new Date(),
        reviewedAt: null,
        notes: ''
      };

      if (data.verificationType === 'government_id') {
        verificationData = {
          ...verificationData,
          idType: data.idType,
          idNumber: data.idNumber,
          uploadedFiles: uploadedFiles
        };
      } else if (data.verificationType === 'phone_sms') {
        // Validate SMS code against stored mock code (in production, server validates)
        const storedCode = localStorage.getItem('temp_sms_code');
        if (data.smsCode !== storedCode) {
          toastError('Invalid SMS code. Please check and try again.');
          setIsSubmitting(false);
          return;
        }
        
        verificationData = {
          ...verificationData,
          phoneNumber: data.phoneNumber,
          smsCode: data.smsCode,
          verified: true // SMS verification is instant
        };
        
        // Clean up temporary code
        localStorage.removeItem('temp_sms_code');
      }

      await addDocument('verifications', verificationData);

      // Update user profile if SMS verification
      if (data.verificationType === 'phone_sms') {
        await updateUserProfile({
          verified: true,
          phone: data.phoneNumber
        });

        // Create notification
        await addDocument('notifications', {
          userId: user.uid,
          type: 'verification_approved',
          title: 'Account Verified!',
          message: 'Your phone number has been verified successfully.',
          read: false,
          createdAt: new Date()
        });

        toastSuccess('Phone verification completed! Your account is now verified.');
      } else {
        toastSuccess('ID verification submitted! We\'ll review it within 24-48 hours.');
      }

      reset();
      setUploadedFiles([]);
      setVerificationStep('select');
      onClose();
    } catch (error) {
      console.error('Error submitting verification:', error);
      toastError('Failed to submit verification. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderVerificationContent = () => {
    switch (verificationStep) {
      case 'select':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <Card 
                className={`glass-dark border-white/10 cursor-pointer transition-all duration-200 hover:bg-white/5 ${
                  watchedVerificationType === 'phone_sms' ? 'ring-2 ring-blue-400' : ''
                }`}
                onClick={() => setValue('verificationType', 'phone_sms')}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Phone className="h-6 w-6 text-green-400 mt-1" />
                    <div className="flex-1">
                      <h3 className="text-white font-medium mb-1">Phone Verification</h3>
                      <p className="text-blue-100 text-sm mb-2">
                        Verify your phone number via SMS (Instant verification)
                      </p>
                      <div className="flex space-x-2">
                        <Badge className="bg-green-500 text-white text-xs">Instant</Badge>
                        <Badge variant="outline" className="text-green-300 border-green-400/30 text-xs">
                          Recommended
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`glass-dark border-white/10 cursor-pointer transition-all duration-200 hover:bg-white/5 ${
                  watchedVerificationType === 'government_id' ? 'ring-2 ring-blue-400' : ''
                }`}
                onClick={() => setValue('verificationType', 'government_id')}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <User className="h-6 w-6 text-blue-400 mt-1" />
                    <div className="flex-1">
                      <h3 className="text-white font-medium mb-1">Government ID Verification</h3>
                      <p className="text-blue-100 text-sm mb-2">
                        Upload a valid government-issued ID for full verification
                      </p>
                      <div className="flex space-x-2">
                        <Badge className="bg-blue-500 text-white text-xs">24-48 hours</Badge>
                        <Badge variant="outline" className="text-blue-300 border-blue-400/30 text-xs">
                          Higher Trust
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {watchedVerificationType && (
              <Button
                onClick={() => {
                  if (watchedVerificationType === 'phone_sms') {
                    setVerificationStep('sms_verify');
                  } else {
                    setVerificationStep('id_upload');
                  }
                }}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
              >
                Continue with {watchedVerificationType === 'phone_sms' ? 'Phone' : 'ID'} Verification
              </Button>
            )}
          </div>
        );

      case 'sms_verify':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="phoneNumber" className="text-white">
                Phone Number
              </Label>
              <Input
                id="phoneNumber"
                {...register('phoneNumber')}
                placeholder="+639123456789"
                className="bg-white/10 border-white/20 text-white placeholder-blue-200"
              />
              {errors.phoneNumber && (
                <p className="text-red-400 text-sm mt-1">{errors.phoneNumber.message}</p>
              )}
            </div>

            {!smsCodeSent ? (
              <Button
                onClick={sendSMSCode}
                disabled={isSubmitting || !watchedPhoneNumber}
                className="w-full bg-green-500 hover:bg-green-600 text-white"
              >
                {isSubmitting ? 'Sending...' : 'Send SMS Code'}
              </Button>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="smsCode" className="text-white">
                    SMS Verification Code
                  </Label>
                  <Input
                    id="smsCode"
                    {...register('smsCode')}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    className="bg-white/10 border-white/20 text-white placeholder-blue-200 text-center text-lg tracking-widest"
                  />
                  {errors.smsCode && (
                    <p className="text-red-400 text-sm mt-1">{errors.smsCode.message}</p>
                  )}
                </div>

                <div className="bg-blue-900/30 border border-blue-400/30 rounded-lg p-3">
                  <p className="text-blue-100 text-sm">
                    SMS code sent to {watchedPhoneNumber}. Check your messages and enter the 6-digit code above.
                  </p>
                </div>

                <div className="space-y-3">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    {isSubmitting ? 'Verifying...' : 'Verify Phone Number'}
                  </Button>
                  
                  <Button
                    type="button"
                    onClick={() => {
                      setVerificationStep('select');
                      setSmsCodeSent(false);
                      localStorage.removeItem('temp_sms_code');
                      setValue('phoneNumber', '');
                      setValue('smsCode', '');
                    }}
                    variant="outline"
                    className="w-full border-gray-500 text-gray-300 hover:bg-gray-800 hover:text-white"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        );

      case 'id_upload':
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-white">ID Type</Label>
              <Select onValueChange={(value) => setValue('idType', value as any)}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Select ID type" />
                </SelectTrigger>
                <SelectContent>
                  {idTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.idType && (
                <p className="text-red-400 text-sm mt-1">{errors.idType.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="idNumber" className="text-white">
                ID Number
              </Label>
              <Input
                id="idNumber"
                {...register('idNumber')}
                placeholder="Enter your ID number"
                className="bg-white/10 border-white/20 text-white placeholder-blue-200"
              />
              {errors.idNumber && (
                <p className="text-red-400 text-sm mt-1">{errors.idNumber.message}</p>
              )}
            </div>

            <div>
              <Label className="text-white">Upload ID Photos</Label>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-white border-white/20 hover:bg-white/10 w-full"
                  onClick={() => document.getElementById('id-upload')?.click()}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Upload Front & Back of ID
                </Button>
                <input
                  id="id-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <p className="text-blue-200 text-xs">
                  Upload clear photos of both sides of your ID. Ensure all text is readable.
                </p>
                
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-white/5 rounded-lg p-2">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-blue-400" />
                          <span className="text-white text-sm truncate">{file}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
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

            <Button
              type="submit"
              disabled={isSubmitting || uploadedFiles.length === 0}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            >
              {isSubmitting ? 'Submitting...' : 'Submit for Review'}
            </Button>
          </div>
        );

      default:
        return null;
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
            className="glass-effect rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-white/10">
              <div className="flex items-center space-x-3">
                <Shield className="h-6 w-6 text-green-400" />
                <div>
                  <CardTitle className="text-white">Account Verification</CardTitle>
                  <p className="text-blue-100 text-sm">Verify your account for increased trust and limits</p>
                </div>
              </div>
              {/* Only show X button if not in phone verification step */}
              {verificationStep !== 'sms_verify' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-white hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </Button>
              )}
            </CardHeader>

            <CardContent className="p-6">
              {userProfile?.verified ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                  <h3 className="text-white font-bold text-lg mb-2">Account Verified!</h3>
                  <p className="text-blue-100 text-sm">
                    Your account is already verified and has full access to all features.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)}>
                  {renderVerificationContent()}
                </form>
              )}

              <div className="mt-6 bg-yellow-900/30 border border-yellow-400/30 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-yellow-100 text-sm font-medium">Privacy & Security</p>
                    <p className="text-yellow-200 text-xs">
                      Your personal information is encrypted and used only for verification. We never share your data with third parties.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}