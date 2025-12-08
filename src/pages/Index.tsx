import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { SEO } from '@/components/SEO';
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
  Wifi,
  WifiOff,
  Database
} from 'lucide-react';

export default function Index() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { liveStock, isChecking, isInitialLoading, lastChecked, useFallback } = useLiveStock(10000); // Check every 10 seconds

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

  const homeJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'CryptoMails',
    url: 'https://cryptomails.world/',
    description: 'Premium mail account provider for Facebook verification with cryptocurrency payments',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://cryptomails.world/search?q={search_term_string}',
      'query-input': 'required name=search_term_string'
    }
  };

  return (
    <Layout>
      <SEO 
        title="Buy Premium Facebook Mail Accounts with Cryptocurrency"
        description="Buy premium Hotmail & Outlook mail accounts for Facebook verification. Instant delivery, cryptocurrency payments (Bitcoin, USDT, Ethereum), OAuth2 support, and 24/7 automated service. Trusted by thousands."
        canonical="/"
        keywords="buy mail accounts, facebook mail accounts, hotmail accounts for sale, outlook accounts, crypto payment, bitcoin mail, cryptocurrency email, email verification, oauth2 mail, bulk mail accounts, instant delivery mail"
        jsonLd={homeJsonLd}
      />
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
              {useFallback ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-warning/10 text-warning border border-warning/20">
                  <Database className="h-3 w-3" />
                  <span>Cached Stock</span>
                </div>
              ) : (
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
              )}
              {lastChecked && !useFallback && (
                <span className="text-xs text-muted-foreground">
                  Updated: {lastChecked.toLocaleTimeString()}
                </span>
              )}
              {useFallback && (
                <span className="text-xs text-muted-foreground">
                  API unavailable - showing database stock
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

      {/* SEO Content - About Section */}
      <section className="py-16 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-center">About CryptoMails - Your Trusted Mail Account Provider</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-muted-foreground mb-4">
                CryptoMails is a leading provider of premium Hotmail and Outlook mail accounts for Facebook verification and social media marketing. 
                We specialize in delivering high-quality, live-checked email accounts with OAuth2 support, enabling seamless integration with 
                Microsoft Graph API for reading verification codes and managing your mailbox programmatically.
              </p>
              <p className="text-muted-foreground">
                Our automated platform operates 24/7, ensuring instant delivery of your purchased accounts. With cryptocurrency payment options 
                including Bitcoin, Ethereum, USDT, and 50+ other cryptocurrencies, we provide a secure and anonymous purchasing experience 
                for users worldwide.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SEO Content - Why Choose Us */}
      <section className="py-16 border-t border-border/50 bg-secondary/20">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-8 text-center">Why Choose CryptoMails?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { title: '100% Live Checked', desc: 'Every mail account is verified and tested before delivery to ensure functionality and quality.' },
              { title: 'Instant Automated Delivery', desc: 'Receive your mail account credentials within seconds after payment confirmation.' },
              { title: 'OAuth2 & Graph API Support', desc: 'All accounts support OAuth2 authentication for reading mailbox via Microsoft Graph API.' },
              { title: 'Cryptocurrency Payments', desc: 'Pay securely with Bitcoin, Ethereum, USDT, Litecoin, and 50+ other cryptocurrencies.' },
              { title: '24/7 Availability', desc: 'Our automated system operates around the clock - no waiting for business hours.' },
              { title: 'Competitive Pricing', desc: 'Best prices in the market with various account types to fit every budget and requirement.' },
            ].map((item, i) => (
              <Card key={i} className="bg-card/50 border-border/50">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2 text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* SEO Content - FAQ Section */}
      <section className="py-16 border-t border-border/50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto space-y-6">
            {[
              { 
                q: 'What payment methods do you accept?', 
                a: 'We accept all major cryptocurrencies including Bitcoin (BTC), Ethereum (ETH), USDT (TRC20, ERC20), Litecoin (LTC), and 50+ other cryptocurrencies through our secure NOWPayments integration.' 
              },
              { 
                q: 'How long does delivery take?', 
                a: 'Delivery is instant and fully automated! Once your cryptocurrency payment is confirmed on the blockchain, your mail account credentials are delivered within seconds to your dashboard.' 
              },
              { 
                q: 'Do your mail accounts support OAuth2?', 
                a: 'Yes, all our Hotmail and Outlook accounts come with full OAuth2 support. This allows you to authenticate and read mailbox contents via Microsoft Graph API - perfect for retrieving verification codes.' 
              },
              { 
                q: 'Are the mail accounts live and verified?', 
                a: 'Absolutely! Every account is 100% live checked before delivery. We verify login credentials, OAuth2 tokens, and account status to ensure you receive only working, high-quality accounts.' 
              },
              { 
                q: 'Can I read emails and get verification codes?', 
                a: 'Yes! We provide a built-in Mail Reading Tool that supports bulk credential loading. You can load 30-50+ mail accounts at once and read emails, view HTML content, and automatically detect verification codes.' 
              },
              { 
                q: 'What types of mail accounts do you offer?', 
                a: 'We offer various Hotmail and Outlook account types with different ages, verification levels, and live durations. All accounts are suitable for Facebook verification and social media marketing purposes.' 
              },
            ].map((faq, i) => (
              <Card key={i} className="bg-card/50 border-border/50">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2 text-foreground">{faq.q}</h3>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* SEO Content - Supported Cryptocurrencies */}
      <section className="py-16 border-t border-border/50 bg-secondary/20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Supported Cryptocurrency Payments</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            We accept 50+ cryptocurrencies for secure and anonymous payments. Popular options include:
          </p>
          <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
            {['Bitcoin (BTC)', 'Ethereum (ETH)', 'USDT (TRC20)', 'USDT (ERC20)', 'Litecoin (LTC)', 'Bitcoin Cash (BCH)', 'Dogecoin (DOGE)', 'Monero (XMR)', 'Solana (SOL)', 'Tron (TRX)'].map((crypto) => (
              <Badge key={crypto} variant="outline" className="px-4 py-2 text-sm border-primary/30">
                {crypto}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* SEO Content - How It Works */}
      <section className="py-16 border-t border-border/50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-8 text-center">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { step: '1', title: 'Create Account', desc: 'Sign up for a free CryptoMails account in seconds' },
              { step: '2', title: 'Deposit Funds', desc: 'Add balance using your preferred cryptocurrency' },
              { step: '3', title: 'Choose Products', desc: 'Browse and select the mail accounts you need' },
              { step: '4', title: 'Instant Delivery', desc: 'Receive credentials immediately after purchase' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-primary">{item.step}</span>
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
