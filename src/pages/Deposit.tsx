import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { supabase } from '@/integrations/supabase/client';
import { 
  Wallet, 
  Loader2, 
  Bitcoin,
  AlertCircle,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  Timer
} from 'lucide-react';

interface DepositRecord {
  id: string;
  payment_id: string;
  payment_status: string;
  amount: number;
  expires_at: string;
  created_at: string;
}

export default function Deposit() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { handleError, checkSession } = useErrorHandler();
  const [amount, setAmount] = useState('10');
  const [loading, setLoading] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [currentDeposit, setCurrentDeposit] = useState<DepositRecord | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Countdown timer
  useEffect(() => {
    if (!currentDeposit?.expires_at) return;
    
    const updateTimer = () => {
      const expiresAt = new Date(currentDeposit.expires_at).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeRemaining(remaining);
      
      if (remaining === 0 && currentDeposit.payment_status === 'pending') {
        setCurrentDeposit(prev => prev ? { ...prev, payment_status: 'expired' } : null);
      }
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [currentDeposit?.expires_at, currentDeposit?.payment_status]);

  // Realtime subscription for deposit status
  useEffect(() => {
    if (!currentDeposit?.id) return;
    
    const channel = supabase
      .channel(`deposit-${currentDeposit.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'deposits',
          filter: `id=eq.${currentDeposit.id}`
        },
        (payload) => {
          console.log('Deposit updated:', payload);
          const updated = payload.new as DepositRecord;
          setCurrentDeposit(prev => prev ? { ...prev, ...updated } : null);
          
          if (updated.payment_status === 'finished' || updated.payment_status === 'confirmed') {
            toast({
              title: 'Payment Confirmed!',
              description: 'Your balance has been updated.',
            });
            refreshProfile();
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentDeposit?.id, toast, refreshProfile]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handleCreatePayment = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 10) {
      toast({
        title: 'Invalid amount',
        description: 'Minimum deposit is $10.00',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Check session before creating payment
      const isSessionValid = await checkSession();
      if (!isSessionValid) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('cryptomus-create', {
        body: { amount: numAmount, currency: 'usd' }
      });

      if (error) {
        await handleError(error, 'CreatePayment');
        return;
      }

      if (data.success && data.invoice_url) {
        setInvoiceUrl(data.invoice_url);
        
        // Fetch the created deposit
        if (data.deposit?.id) {
          const { data: deposit } = await supabase
            .from('deposits')
            .select('*')
            .eq('id', data.deposit.id)
            .single();
          
          if (deposit) {
            setCurrentDeposit({
              ...deposit,
              amount: Number(deposit.amount)
            });
          }
        }
        
        toast({
          title: 'Payment Created',
          description: 'Complete payment within 1 hour to avoid expiration.',
        });
      } else {
        await handleError(new Error(data.error || 'Failed to create payment'), 'CreatePayment');
      }
    } catch (error) {
      await handleError(error, 'CreatePayment');
    } finally {
      setLoading(false);
    }
  };

  const openPaymentPage = () => {
    if (invoiceUrl) {
      window.open(invoiceUrl, '_blank');
    }
  };

  const resetPayment = () => {
    setInvoiceUrl(null);
    setCurrentDeposit(null);
    setTimeRemaining(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'finished':
      case 'confirmed':
        return (
          <Badge className="bg-success/20 text-success border-success/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Confirmed
          </Badge>
        );
      case 'expired':
        return (
          <Badge className="bg-destructive/20 text-destructive border-destructive/30">
            <XCircle className="h-3 w-3 mr-1" />
            Expired
          </Badge>
        );
      case 'waiting':
      case 'pending':
        return (
          <Badge className="bg-warning/20 text-warning border-warning/30">
            <Clock className="h-3 w-3 mr-1" />
            Waiting
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (authLoading || !user) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const isExpired = currentDeposit?.payment_status === 'expired' || timeRemaining === 0;
  const isConfirmed = currentDeposit?.payment_status === 'finished' || currentDeposit?.payment_status === 'confirmed';

  return (
    <Layout>
      <SEO 
        title="Deposit Funds with Cryptocurrency"
        description="Add funds to your CryptoMails account using cryptocurrency. We accept Bitcoin (BTC), Ethereum (ETH), USDT, Litecoin and 50+ other cryptocurrencies. Instant balance updates."
        canonical="/deposit"
        keywords="crypto deposit, bitcoin deposit, USDT payment, cryptocurrency payment, add funds, wallet deposit"
        noindex={true}
      />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Deposit Funds</h1>
          <p className="text-muted-foreground">Add funds to your account using cryptocurrency</p>
        </div>

        {/* Current Balance */}
        <Card className="bg-card/50 border-border/50 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
                <p className="text-3xl font-bold text-primary">${profile?.balance?.toFixed(2) || '0.00'}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {!invoiceUrl ? (
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bitcoin className="h-5 w-5 text-warning" />
                Create Payment
              </CardTitle>
              <CardDescription>
                Enter the amount you want to deposit. Minimum $10.00
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (USD)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="amount"
                    type="number"
                    min="10"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-8 bg-secondary/50 border-border/50"
                    placeholder="10.00"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                {[10, 25, 50, 100].map((preset) => (
                  <Button
                    key={preset}
                    variant={amount === preset.toString() ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAmount(preset.toString())}
                  >
                    ${preset}
                  </Button>
                ))}
              </div>

              <Button 
                onClick={handleCreatePayment} 
                className="w-full" 
                variant="glow"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Bitcoin className="h-4 w-4" />
                    Create Payment
                  </>
                )}
              </Button>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                <AlertCircle className="h-4 w-4 text-warning mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Payments expire after 1 hour. Complete your payment quickly to avoid expiration.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className={`bg-card/50 border-border/50 ${isExpired ? 'opacity-75' : ''}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className={`flex items-center gap-2 ${isConfirmed ? 'text-success' : isExpired ? 'text-destructive' : ''}`}>
                  <Bitcoin className="h-5 w-5" />
                  {isConfirmed ? 'Payment Confirmed' : isExpired ? 'Payment Expired' : 'Payment Ready'}
                </CardTitle>
                {currentDeposit && getStatusBadge(currentDeposit.payment_status)}
              </div>
              <CardDescription>
                {isConfirmed 
                  ? 'Your balance has been updated successfully!'
                  : isExpired 
                    ? 'This payment has expired. Please create a new one.'
                    : 'Click the button below to open the payment page and complete your deposit.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Countdown Timer */}
              {!isConfirmed && !isExpired && timeRemaining !== null && (
                <div className={`p-4 rounded-lg text-center ${timeRemaining < 600 ? 'bg-destructive/10 border border-destructive/20' : 'bg-warning/10 border border-warning/20'}`}>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Timer className={`h-5 w-5 ${timeRemaining < 600 ? 'text-destructive' : 'text-warning'}`} />
                    <span className={`text-2xl font-mono font-bold ${timeRemaining < 600 ? 'text-destructive' : 'text-warning'}`}>
                      {formatTime(timeRemaining)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {timeRemaining < 600 ? 'Hurry! Payment expires soon' : 'Time remaining to complete payment'}
                  </p>
                </div>
              )}

              <div className="p-4 rounded-lg bg-secondary/50 text-center">
                <p className="text-2xl font-bold text-primary">${amount}</p>
                <p className="text-sm text-muted-foreground">Amount to deposit</p>
              </div>

              {!isExpired && !isConfirmed && (
                <Button 
                  variant="glow" 
                  className="w-full"
                  onClick={openPaymentPage}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Payment Page
                </Button>
              )}

              {!isConfirmed && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <AlertCircle className="h-4 w-4 text-primary mt-0.5" />
                  <div className="text-xs text-muted-foreground space-y-1">
                    {isExpired ? (
                      <p>• This payment has expired. Create a new payment to continue.</p>
                    ) : (
                      <>
                        <p>• Complete payment on the Cryptomus page</p>
                        <p>• Your balance will update automatically after confirmation</p>
                        <p>• Status updates in real-time - no need to refresh</p>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={resetPayment}
                >
                  {isExpired || isConfirmed ? 'New Payment' : 'Cancel'}
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    refreshProfile();
                    navigate('/dashboard');
                  }}
                >
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
