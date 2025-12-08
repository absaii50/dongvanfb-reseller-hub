import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
});

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(searchParams.get('mode') === 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = authSchema.parse({ email, password });

      if (isSignUp) {
        const { error } = await signUp(validated.email, validated.password);
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: 'Account exists',
              description: 'This email is already registered. Please sign in instead.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Sign up failed',
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: 'Account created!',
            description: 'Welcome to CryptoMails. You are now logged in.',
          });
          navigate('/dashboard');
        }
      } else {
        const { error } = await signIn(validated.email, validated.password);
        if (error) {
          toast({
            title: 'Sign in failed',
            description: 'Invalid email or password.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Welcome back!',
            description: 'You have successfully signed in.',
          });
          navigate('/dashboard');
        }
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: 'Validation error',
          description: err.errors[0].message,
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const authJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: isSignUp ? 'Create Account - CryptoMails' : 'Sign In - CryptoMails',
    description: isSignUp 
      ? 'Create a CryptoMails account to start purchasing premium mail accounts with cryptocurrency.' 
      : 'Sign in to your CryptoMails account to manage orders and deposits.',
    url: `https://cryptomails.world/auth${isSignUp ? '?mode=signup' : ''}`
  };

  return (
    <>
      <Helmet>
        <title>{isSignUp ? 'Create Account - Start Buying Mail Accounts' : 'Sign In to Your Account'} | CryptoMails</title>
        <meta name="title" content={isSignUp ? 'Create Account - Start Buying Mail Accounts | CryptoMails' : 'Sign In to Your Account | CryptoMails'} />
        <meta name="description" content={isSignUp 
          ? 'Create a free CryptoMails account to start purchasing premium Hotmail & Outlook mail accounts with cryptocurrency. Instant delivery, 24/7 service.' 
          : 'Sign in to your CryptoMails account to manage orders, view purchase history, and deposit funds with cryptocurrency.'} />
        <meta name="keywords" content={isSignUp ? 'create account, sign up, register, mail accounts, cryptocurrency' : 'sign in, login, account access, cryptomails'} />
        <link rel="canonical" href={`https://cryptomails.world/auth${isSignUp ? '?mode=signup' : ''}`} />
        <meta property="og:title" content={isSignUp ? 'Create Account | CryptoMails' : 'Sign In | CryptoMails'} />
        <meta property="og:description" content={isSignUp 
          ? 'Create a free CryptoMails account to start purchasing premium mail accounts.' 
          : 'Sign in to manage your CryptoMails orders and deposits.'} />
        <meta property="og:url" content={`https://cryptomails.world/auth${isSignUp ? '?mode=signup' : ''}`} />
        <script type="application/ld+json">{JSON.stringify(authJsonLd)}</script>
      </Helmet>
      <div className="min-h-screen bg-background bg-grid-pattern flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      
      <Card className="w-full max-w-md relative glass border-border/50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 relative">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Mail className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="absolute -inset-2 rounded-xl bg-primary/20 blur-lg -z-10" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </CardTitle>
          <CardDescription>
            {isSignUp
              ? 'Sign up to start purchasing mail accounts'
              : 'Sign in to your CryptoMails account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-secondary/50 border-border/50"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-secondary/50 border-border/50"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" variant="glow" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </CardContent>
      </Card>
      </div>
    </>
  );
}
