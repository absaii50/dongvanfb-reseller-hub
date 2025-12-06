import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Order, Deposit, MailData } from '@/lib/types';
import { 
  Wallet, 
  ShoppingBag, 
  Download, 
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Plus,
  Mail,
  Eye,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function Dashboard() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Realtime subscription for deposits
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel('deposits-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deposits',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Deposit change:', payload);
          if (payload.eventType === 'INSERT') {
            const newDeposit = { ...payload.new, amount: Number(payload.new.amount) } as Deposit;
            setDeposits(prev => [newDeposit, ...prev].slice(0, 10));
          } else if (payload.eventType === 'UPDATE') {
            setDeposits(prev => prev.map(d => 
              d.id === payload.new.id 
                ? { ...payload.new, amount: Number(payload.new.amount) } as Deposit
                : d
            ));
            // Refresh profile if payment is confirmed
            if (payload.new.payment_status === 'finished' || payload.new.payment_status === 'confirmed') {
              refreshProfile();
            }
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refreshProfile]);

  const fetchData = async () => {
    try {
      const [ordersRes, depositsRes] = await Promise.all([
        supabase
          .from('orders')
          .select('*, product:products(*)')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('deposits')
          .select('*')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      if (ordersRes.data) {
        setOrders(ordersRes.data.map(o => ({
          ...o,
          total_price: Number(o.total_price),
          product: o.product ? { ...o.product, price: Number(o.product.price) } : undefined
        })));
      }
      if (depositsRes.data) {
        setDeposits(depositsRes.data.map(d => ({ ...d, amount: Number(d.amount) })));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'finished':
      case 'confirmed':
        return <Badge className="bg-success/20 text-success border-success/30"><CheckCircle className="h-3 w-3 mr-1" />Confirmed</Badge>;
      case 'pending':
      case 'waiting':
        return <Badge className="bg-warning/20 text-warning border-warning/30"><Clock className="h-3 w-3 mr-1" />Waiting</Badge>;
      case 'expired':
        return <Badge className="bg-muted/50 text-muted-foreground border-muted/30"><XCircle className="h-3 w-3 mr-1" />Expired</Badge>;
      case 'failed':
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatMailData = (mail: MailData) => {
    return `${mail.email}|${mail.password}${mail.refresh_token ? `|${mail.refresh_token}` : ''}${mail.client_id ? `|${mail.client_id}` : ''}`;
  };

  const downloadMailData = (order: Order) => {
    if (!order.mail_data || !Array.isArray(order.mail_data)) return;
    const mailData = order.mail_data as MailData[];
    const content = mailData.map(formatMailData).join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `order_${order.id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedIndex(null), 2000);
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
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Manage your account and view order history</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Balance</p>
                  <p className="text-3xl font-bold text-primary">${profile?.balance?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-4"
                onClick={() => navigate('/deposit')}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Funds
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Orders</p>
                  <p className="text-3xl font-bold">{orders.length}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <ShoppingBag className="h-6 w-6 text-accent" />
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-4"
                onClick={() => navigate('/')}
              >
                <ShoppingBag className="h-4 w-4 mr-1" />
                Browse Products
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Mails Purchased</p>
                  <p className="text-3xl font-bold">
                    {orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.quantity, 0)}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <Mail className="h-6 w-6 text-success" />
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-4"
                onClick={() => navigate('/tools')}
              >
                <Mail className="h-4 w-4 mr-1" />
                Read Mailbox
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <Card className="bg-card/50 border-border/50 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Order History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No orders yet. Start by purchasing some mail accounts!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Order ID</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Product</th>
                      <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Qty</th>
                      <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Total</th>
                      <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                      <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Date</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders
                      .slice((currentPage - 1) * ordersPerPage, currentPage * ordersPerPage)
                      .map((order) => (
                      <tr key={order.id} className="border-b border-border/30">
                        <td className="py-3 px-2 font-mono text-sm">{order.id.slice(0, 8)}</td>
                        <td className="py-3 px-2">{order.product?.name || 'Unknown'}</td>
                        <td className="py-3 px-2 text-center">{order.quantity}</td>
                        <td className="py-3 px-2 text-center text-primary font-medium">${order.total_price.toFixed(2)}</td>
                        <td className="py-3 px-2 text-center">{getStatusBadge(order.status)}</td>
                        <td className="py-3 px-2 text-center text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-2 text-right">
                          {order.status === 'completed' && order.mail_data && (
                            <div className="flex gap-2 justify-end">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setSelectedOrder(order)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => downloadMailData(order)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {/* Pagination */}
                {orders.length > ordersPerPage && (
                  <div className="flex items-center justify-between pt-4 border-t border-border/30 mt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * ordersPerPage) + 1}-{Math.min(currentPage * ordersPerPage, orders.length)} of {orders.length} orders
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.ceil(orders.length / ordersPerPage) }, (_, i) => i + 1).map((page) => (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Button>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(Math.ceil(orders.length / ordersPerPage), p + 1))}
                        disabled={currentPage === Math.ceil(orders.length / ordersPerPage)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Deposits */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Recent Deposits
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deposits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No deposits yet. Add funds to start purchasing!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {deposits.map((deposit) => (
                  <div key={deposit.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Wallet className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">${deposit.amount.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(deposit.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(deposit.payment_status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Details Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-secondary/30">
                <div>
                  <p className="text-xs text-muted-foreground">Order ID</p>
                  <p className="font-mono text-sm">{selectedOrder.id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Product</p>
                  <p className="font-medium">{selectedOrder.product?.name || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Quantity</p>
                  <p className="font-medium">{selectedOrder.quantity}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Price</p>
                  <p className="font-medium text-primary">${selectedOrder.total_price.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="text-sm">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                </div>
              </div>

              {/* Mail Data */}
              {selectedOrder.mail_data && Array.isArray(selectedOrder.mail_data) && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      Mail Accounts ({(selectedOrder.mail_data as MailData[]).length})
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          const allData = (selectedOrder.mail_data as MailData[]).map(formatMailData).join('\n');
                          navigator.clipboard.writeText(allData);
                          toast.success('All accounts copied to clipboard');
                        }}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy All
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => downloadMailData(selectedOrder)}>
                        <Download className="h-4 w-4 mr-1" />
                        Download All
                      </Button>
                    </div>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto space-y-2">
                    {(selectedOrder.mail_data as MailData[]).map((mail, i) => {
                      const formattedData = formatMailData(mail);
                      return (
                        <div 
                          key={i} 
                          className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 group"
                        >
                          <code className="flex-1 font-mono text-xs break-all text-foreground">
                            {formattedData}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="shrink-0 h-8 w-8 p-0"
                            onClick={() => copyToClipboard(formattedData, i)}
                          >
                            {copiedIndex === i ? (
                              <Check className="h-4 w-4 text-success" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
