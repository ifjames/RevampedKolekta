import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Star, 
  ExternalLink, 
  Edit, 
  Shield, 
  LogOut,
  Calendar,
  Mail,
  Phone
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/utils/timeUtils';
import { showConfirm, toastInfo } from '@/utils/notifications';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export function ProfileModal({ isOpen, onClose, onLogout }: ProfileModalProps) {
  const { user, userProfile, logout } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    const result = await showConfirm(
      'Logout?',
      'Are you sure you want to logout?'
    );

    if (result.isConfirmed) {
      setLoading(true);
      try {
        await logout();
        onLogout();
        onClose();
      } catch (error) {
        // Error is handled in the context
      } finally {
        setLoading(false);
      }
    }
  };

  const stats = [
    {
      icon: Star,
      value: (userProfile?.rating || 5.0).toFixed(1),
      label: 'Rating',
      color: 'text-yellow-400',
    },
    {
      icon: ExternalLink,
      value: userProfile?.completedExchanges || 0,
      label: 'Exchanges',
      color: 'text-green-400',
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md glass-effect border-white/20 bg-blue-900/95">
        <DialogHeader className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="w-20 h-20 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <User className="h-10 w-10 text-white" />
          </motion.div>
          <DialogTitle className="text-2xl font-bold text-white">
            {userProfile?.name || user?.displayName || 'User'}
          </DialogTitle>
          <DialogDescription className="text-blue-100">
            View and manage your profile information
          </DialogDescription>
          <div className="flex items-center justify-center space-x-2 mt-2">
            {userProfile?.verified && (
              <Badge className="bg-green-500 text-white">
                <Shield className="mr-1 h-3 w-3" />
                Verified
              </Badge>
            )}
            <p className="text-blue-100 text-sm">
              Member since {userProfile?.createdAt ? formatDate(new Date(userProfile.createdAt)) : 'recently'}
            </p>
          </div>
        </DialogHeader>

        {/* User Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3 mb-6"
        >
          <div className="flex items-center space-x-3 text-blue-100">
            <Mail className="h-4 w-4" />
            <span className="text-sm">{userProfile?.email || user?.email}</span>
          </div>
          
          {userProfile?.phone && (
            <div className="flex items-center space-x-3 text-blue-100">
              <Phone className="h-4 w-4" />
              <span className="text-sm">{userProfile.phone}</span>
            </div>
          )}
          
          <div className="flex items-center space-x-3 text-blue-100">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">
              Joined {userProfile?.createdAt ? formatDate(userProfile.createdAt) : 'recently'}
            </span>
          </div>
        </motion.div>

        {/* Profile Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-2 gap-4 mb-6"
        >
          {stats.map((stat, index) => (
            <Card key={stat.label} className="glass-dark border-white/10">
              <CardContent className="p-3 text-center">
                <stat.icon className={`h-5 w-5 ${stat.color} mb-1 mx-auto`} />
                <p className="text-white font-bold">{stat.value}</p>
                <p className="text-blue-100 text-xs">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Profile Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <Button
            onClick={() => toastInfo('Edit profile coming soon!')}
            className="w-full glass-dark text-white hover:bg-white/10 border-white/20"
            variant="outline"
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
          
          <Button
            onClick={() => toastInfo('Verification coming soon!')}
            className="w-full glass-dark text-white hover:bg-white/10 border-white/20"
            variant="outline"
          >
            <Shield className="mr-2 h-4 w-4" />
            Verification
          </Button>
          
          <Button
            onClick={handleLogout}
            disabled={loading}
            className="w-full bg-red-500 hover:bg-red-600 text-white"
          >
            {loading ? (
              <>Logging out...</>
            ) : (
              <>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </>
            )}
          </Button>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
