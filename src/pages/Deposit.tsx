import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Wallet, 
  Loader2, 
  Bitcoin,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

export default function Deposit() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [amount, setAmount] = useState('10');
  const [loading, setLoading] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleCreatePayment = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 5) {
      toast({
        title: 'Invalid amount',
        description: 'Minimum deposit is $5.00',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('nowpayments-create', {
        body: { amount: numAmount, currency: 'usd' }
      });

      if (error) throw error;

      if (data.success && data.invoice_url) {
        setInvoiceUrl(data.invoice_url);
        toast({
          title: 'Payment Created',
          description: 'Click the button below to complete your payment.',
        });
      } else {
        throw new Error(data.error || 'Failed to create payment');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: 'Payment Error',
        description: error.message || 'Failed to create payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openPaymentPage = () => {
    if (invoiceUrl) {
      window.open(invoiceUrl, '_blank');
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

  return (
    <Layout>
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
                Enter the amount you want to deposit. Minimum $5.00
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
                    min="5"
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
                  Payments are processed via NOWPayments. Your balance will be credited automatically once payment is confirmed.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-success">
                <Bitcoin className="h-5 w-5" />
                Payment Ready
              </CardTitle>
              <CardDescription>
                Click the button below to open the payment page and complete your deposit.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-lg bg-secondary/50 text-center">
                <p className="text-2xl font-bold text-primary">${amount}</p>
                <p className="text-sm text-muted-foreground">Amount to deposit</p>
              </div>

              <Button 
                variant="glow" 
                className="w-full"
                onClick={openPaymentPage}
              >
                <ExternalLink className="h-4 w-4" />
                Open Payment Page
              </Button>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <AlertCircle className="h-4 w-4 text-primary mt-0.5" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Complete payment on the NOWPayments page</p>
                  <p>• Your balance will update automatically after confirmation</p>
                  <p>• This may take a few minutes depending on network congestion</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setInvoiceUrl(null)}
                >
                  New Payment
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
