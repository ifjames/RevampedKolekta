import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { UserProfile } from '@/types';
import { toastSuccess, toastError } from '@/utils/notifications';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        try {
          // Try multiple collections to get user profile data
          let profileData = null;
          
          // First check 'users' collection
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            profileData = userDoc.data();
          } else {
            // Then check 'userProfiles' collection
            const userProfileDoc = await getDoc(doc(db, 'userProfiles', user.uid));
            if (userProfileDoc.exists()) {
              profileData = userProfileDoc.data();
            }
          }
          
          if (profileData) {
            // Use actual database data - preserve all values including rating changes
            const profile = {
              id: user.uid,
              name: profileData.name || user.displayName || 'User',
              email: profileData.email || user.email || '',
              verified: profileData.verified === true,
              rating: profileData.averageRating || profileData.rating || 0, // Use averageRating first (updated by rating system)
              completedExchanges: profileData.completedExchanges || 0,
              phone: profileData.phone,
              createdAt: profileData.createdAt?.toDate ? profileData.createdAt.toDate() : new Date(profileData.createdAt || Date.now())
            } as UserProfile;
            setUserProfile(profile);
          } else {
            // Only create minimal profile if absolutely none exists
            const minimalProfile: Omit<UserProfile, 'id'> = {
              name: user.displayName || 'User',
              email: user.email || '',
              verified: false,
              rating: 0, // Start with 0 rating, not 5.0
              completedExchanges: 0,
              createdAt: new Date(),
            };
            
            await setDoc(doc(db, 'users', user.uid), minimalProfile);
            setUserProfile({ id: user.uid, ...minimalProfile });
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toastSuccess('Welcome back!');
    } catch (error: any) {
      console.error('Sign in error:', error);
      toastError(error.message || 'Failed to sign in');
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name: string, phone?: string) => {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update Firebase Auth profile
      await updateProfile(user, { displayName: name });
      
      // Create Firestore user document
      const userProfile: Omit<UserProfile, 'id'> = {
        name,
        email,
        phone,
        verified: false,
        rating: 0,
        completedExchanges: 0,
        createdAt: new Date(),
      };
      
      await setDoc(doc(db, 'users', user.uid), userProfile);
      
      toastSuccess('Account created successfully!');
    } catch (error: any) {
      console.error('Sign up error:', error);
      toastError(error.message || 'Failed to create account');
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toastSuccess('Logged out successfully');
    } catch (error: any) {
      console.error('Logout error:', error);
      toastError('Failed to logout');
      throw error;
    }
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) throw new Error('No user logged in');
    
    try {
      // Update both collections to ensure data consistency
      await Promise.all([
        setDoc(doc(db, 'users', user.uid), data, { merge: true }),
        setDoc(doc(db, 'userProfiles', user.uid), data, { merge: true })
      ]);
      setUserProfile(prev => prev ? { ...prev, ...data } : null);
      toastSuccess('Profile updated successfully');
    } catch (error: any) {
      console.error('Update profile error:', error);
      toastError('Failed to update profile');
      throw error;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user || !user.email) throw new Error('No user logged in');
    
    try {
      // Re-authenticate user before password change
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      
      toastSuccess('Password updated successfully');
    } catch (error: any) {
      console.error('Change password error:', error);
      if (error.code === 'auth/wrong-password') {
        toastError('Current password is incorrect');
      } else if (error.code === 'auth/weak-password') {
        toastError('New password is too weak');
      } else {
        toastError('Failed to update password');
      }
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    logout,
    updateUserProfile,
    changePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
