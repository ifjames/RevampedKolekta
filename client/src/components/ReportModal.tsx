import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertTriangle,
  Camera,
  X,
  Upload,
  FileText,
  User,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useFirestoreOperations } from '@/hooks/useFirestore';
import { toastSuccess, toastError } from '@/utils/notifications';

const reportSchema = z.object({
  reportedUserId: z.string().min(1, 'User ID is required'),
  matchId: z.string().optional(),
  issueType: z.enum(['fake_money', 'no_show', 'harassment', 'scam', 'other']),
  description: z.string().min(10, 'Please provide a detailed description'),
  evidence: z.array(z.string()).optional(),
});

type ReportFormData = z.infer<typeof reportSchema>;

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportedUserId?: string;
  matchId?: string;
  reportedUserName?: string;
}

export function ReportModal({ 
  isOpen, 
  onClose, 
  reportedUserId = '', 
  matchId, 
  reportedUserName = 'User' 
}: ReportModalProps) {
  const { user } = useAuth();
  const { addDocument } = useFirestoreOperations();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      reportedUserId,
      matchId,
      evidence: []
    }
  });

  const watchedIssueType = watch('issueType');

  const issueTypes = [
    { value: 'fake_money', label: 'Fake or Counterfeit Money', icon: '💰' },
    { value: 'no_show', label: 'No-Show / Didn\'t Appear', icon: '⏰' },
    { value: 'harassment', label: 'Harassment or Inappropriate Behavior', icon: '🚫' },
    { value: 'scam', label: 'Scam or Fraudulent Activity', icon: '⚠️' },
    { value: 'other', label: 'Other Issue', icon: '📝' }
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    // In a real app, you would upload files to a storage service
    // For now, we'll simulate file URLs
    const newFiles = Array.from(files).map((file, index) => 
      `evidence_${Date.now()}_${index}_${file.name}`
    );
    
    setEvidenceFiles(prev => [...prev, ...newFiles]);
    setValue('evidence', [...evidenceFiles, ...newFiles]);
  };

  const removeEvidence = (index: number) => {
    const newFiles = evidenceFiles.filter((_, i) => i !== index);
    setEvidenceFiles(newFiles);
    setValue('evidence', newFiles);
  };

  const onSubmit = async (data: ReportFormData) => {
    if (!user?.uid) {
      toastError('You must be logged in to submit a report');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDocument('reports', {
        ...data,
        reporterId: user.uid,
        status: 'pending',
        createdAt: new Date(),
        priority: data.issueType === 'fake_money' || data.issueType === 'scam' ? 'high' : 'normal'
      });

      toastSuccess('Report submitted successfully. Our team will review it shortly.');
      reset();
      setEvidenceFiles([]);
      onClose();
    } catch (error) {
      console.error('Error submitting report:', error);
      toastError('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getIssueTypeDescription = (type: string) => {
    switch (type) {
      case 'fake_money':
        return 'Report if you received counterfeit bills or coins during the exchange.';
      case 'no_show':
        return 'Report if the other user confirmed the exchange but failed to show up.';
      case 'harassment':
        return 'Report inappropriate messages, threats, or uncomfortable behavior.';
      case 'scam':
        return 'Report if you suspect fraudulent activity or deceptive practices.';
      case 'other':
        return 'Describe any other issue you encountered during the exchange process.';
      default:
        return '';
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
            className="glass-effect rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-6 w-6 text-red-400" />
                <div>
                  <h2 className="text-xl font-bold text-white">Report Issue</h2>
                  <p className="text-blue-100 text-sm">Report problems with {reportedUserName}</p>
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
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="reportedUserId" className="text-white">
                  User ID to Report
                </Label>
                <Input
                  id="reportedUserId"
                  {...register('reportedUserId')}
                  className="bg-white/10 border-white/20 text-white placeholder-blue-200"
                  placeholder="Enter user ID"
                />
                {errors.reportedUserId && (
                  <p className="text-red-400 text-sm mt-1">{errors.reportedUserId.message}</p>
                )}
              </div>

              {matchId && (
                <div>
                  <Label htmlFor="matchId" className="text-white">
                    Match ID (Auto-filled)
                  </Label>
                  <Input
                    id="matchId"
                    {...register('matchId')}
                    className="bg-white/10 border-white/20 text-white"
                    readOnly
                  />
                </div>
              )}

              <div>
                <Label className="text-white">Issue Type</Label>
                <Select onValueChange={(value) => setValue('issueType', value as any)}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Select the type of issue" />
                  </SelectTrigger>
                  <SelectContent>
                    {issueTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center space-x-2">
                          <span>{type.icon}</span>
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.issueType && (
                  <p className="text-red-400 text-sm mt-1">{errors.issueType.message}</p>
                )}
              </div>

              {watchedIssueType && (
                <div className="bg-blue-900/30 border border-blue-400/30 rounded-lg p-3">
                  <p className="text-blue-100 text-sm">
                    {getIssueTypeDescription(watchedIssueType)}
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="description" className="text-white">
                  Detailed Description
                </Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  className="bg-white/10 border-white/20 text-white placeholder-blue-200 min-h-[100px]"
                  placeholder="Please provide a detailed description of what happened..."
                />
                {errors.description && (
                  <p className="text-red-400 text-sm mt-1">{errors.description.message}</p>
                )}
              </div>

              <div>
                <Label className="text-white">Evidence (Optional)</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-white border-white/20 hover:bg-white/10"
                      onClick={() => document.getElementById('evidence-upload')?.click()}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Upload Photos
                    </Button>
                    <input
                      id="evidence-upload"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                  
                  {evidenceFiles.length > 0 && (
                    <div className="space-y-2">
                      {evidenceFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-white/5 rounded-lg p-2">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-blue-400" />
                            <span className="text-white text-sm truncate">{file}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeEvidence(index)}
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
                  <Shield className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-yellow-100 text-sm font-medium">Important</p>
                    <p className="text-yellow-200 text-xs">
                      False reports may result in account suspension. Please only report legitimate issues.
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
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Submitting...</span>
                    </div>
                  ) : (
                    'Submit Report'
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}