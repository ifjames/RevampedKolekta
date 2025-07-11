import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { Card, CardContent } from '@/components/ui/card';
import { Coins, X, UserPlus, LogIn } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { toastError } from '@/utils/notifications';

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signUpSchema = signInSchema.extend({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  confirmPassword: z.string().min(6, 'Please confirm your password'),
  agreeToTerms: z.boolean().refine(val => val === true, 'You must agree to the terms and conditions'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignInFormData = z.infer<typeof signInSchema>;
type SignUpFormData = z.infer<typeof signUpSchema>;

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}

export function AuthModal({ isOpen, onClose, initialMode = 'signin' }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      agreeToTerms: false,
    },
  });

  const handleSignIn = async (data: SignInFormData) => {
    setLoading(true);
    try {
      await signIn(data.email, data.password);
      onClose();
    } catch (error) {
      // Error is already handled in the context
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (data: SignUpFormData) => {
    setLoading(true);
    try {
      await signUp(data.email, data.password, data.name, data.phone);
      onClose();
    } catch (error) {
      // Error is already handled in the context
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    signInForm.reset();
    signUpForm.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-sm max-h-[95vh] overflow-y-auto glass-effect border-white/20 bg-blue-900/95 p-4 sm:p-6">
        <DialogHeader className="text-center">
          <img src="/kolekta-logo.png" alt="Kolekta" className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 sm:mb-4" />
          <DialogTitle className="text-xl sm:text-2xl font-bold text-white">
            {isSignUp ? 'Join Kolekta' : 'Welcome Back'}
          </DialogTitle>
          <DialogDescription className="text-blue-100 mt-1 sm:mt-2 text-sm">
            {isSignUp ? 'Join the community of cash exchangers' : 'Sign in to your account'}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {isSignUp ? (
            <motion.div
              key="signup"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-3 sm:space-y-4">
                <div>
                  <Label htmlFor="name" className="text-blue-100">Full Name</Label>
                  <Input
                    id="name"
                    {...signUpForm.register('name')}
                    className="bg-white/10 border-white/20 text-white placeholder:text-blue-200 focus:ring-blue-400"
                    placeholder="Enter your full name"
                  />
                  {signUpForm.formState.errors.name && (
                    <p className="text-red-400 text-sm mt-1">
                      {signUpForm.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone" className="text-blue-100">Phone Number (Optional)</Label>
                  <Input
                    id="phone"
                    {...signUpForm.register('phone')}
                    className="bg-white/10 border-white/20 text-white placeholder:text-blue-200 focus:ring-blue-400"
                    placeholder="+639123456789"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-blue-100">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...signUpForm.register('email')}
                    className="bg-white/10 border-white/20 text-white placeholder:text-blue-200 focus:ring-blue-400"
                    placeholder="Enter your email"
                  />
                  {signUpForm.formState.errors.email && (
                    <p className="text-red-400 text-sm mt-1">
                      {signUpForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="password" className="text-blue-100">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    {...signUpForm.register('password')}
                    className="bg-white/10 border-white/20 text-white placeholder:text-blue-200 focus:ring-blue-400"
                    placeholder="Enter your password"
                  />
                  {signUpForm.formState.errors.password && (
                    <p className="text-red-400 text-sm mt-1">
                      {signUpForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="confirmPassword" className="text-blue-100">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    {...signUpForm.register('confirmPassword')}
                    className="bg-white/10 border-white/20 text-white placeholder:text-blue-200 focus:ring-blue-400"
                    placeholder="Confirm your password"
                  />
                  {signUpForm.formState.errors.confirmPassword && (
                    <p className="text-red-400 text-sm mt-1">
                      {signUpForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="agreeToTerms"
                    checked={signUpForm.watch('agreeToTerms')}
                    onCheckedChange={(checked) => signUpForm.setValue('agreeToTerms', checked === true)}
                    className="mt-1"
                  />
                  <Label 
                    htmlFor="agreeToTerms" 
                    className="text-blue-100 text-sm leading-tight cursor-pointer"
                    onClick={() => {
                      const currentValue = signUpForm.getValues('agreeToTerms');
                      signUpForm.setValue('agreeToTerms', !currentValue);
                    }}
                  >
                    I agree to the{' '}
                    <a href="#" className="text-cyan-400 hover:underline" onClick={(e) => e.stopPropagation()}>Terms of Service</a>
                    {' '}and{' '}
                    <a href="#" className="text-cyan-400 hover:underline" onClick={(e) => e.stopPropagation()}>Privacy Policy</a>
                    {'. '}I understand that by using Kolekta, I am responsible for my own safety during cash exchanges and should always meet in public, well-lit locations.
                  </Label>
                </div>
                {signUpForm.formState.errors.agreeToTerms && (
                  <p className="text-red-400 text-sm mt-1">
                    {signUpForm.formState.errors.agreeToTerms.message}
                  </p>
                )}

                <Button 
                  type="submit" 
                  className="w-full bg-white text-blue-600 hover:bg-white/90"
                  disabled={loading}
                >
                  {loading ? (
                    <>Loading...</>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create Account
                    </>
                  )}
                </Button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="signin"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-3 sm:space-y-4">
                <div>
                  <Label htmlFor="email" className="text-blue-100">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...signInForm.register('email')}
                    className="bg-white/10 border-white/20 text-white placeholder:text-blue-200 focus:ring-blue-400"
                    placeholder="Enter your email"
                  />
                  {signInForm.formState.errors.email && (
                    <p className="text-red-400 text-sm mt-1">
                      {signInForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="password" className="text-blue-100">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    {...signInForm.register('password')}
                    className="bg-white/10 border-white/20 text-white placeholder:text-blue-200 focus:ring-blue-400"
                    placeholder="Enter your password"
                  />
                  {signInForm.formState.errors.password && (
                    <p className="text-red-400 text-sm mt-1">
                      {signInForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-white text-blue-600 hover:bg-white/90"
                  disabled={loading}
                >
                  {loading ? (
                    <>Loading...</>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Sign In
                    </>
                  )}
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="text-center mt-6">
          <p className="text-blue-100">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            <Button
              variant="link"
              onClick={toggleMode}
              className="text-white font-semibold hover:text-cyan-400 ml-1 p-0"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </Button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
