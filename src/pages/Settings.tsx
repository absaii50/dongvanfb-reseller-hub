import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Mail, Wallet, Shield, Loader2, AtSign } from 'lucide-react';

export default function Settings() {
  const { user, profile, isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Email change state
  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  // Redirect if not logged in
  if (!user) {
    navigate('/auth');
    return null;
  }

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all password fields.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Password Mismatch',
        description: 'New passwords do not match.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Password Too Short',
        description: 'Password must be at least 6 characters.',
        variant: 'destructive',
      });
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: 'Password Updated',
        description: 'Your password has been changed successfully.',
      });
      
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Password change error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update password.',
        variant: 'destructive',
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleEmailChange = async () => {
    if (!newEmail) {
      toast({
        title: 'Missing Email',
        description: 'Please enter a new email address.',
        variant: 'destructive',
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    if (newEmail === user.email) {
      toast({
        title: 'Same Email',
        description: 'New email is the same as current email.',
        variant: 'destructive',
      });
      return;
    }

    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (error) throw error;

      toast({
        title: 'Confirmation Email Sent',
        description: 'Please check your new email inbox to confirm the change.',
      });
      
      setNewEmail('');
    } catch (error: any) {
      console.error('Email change error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update email.',
        variant: 'destructive',
      });
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
          <p className="text-muted-foreground">Manage your account and security settings</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Account Info */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Information
              </CardTitle>
              <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Email Address</Label>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30 border border-border/30">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{user.email}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Account Balance</Label>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30 border border-border/30">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="font-medium text-primary">${profile?.balance?.toFixed(2) || '0.00'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Account Type</Label>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30 border border-border/30">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{isAdmin ? 'Administrator' : 'User'}</span>
                  {isAdmin && (
                    <span className="ml-auto text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">Admin</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Member Since</Label>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30 border border-border/30">
                  <span className="font-medium">
                    {profile?.created_at 
                      ? new Date(profile.created_at).toLocaleDateString() 
                      : new Date(user.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Change Email */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AtSign className="h-5 w-5" />
                Change Email
              </CardTitle>
              <CardDescription>Update your email address</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Current Email</Label>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30 border border-border/30">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{user.email}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>New Email Address</Label>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter new email address"
                  className="bg-secondary/50 border-border/50"
                />
              </div>

              <Button 
                onClick={handleEmailChange} 
                disabled={emailLoading}
                variant="glow"
                className="w-full"
              >
                {emailLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Update Email'
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                A confirmation link will be sent to your new email
              </p>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="bg-secondary/50 border-border/50"
                />
              </div>

              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="bg-secondary/50 border-border/50"
                />
              </div>

              <Button 
                onClick={handlePasswordChange} 
                disabled={passwordLoading}
                variant="glow"
                className="w-full"
              >
                {passwordLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Update Password'
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Password must be at least 6 characters long
              </p>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common account actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => navigate('/deposit')}>
                  <Wallet className="h-4 w-4 mr-2" />
                  Deposit Funds
                </Button>
                <Button variant="outline" onClick={() => navigate('/dashboard')}>
                  <User className="h-4 w-4 mr-2" />
                  View Dashboard
                </Button>
                <Button variant="outline" onClick={() => navigate('/')}>
                  Browse Products
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
