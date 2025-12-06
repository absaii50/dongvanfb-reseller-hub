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
  Eye
} from 'lucide-react';
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
        return <Badge className="bg-success/20 text-success border-success/30"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'pending':
        return <Badge className="bg-warning/20 text-warning border-warning/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'failed':
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const downloadMailData = (order: Order) => {
    if (!order.mail_data || !Array.isArray(order.mail_data)) return;
    const mailData = order.mail_data as MailData[];
    const content = mailData.map(m => 
      `${m.email}|${m.password}${m.refresh_token ? `|${m.refresh_token}` : ''}${m.client_id ? `|${m.client_id}` : ''}`
    ).join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `order_${order.id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
                    {orders.map((order) => (
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder?.mail_data && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {selectedOrder.mail_data.length} account(s)
                </p>
                <Button variant="outline" size="sm" onClick={() => downloadMailData(selectedOrder)}>
                  <Download className="h-4 w-4 mr-1" />
                  Download All
                </Button>
              </div>
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {selectedOrder.mail_data.map((mail, i) => (
                  <div key={i} className="p-3 rounded-lg bg-secondary/50 font-mono text-sm">
                    <p className="text-primary">{mail.email}</p>
                    <p className="text-muted-foreground">{mail.password}</p>
                    {mail.refresh_token && (
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        Token: {mail.refresh_token.slice(0, 50)}...
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
