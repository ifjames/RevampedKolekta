import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DollarSign } from "lucide-react";

interface MatchConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  matchDetails: {
    giveAmount: number;
    needAmount: number;
  };
}

export function MatchConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  matchDetails
}: MatchConfirmationDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="glass-effect border-white/20 bg-blue-900/95">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white flex items-center">
            🎉 Match Found!
          </AlertDialogTitle>
          <AlertDialogDescription className="text-blue-100">
            Perfect match found nearby!
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-3 py-4">
          <div className="flex items-center text-green-400">
            <DollarSign className="h-4 w-4 mr-2" />
            <span>Give: ₱{matchDetails.giveAmount}</span>
          </div>
          <div className="flex items-center text-blue-400">
            <DollarSign className="h-4 w-4 mr-2" />
            <span>Get: ₱{matchDetails.needAmount}</span>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel 
            className="bg-white/10 text-white border-white/30 hover:bg-white/20"
            onClick={onClose}
          >
            Skip
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-green-500 hover:bg-green-600 text-white"
            onClick={handleConfirm}
          >
            Confirm Match
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}