import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useLiveStock } from '@/hooks/useLiveStock';
import { 
  Mail, 
  ShoppingCart, 
  Zap, 
  Shield, 
  Clock, 
  CheckCircle,
  Package,
  Loader2,
  AlertCircle,
  RefreshCw,
  Wifi
} from 'lucide-react';

export default function Index() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { liveStock, isChecking, isInitialLoading, lastChecked } = useLiveStock(10000); // Check every 10 seconds

  // Merge live stock with products
  const productsWithLiveStock = useMemo(() => {
    return products.map(product => ({
      ...product,
      stock: liveStock[product.dongvan_id] ?? product.stock
    }));
  }, [products, liveStock]);

  useEffect(() => {
    fetchProducts();

    // Subscribe to realtime product updates
    const channel = supabase
      .channel('products-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products'
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setProducts(prev => prev.map(p => 
              p.id === payload.new.id 
                ? { ...payload.new as Product, price: Number((payload.new as any).price) }
                : p
            ));
          } else if (payload.eventType === 'INSERT') {
            const newProduct = payload.new as any;
            if (newProduct.is_active) {
              setProducts(prev => [...prev, { ...newProduct, price: Number(newProduct.price) }]);
            }
          } else if (payload.eventType === 'DELETE') {
            setProducts(prev => prev.filter(p => p.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;
      setProducts((data || []).map(p => ({ ...p, price: Number(p.price) })));
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = (product: Product) => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please sign in to purchase mail accounts.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }
    navigate(`/buy/${product.id}`);
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl opacity-50" />
        
        <div className="container mx-auto px-4 relative">
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="outline" className="mb-4 px-4 py-1 border-primary/30 text-primary">
              <Zap className="h-3 w-3 mr-1" />
              Trusted Mail Provider
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Premium <span className="text-gradient">Mail Accounts</span> for Facebook Verification
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Get high-quality Hotmail & Outlook accounts with OAuth2 support. 
              Instant delivery, crypto payments, and 24/7 availability.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="glow" size="xl" onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}>
                <ShoppingCart className="h-5 w-5" />
                Browse Products
              </Button>
              {!user && (
                <Button variant="outline" size="xl" onClick={() => navigate('/auth?mode=signup')}>
                  Create Account
                </Button>
              )}
            </div>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-4 gap-4 mt-16">
            {[
              { icon: Shield, label: '100% Live Checked', desc: 'All accounts verified before delivery' },
              { icon: Zap, label: 'Instant Delivery', desc: 'Get your accounts immediately' },
              { icon: Mail, label: 'OAuth2 Support', desc: 'Read mailbox via Graph API' },
              { icon: Clock, label: '24/7 Available', desc: 'Automated system always online' },
            ].map((feature, i) => (
              <Card key={i} className="bg-card/50 border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{feature.label}</p>
                    <p className="text-xs text-muted-foreground">{feature.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold">Available Products</h2>
              <p className="text-muted-foreground">High-quality mail accounts with OAuth2 support</p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                isChecking 
                  ? 'bg-warning/10 text-warning border border-warning/20' 
                  : 'bg-success/10 text-success border border-success/20'
              }`}>
                {isChecking ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <Wifi className="h-3 w-3" />
                )}
                <span>Live Stock</span>
              </div>
              {lastChecked && (
                <span className="text-xs text-muted-foreground">
                  Updated: {lastChecked.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : productsWithLiveStock.length === 0 ? (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="py-20 text-center">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Products Available</h3>
                <p className="text-muted-foreground">Products will be available soon. Check back later!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">ID</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">Product</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-muted-foreground">Live</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-muted-foreground">Price</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-muted-foreground">Stock</th>
                    <th className="text-right py-4 px-4 text-sm font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {productsWithLiveStock.map((product, index) => (
                    <tr 
                      key={product.id} 
                      className="border-b border-border/30 hover:bg-secondary/30 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <span className="text-muted-foreground">#{index + 1}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                            <Mail className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            {product.description && (
                              <p className="text-xs text-muted-foreground max-w-xs truncate">
                                {product.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-muted-foreground text-sm">
                          {product.live_duration || '-'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        {isInitialLoading ? (
                          <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Checking
                          </Badge>
                        ) : product.stock > 0 ? (
                          <Badge variant="outline" className="border-success/30 text-success">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Live
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-destructive/30 text-destructive">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Out of Stock
                          </Badge>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-primary font-bold">${product.price.toFixed(2)}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        {isInitialLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                        ) : (
                          <span className={product.stock > 0 ? 'text-success' : 'text-muted-foreground'}>
                            {product.stock.toLocaleString()}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Button
                          variant={!isInitialLoading && product.stock > 0 ? 'glow' : 'outline'}
                          size="sm"
                          onClick={() => handleBuy(product)}
                          disabled={isInitialLoading || product.stock === 0}
                        >
                          {isInitialLoading ? 'Loading...' : product.stock > 0 ? 'Buy Now' : 'Notify Me'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 border-t border-border/50">
        <div className="container mx-auto px-4">
          <Card className="bg-gradient-to-r from-primary/10 via-card to-accent/10 border-primary/20">
            <CardContent className="py-12 text-center">
              <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Create an account, deposit funds via crypto, and start purchasing mail accounts instantly.
              </p>
              <Button variant="glow" size="lg" onClick={() => navigate(user ? '/deposit' : '/auth?mode=signup')}>
                {user ? 'Deposit Funds' : 'Create Account'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
}
