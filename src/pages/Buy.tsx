import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useLiveStock } from '@/hooks/useLiveStock';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/lib/types';
import { 
  ShoppingCart, 
  Loader2, 
  Mail,
  Wallet,
  AlertCircle,
  CheckCircle,
  Minus,
  Plus,
  Radio
} from 'lucide-react';

export default function Buy() {
  const { productId } = useParams();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { liveStock, isChecking, lastChecked } = useLiveStock();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  // Subscribe to realtime updates for this product
  useEffect(() => {
    if (!productId) return;

    const channel = supabase
      .channel(`product-${productId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products',
          filter: `id=eq.${productId}`
        },
        (payload) => {
          const updated = payload.new as any;
          setProduct({ ...updated, price: Number(updated.price) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [productId]);

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setProduct({ ...data, price: Number(data.price) });
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast({
        title: 'Error',
        description: 'Product not found.',
        variant: 'destructive',
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  // Get live stock from DongVan API
  const liveStockCount = useMemo(() => {
    if (!product) return 0;
    return liveStock[product.dongvan_id] ?? product.stock;
  }, [product, liveStock]);

  const totalPrice = product ? product.price * quantity : 0;
  const hasEnoughBalance = (profile?.balance || 0) >= totalPrice;
  const maxQuantity = product ? Math.min(liveStockCount, Math.floor((profile?.balance || 0) / product.price)) : 0;

  const handlePurchase = async () => {
    if (!product || !user || !hasEnoughBalance) return;

    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke('dongvan-api', {
        body: { 
          action: 'buy_mail',
          product_id: product.id,
          quantity,
          total_price: totalPrice
        }
      });

      if (error) throw error;

      if (data.success) {
        await refreshProfile();
        toast({
          title: 'Purchase Successful!',
          description: `You have purchased ${quantity} account(s). Check your dashboard.`,
        });
        navigate('/dashboard');
      } else {
        throw new Error(data.error || 'Purchase failed');
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast({
        title: 'Purchase Failed',
        description: error.message || 'Failed to complete purchase. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setPurchasing(false);
    }
  };

  if (authLoading || loading || !user) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
          <Button onClick={() => navigate('/')}>Back to Products</Button>
        </div>
      </Layout>
    );
  }

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || `Premium ${product.name} mail accounts with OAuth2 support`,
    offers: {
      '@type': 'Offer',
      price: product.price.toFixed(2),
      priceCurrency: 'USD',
      availability: liveStockCount > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'CryptoMails'
      }
    }
  };

  return (
    <Layout>
      <SEO 
        title={`Buy ${product.name} - $${product.price.toFixed(2)} Each`}
        description={`Purchase ${product.name} mail accounts at $${product.price.toFixed(2)} each. ${liveStockCount.toLocaleString()} in stock. Instant delivery with cryptocurrency payment. OAuth2 support included.`}
        canonical={`/buy/${productId}`}
        type="product"
        keywords={`buy ${product.name.toLowerCase()}, ${product.name.toLowerCase()} for sale, mail accounts, crypto payment`}
        noindex={true}
        jsonLd={productJsonLd}
      />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Complete Purchase</h1>
          <p className="text-muted-foreground">Review your order and confirm</p>
        </div>

        {/* Balance Card */}
        <Card className="bg-card/50 border-border/50 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Your Balance</p>
                  <p className="font-bold text-primary">${profile?.balance?.toFixed(2) || '0.00'}</p>
                </div>
              </div>
              {!hasEnoughBalance && (
                <Button variant="outline" size="sm" onClick={() => navigate('/deposit')}>
                  Add Funds
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Product Details */}
        <Card className="bg-card/50 border-border/50 mb-6">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Mail className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle>{product.name}</CardTitle>
                <CardDescription>{product.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
              <span className="text-muted-foreground">Price per account</span>
              <span className="font-bold text-primary">${product.price.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Available Stock</span>
                <div className="flex items-center gap-1.5">
                  <Radio className={`h-3 w-3 ${isChecking ? 'text-yellow-500 animate-pulse' : 'text-green-500'}`} />
                  <span className="text-xs text-muted-foreground">Live</span>
                </div>
              </div>
              <span className={liveStockCount > 0 ? 'text-success font-medium' : 'text-destructive'}>
                {liveStockCount.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Quantity Selection */}
        <Card className="bg-card/50 border-border/50 mb-6">
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Quantity</Label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  min="1"
                  max={maxQuantity}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.min(maxQuantity, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-24 text-center bg-secondary/50 border-border/50"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                  disabled={quantity >= maxQuantity}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Max: {maxQuantity} (based on your balance)
              </p>
            </div>

            <div className="border-t border-border/50 pt-4">
              <div className="flex items-center justify-between text-lg">
                <span className="font-medium">Total</span>
                <span className="font-bold text-primary">${totalPrice.toFixed(2)}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Balance after purchase: ${((profile?.balance || 0) - totalPrice).toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {!hasEnoughBalance ? (
          <Card className="bg-destructive/10 border-destructive/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">Insufficient Balance</p>
                  <p className="text-sm text-muted-foreground">
                    You need ${(totalPrice - (profile?.balance || 0)).toFixed(2)} more to complete this purchase.
                  </p>
                </div>
              </div>
              <Button 
                className="w-full mt-4" 
                variant="glow"
                onClick={() => navigate('/deposit')}
              >
                <Wallet className="h-4 w-4" />
                Add Funds
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => navigate('/')}
            >
              Cancel
            </Button>
            <Button 
              variant="glow" 
              className="flex-1"
              onClick={handlePurchase}
              disabled={purchasing || liveStockCount === 0}
            >
              {purchasing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Confirm Purchase
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
