import { useState } from "react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  User,
  ExternalLink,
  Edit,
  Shield,
  LogOut,
  Calendar,
  Mail,
  Phone,
  Key,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate } from "@/utils/timeUtils";
import { showConfirm, toastInfo } from "@/utils/notifications";
import { VerificationModal } from "./VerificationModal";
import { StarRating } from "@/components/ui/StarRating";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onOpenVerification?: () => void;
}

export function ProfileModal({
  isOpen,
  onClose,
  onLogout,
  onOpenVerification,
}: ProfileModalProps) {
  const { user, userProfile, logout, updateUserProfile, changePassword } =
    useAuth();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [editForm, setEditForm] = useState({
    name: userProfile?.name || "",
    phone: userProfile?.phone || "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleLogout = async () => {
    const result = await showConfirm(
      "Logout?",
      "Are you sure you want to logout?",
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

  const handleEditProfile = () => {
    setEditForm({
      name: userProfile?.name || "",
      phone: userProfile?.phone || "",
    });
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await updateUserProfile(editForm);
      setIsEditing(false);
      toastInfo("Profile updated successfully!");
    } catch (error) {
      console.error("Profile update error:", error);
      toastInfo("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({
      name: userProfile?.name || "",
      phone: userProfile?.phone || "",
    });
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toastInfo("New passwords do not match");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toastInfo("New password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword,
      );
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswordForm(false);
      toastInfo("Password changed successfully!");
    } catch (error) {
      console.error("Password change error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPasswordChange = () => {
    setShowPasswordForm(false);
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  const stats = [
    {
      icon: ExternalLink,
      value: userProfile?.completedExchanges || 0,
      label: "Exchanges",
      color: "text-green-400",
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] max-w-sm sm:max-w-md max-h-[90vh] overflow-y-auto glass-effect border-white/20 bg-blue-900/95 p-4">
        <DialogHeader className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="w-20 h-20 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <User className="h-10 w-10 text-white" />
          </motion.div>
          <div className="flex items-center justify-center space-x-2">
            <DialogTitle className="text-2xl font-bold text-white">
              {userProfile?.name || user?.displayName || "User"}
            </DialogTitle>
            {userProfile?.verified && (
              <Badge className="bg-green-500 text-white">
                <Shield className="mr-1 h-3 w-3" />
                Verified
              </Badge>
            )}
          </div>
          <DialogDescription className="text-blue-100">
            View and manage your profile information
          </DialogDescription>
          <div className="flex items-center justify-center mt-2">
            <p className="text-blue-100 text-sm">
              Member since{" "}
              {userProfile?.createdAt
                ? formatDate(new Date(userProfile.createdAt))
                : "recently"}
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
              Joined{" "}
              {userProfile?.createdAt
                ? formatDate(userProfile.createdAt)
                : "recently"}
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
          {/* Rating Card with Stars */}
          <Card className="glass-dark border-white/10">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center space-x-1 mb-2">
                <StarRating
                  rating={userProfile?.rating || 0}
                  layout="horizontal"
                  size="sm"
                  showValue={false}
                />
              </div>
              <p className="text-white font-bold text-sm">
                {(userProfile?.rating || 0).toFixed(1)}
              </p>
              <p className="text-blue-100 text-xs">Rating</p>
            </CardContent>
          </Card>

          {/* Exchanges Card */}
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
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">
                  Name
                </Label>
                <Input
                  id="name"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="glass-dark text-white border-white/20"
                  placeholder="Your name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-white">
                  Phone
                </Label>
                <Input
                  id="phone"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className="glass-dark text-white border-white/20"
                  placeholder="Your phone number"
                />
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                >
                  Save
                </Button>
                <Button
                  onClick={handleCancelEdit}
                  disabled={loading}
                  className="flex-1 glass-dark text-white hover:bg-white/10 border-white/20"
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : showPasswordForm ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-white">
                  Current Password
                </Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      currentPassword: e.target.value,
                    }))
                  }
                  className="glass-dark text-white border-white/20"
                  placeholder="Enter current password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-white">
                  New Password
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      newPassword: e.target.value,
                    }))
                  }
                  className="glass-dark text-white border-white/20"
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-white">
                  Confirm New Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                  className="glass-dark text-white border-white/20"
                  placeholder="Confirm new password"
                />
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={handleChangePassword}
                  disabled={loading}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                >
                  Change Password
                </Button>
                <Button
                  onClick={handleCancelPasswordChange}
                  disabled={loading}
                  className="flex-1 glass-dark text-white hover:bg-white/10 border-white/20"
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Button
                onClick={handleEditProfile}
                className="w-full glass-dark text-white hover:bg-white/10 border-white/20"
                variant="outline"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>

              <Button
                onClick={() => {
                  if (onOpenVerification) {
                    onClose();
                    onOpenVerification();
                  } else {
                    setShowVerification(true);
                  }
                }}
                className="w-full glass-dark text-white hover:bg-white/10 border-white/20"
                variant="outline"
              >
                <Shield className="mr-2 h-4 w-4" />
                Verification
              </Button>

              <Button
                onClick={() => setShowPasswordForm(true)}
                className="w-full glass-dark text-white hover:bg-white/10 border-white/20"
                variant="outline"
              >
                <Key className="mr-2 h-4 w-4" />
                Change Password
              </Button>
            </>
          )}

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

      {/* Verification Modal */}
      <VerificationModal
        isOpen={showVerification}
        onClose={() => setShowVerification(false)}
      />
    </Dialog>
  );
}
