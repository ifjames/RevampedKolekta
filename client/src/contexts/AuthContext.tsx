import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
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
          // Get user profile from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            // Convert Firestore timestamp to Date if needed
            const profile = {
              id: user.uid,
              ...data,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now())
            } as UserProfile;
            setUserProfile(profile);
          } else {
            // Create default profile if it doesn't exist
            const defaultProfile: Omit<UserProfile, 'id'> = {
              name: user.displayName || 'User',
              email: user.email || '',
              verified: false,
              rating: 5.0,
              completedExchanges: 0,
              createdAt: new Date(),
            };
            
            await setDoc(doc(db, 'users', user.uid), defaultProfile);
            setUserProfile({ id: user.uid, ...defaultProfile });
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
        rating: 5.0,
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
      await setDoc(doc(db, 'users', user.uid), data, { merge: true });
      setUserProfile(prev => prev ? { ...prev, ...data } : null);
      toastSuccess('Profile updated successfully');
    } catch (error: any) {
      console.error('Update profile error:', error);
      toastError('Failed to update profile');
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
