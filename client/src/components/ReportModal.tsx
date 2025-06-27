import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertTriangle,
  X,
  Upload,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useFirestoreOperations } from '@/hooks/useFirestore';
import { toast } from '@/hooks/use-toast';

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
      toast({
        title: "Error",
        description: "You must be logged in to submit a report"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await addDocument('reports', {
        ...data,
        reporterId: user.uid,
        matchId: matchId || null,
        status: 'pending',
        createdAt: new Date(),
        priority: data.issueType === 'fake_money' || data.issueType === 'scam' ? 'high' : 'normal'
      });

      toast({
        title: "Report Submitted",
        description: "Our team will review it shortly."
      });
      reset();
      setEvidenceFiles([]);
      onClose();
    } catch (error) {
      console.error('Error submitting report:', error);
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again."
      });
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
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-effect border-white/20 rounded-xl w-full max-w-lg max-h-[80vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-xl">Report Issue</h2>
                    <p className="text-blue-100 text-sm">Report problems with {reportedUserName}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-white hover:bg-white/10 p-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="reportedUserId" className="text-white">User ID to Report</Label>
                  <Input
                    id="reportedUserId"
                    {...register('reportedUserId')}
                    className="glass-dark text-white border-white/20"
                    placeholder="Enter user ID"
                  />
                  {errors.reportedUserId && (
                    <p className="text-red-400 text-sm">{errors.reportedUserId.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Issue Type</Label>
                  <Select onValueChange={(value) => setValue('issueType', value as any)}>
                    <SelectTrigger className="glass-dark text-white border-white/20">
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
                    <p className="text-red-400 text-sm">{errors.issueType.message}</p>
                  )}
                  {watchedIssueType && (
                    <p className="text-blue-200 text-sm">
                      {getIssueTypeDescription(watchedIssueType)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-white">Detailed Description</Label>
                  <Textarea
                    id="description"
                    {...register('description')}
                    className="glass-dark text-white border-white/20 min-h-[100px]"
                    placeholder="Please provide a detailed description of what happened..."
                  />
                  {errors.description && (
                    <p className="text-red-400 text-sm">{errors.description.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Evidence (Optional)</Label>
                  <div className="border-2 border-dashed border-white/20 rounded-lg p-4">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="evidence-upload"
                    />
                    <label
                      htmlFor="evidence-upload"
                      className="flex flex-col items-center space-y-2 cursor-pointer"
                    >
                      <Upload className="h-8 w-8 text-blue-300" />
                      <p className="text-blue-100 text-sm text-center">
                        Click to upload screenshots or photos
                      </p>
                    </label>
                  </div>

                  {evidenceFiles.length > 0 && (
                    <div className="space-y-2">
                      {evidenceFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between glass-dark p-2 rounded">
                          <span className="text-white text-sm">{file}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeEvidence(index)}
                            className="text-red-400 hover:bg-red-500/20 p-1"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="glass-dark border-yellow-400/50 bg-yellow-500/10 p-4 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Shield className="h-5 w-5 text-yellow-400 mt-0.5" />
                    <div>
                      <p className="text-yellow-400 font-medium text-sm">Important</p>
                      <p className="text-yellow-100 text-sm">
                        False reports may result in account suspension. Please only report legitimate issues.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="flex-1 glass-dark text-white hover:bg-white/10 border-white/20"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Report'}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}