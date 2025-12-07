import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Product, Order, Profile, Deposit, Popup } from '@/lib/types';
import { SUPPORTED_COUNTRIES } from '@/lib/geoip';
import { 
  Loader2, 
  Package,
  ShoppingBag,
  Users,
  Wallet,
  RefreshCw,
  Save,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  CreditCard,
  Download,
  Search,
  TrendingUp,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  Globe
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function Admin() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [checkingBalance, setCheckingBalance] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [apiBalance, setApiBalance] = useState<number | null>(null);
  
  // Search & Filter
  const [userSearch, setUserSearch] = useState('');
  const [userBalanceFilter, setUserBalanceFilter] = useState<string>('all');
  const [depositStatusFilter, setDepositStatusFilter] = useState<string>('all');
  
  // Product editing
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    dongvan_id: '',
    live_duration: '',
    is_active: true
  });

  // User balance editing
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [balanceAmount, setBalanceAmount] = useState('');

  // Popup editing
  const [editingPopup, setEditingPopup] = useState<Popup | null>(null);
  const [popupForm, setPopupForm] = useState({
    title: '',
    message: '',
    image_url: '',
    button_text: 'OK',
    button_link: '',
    target_countries: [] as string[],
    is_active: true,
    priority: 0
  });

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      toast({
        title: 'Access Denied',
        description: 'You do not have admin privileges.',
        variant: 'destructive',
      });
      navigate('/');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    try {
      const [productsRes, ordersRes, usersRes, depositsRes, popupsRes] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('orders').select('*, product:products(*)').order('created_at', { ascending: false }).limit(100),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('deposits').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('popups').select('*').order('priority', { ascending: false }),
      ]);

      if (productsRes.data) setProducts(productsRes.data.map(p => ({ ...p, price: Number(p.price) })));
      if (ordersRes.data) setOrders(ordersRes.data.map(o => ({ ...o, total_price: Number(o.total_price) })));
      if (usersRes.data) setUsers(usersRes.data.map(u => ({ ...u, balance: Number(u.balance) })));
      if (depositsRes.data) setDeposits(depositsRes.data.map(d => ({ ...d, amount: Number(d.amount) })));
      if (popupsRes.data) setPopups(popupsRes.data as Popup[]);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = u.email.toLowerCase().includes(userSearch.toLowerCase());
      const matchesBalance = userBalanceFilter === 'all' || 
        (userBalanceFilter === 'zero' && u.balance === 0) ||
        (userBalanceFilter === 'positive' && u.balance > 0) ||
        (userBalanceFilter === 'high' && u.balance >= 50);
      return matchesSearch && matchesBalance;
    });
  }, [users, userSearch, userBalanceFilter]);

  // Filtered deposits
  const filteredDeposits = useMemo(() => {
    return deposits.filter(d => 
      depositStatusFilter === 'all' || d.payment_status === depositStatusFilter
    );
  }, [deposits, depositStatusFilter]);

  // Analytics calculations
  const analytics = useMemo(() => {
    const today = new Date();
    const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const ordersLast7Days = orders.filter(o => new Date(o.created_at) >= last7Days);
    const ordersLast30Days = orders.filter(o => new Date(o.created_at) >= last30Days);
    const usersLast7Days = users.filter(u => new Date(u.created_at) >= last7Days);
    
    const revenue7Days = ordersLast7Days.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.total_price, 0);
    const revenue30Days = ordersLast30Days.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.total_price, 0);
    const totalRevenue = orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.total_price, 0);
    const totalDeposits = deposits.filter(d => d.payment_status === 'finished').reduce((sum, d) => sum + d.amount, 0);
    const pendingDeposits = deposits.filter(d => d.payment_status === 'waiting').reduce((sum, d) => sum + d.amount, 0);
    
    return {
      revenue7Days,
      revenue30Days,
      totalRevenue,
      totalDeposits,
      pendingDeposits,
      ordersLast7Days: ordersLast7Days.length,
      newUsersLast7Days: usersLast7Days.length,
      avgOrderValue: orders.length > 0 ? totalRevenue / orders.filter(o => o.status === 'completed').length : 0,
    };
  }, [orders, users, deposits]);

  const checkApiBalance = async () => {
    setCheckingBalance(true);
    try {
      const { data, error } = await supabase.functions.invoke('dongvan-api', {
        body: { action: 'get_balance' }
      });
      
      if (error) throw error;
      
      if (data.success && data.data?.balance !== undefined) {
        setApiBalance(data.data.balance);
        toast({ title: 'Balance Updated', description: `DongVanFB Balance: ${data.data.balance.toLocaleString()}₫` });
      } else {
        throw new Error(data.message || 'Failed to fetch balance');
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setCheckingBalance(false);
    }
  };

  const syncProducts = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-products');
      
      if (error) throw error;
      
      if (data.success) {
        toast({ 
          title: 'Success', 
          description: data.message || `Synced ${data.synced} products` 
        });
        fetchData();
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const saveProduct = async () => {
    try {
      const productData = {
        name: productForm.name,
        description: productForm.description,
        price: parseFloat(productForm.price),
        dongvan_id: parseInt(productForm.dongvan_id),
        live_duration: productForm.live_duration || null,
        is_active: productForm.is_active
      };

      if (editingProduct?.id) {
        const { error } = await supabase.from('products').update(productData).eq('id', editingProduct.id);
        if (error) throw error;
        toast({ title: 'Success', description: 'Product updated' });
      } else {
        const { error } = await supabase.from('products').insert({ ...productData, stock: 0 });
        if (error) throw error;
        toast({ title: 'Success', description: 'Product created' });
      }

      setEditingProduct(null);
      setProductForm({ name: '', description: '', price: '', dongvan_id: '', live_duration: '', is_active: true });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const updateUserBalance = async () => {
    if (!editingUser) return;
    try {
      const amount = parseFloat(balanceAmount);
      if (isNaN(amount)) throw new Error('Invalid amount');

      const newBalance = editingUser.balance + amount;
      if (newBalance < 0) throw new Error('Balance cannot be negative');

      const { error } = await supabase.from('profiles').update({ balance: newBalance }).eq('id', editingUser.id);
      if (error) throw error;
      
      toast({ 
        title: 'Success', 
        description: `${amount >= 0 ? 'Added' : 'Deducted'} $${Math.abs(amount).toFixed(2)} ${amount >= 0 ? 'to' : 'from'} ${editingUser.email}` 
      });
      setEditingUser(null);
      setBalanceAmount('');
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Success', description: 'Product deleted' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const updateDepositStatus = async (depositId: string, status: string) => {
    try {
      const { error } = await supabase.from('deposits').update({ payment_status: status }).eq('id', depositId);
      if (error) throw error;
      
      // If approved, add balance to user
      if (status === 'finished') {
        const deposit = deposits.find(d => d.id === depositId);
        if (deposit) {
          const userProfile = users.find(u => u.user_id === deposit.user_id);
          if (userProfile) {
            await supabase.from('profiles').update({ 
              balance: userProfile.balance + deposit.amount 
            }).eq('user_id', deposit.user_id);
          }
        }
      }
      
      toast({ title: 'Success', description: `Deposit ${status}` });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Popup management functions
  const savePopup = async () => {
    try {
      const popupData = {
        title: popupForm.title,
        message: popupForm.message,
        image_url: popupForm.image_url || null,
        button_text: popupForm.button_text || 'OK',
        button_link: popupForm.button_link || null,
        target_countries: popupForm.target_countries,
        is_active: popupForm.is_active,
        priority: popupForm.priority
      };

      if (editingPopup?.id) {
        const { error } = await supabase.from('popups').update(popupData).eq('id', editingPopup.id);
        if (error) throw error;
        toast({ title: 'Success', description: 'Popup updated' });
      } else {
        const { error } = await supabase.from('popups').insert(popupData);
        if (error) throw error;
        toast({ title: 'Success', description: 'Popup created' });
      }

      setEditingPopup(null);
      resetPopupForm();
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const deletePopup = async (id: string) => {
    if (!confirm('Are you sure you want to delete this popup?')) return;
    try {
      const { error } = await supabase.from('popups').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Success', description: 'Popup deleted' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const togglePopupCountry = (code: string) => {
    setPopupForm(prev => ({
      ...prev,
      target_countries: prev.target_countries.includes(code)
        ? prev.target_countries.filter(c => c !== code)
        : [...prev.target_countries, code]
    }));
  };

  const resetPopupForm = () => {
    setPopupForm({
      title: '',
      message: '',
      image_url: '',
      button_text: 'OK',
      button_link: '',
      target_countries: [],
      is_active: true,
      priority: 0
    });
  };

  // Export functions
  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast({ title: 'No Data', description: 'Nothing to export', variant: 'destructive' });
      return;
    }
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(val => 
        typeof val === 'object' ? JSON.stringify(val) : `"${val}"`
      ).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({ title: 'Exported', description: `${filename}.csv downloaded` });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'finished':
        return <Badge className="bg-success/20 text-success"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'pending':
      case 'waiting':
        return <Badge className="bg-warning/20 text-warning"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'failed':
      case 'expired':
        return <Badge className="bg-destructive/20 text-destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (authLoading || loading || !isAdmin) {
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
            <p className="text-muted-foreground">Manage products, orders, users, and deposits</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={checkApiBalance} disabled={checkingBalance}>
              {checkingBalance ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Wallet className="h-4 w-4 mr-1" />}
              {apiBalance !== null ? `${apiBalance.toLocaleString()}₫` : 'Check Balance'}
            </Button>
            <Button variant="outline" onClick={syncProducts} disabled={syncing}>
              {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              Sync Products
            </Button>
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-primary">${analytics.totalRevenue.toFixed(2)}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2 text-xs">
                <ArrowUpRight className="h-3 w-3 text-success" />
                <span className="text-success">${analytics.revenue7Days.toFixed(2)}</span>
                <span className="text-muted-foreground">last 7 days</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold">{orders.length}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-success" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2 text-xs">
                <span className="text-muted-foreground">{analytics.ordersLast7Days} orders last 7 days</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Users</p>
                  <p className="text-2xl font-bold">{users.length}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-accent" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2 text-xs">
                <ArrowUpRight className="h-3 w-3 text-success" />
                <span className="text-success">+{analytics.newUsersLast7Days}</span>
                <span className="text-muted-foreground">new last 7 days</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Pending Deposits</p>
                  <p className="text-2xl font-bold text-warning">${analytics.pendingDeposits.toFixed(2)}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-warning" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2 text-xs">
                <span className="text-muted-foreground">${analytics.totalDeposits.toFixed(2)} total deposited</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="analytics">
          <TabsList className="mb-4 flex-wrap">
            <TabsTrigger value="analytics"><BarChart3 className="h-4 w-4 mr-2" />Analytics</TabsTrigger>
            <TabsTrigger value="deposits"><CreditCard className="h-4 w-4 mr-2" />Deposits</TabsTrigger>
            <TabsTrigger value="products"><Package className="h-4 w-4 mr-2" />Products</TabsTrigger>
            <TabsTrigger value="orders"><ShoppingBag className="h-4 w-4 mr-2" />Orders</TabsTrigger>
            <TabsTrigger value="users"><Users className="h-4 w-4 mr-2" />Users</TabsTrigger>
            <TabsTrigger value="popups"><Bell className="h-4 w-4 mr-2" />Popups</TabsTrigger>
          </TabsList>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle>Revenue Summary</CardTitle>
                  <CardDescription>Financial overview</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                    <span className="text-muted-foreground">Last 7 Days</span>
                    <span className="font-bold text-primary">${analytics.revenue7Days.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                    <span className="text-muted-foreground">Last 30 Days</span>
                    <span className="font-bold text-primary">${analytics.revenue30Days.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                    <span className="text-muted-foreground">Total Revenue</span>
                    <span className="font-bold text-primary">${analytics.totalRevenue.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                    <span className="text-muted-foreground">Avg Order Value</span>
                    <span className="font-bold">${analytics.avgOrderValue.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                  <CardDescription>Platform metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                    <span className="text-muted-foreground">Products Active</span>
                    <span className="font-bold">{products.filter(p => p.is_active).length}/{products.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                    <span className="text-muted-foreground">Completed Orders</span>
                    <span className="font-bold text-success">{orders.filter(o => o.status === 'completed').length}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                    <span className="text-muted-foreground">Total User Balance</span>
                    <span className="font-bold">${users.reduce((sum, u) => sum + u.balance, 0).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                    <span className="text-muted-foreground">Pending Deposits</span>
                    <span className="font-bold text-warning">{deposits.filter(d => d.payment_status === 'waiting').length}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Deposits Tab */}
          <TabsContent value="deposits">
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Deposits</CardTitle>
                  <CardDescription>Manage crypto deposits</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={depositStatusFilter} onValueChange={setDepositStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="waiting">Waiting</SelectItem>
                      <SelectItem value="finished">Finished</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => exportToCSV(deposits, 'deposits')}>
                    <Download className="h-4 w-4 mr-1" />Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">User</th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Amount</th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Currency</th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Date</th>
                        <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDeposits.map((deposit) => {
                        const userProfile = users.find(u => u.user_id === deposit.user_id);
                        return (
                          <tr key={deposit.id} className="border-b border-border/30">
                            <td className="py-3 px-2 text-sm">{userProfile?.email || deposit.user_id.slice(0, 8)}</td>
                            <td className="py-3 px-2 text-center font-medium text-primary">${deposit.amount.toFixed(2)}</td>
                            <td className="py-3 px-2 text-center">{deposit.currency}</td>
                            <td className="py-3 px-2 text-center">{getStatusBadge(deposit.payment_status)}</td>
                            <td className="py-3 px-2 text-center text-sm text-muted-foreground">
                              {new Date(deposit.created_at).toLocaleString()}
                            </td>
                            <td className="py-3 px-2 text-right">
                              {deposit.payment_status === 'waiting' && (
                                <div className="flex gap-1 justify-end">
                                  <Button size="sm" variant="ghost" className="text-success" onClick={() => updateDepositStatus(deposit.id, 'finished')}>
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => updateDepositStatus(deposit.id, 'expired')}>
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredDeposits.length === 0 && (
                        <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No deposits found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Products</CardTitle>
                  <CardDescription>Manage your mail products and pricing</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => exportToCSV(products, 'products')}>
                    <Download className="h-4 w-4 mr-1" />Export
                  </Button>
                  <Button onClick={() => {
                    setProductForm({ name: '', description: '', price: '', dongvan_id: '', live_duration: '', is_active: true });
                    setEditingProduct({} as Product);
                  }}>
                    <Plus className="h-4 w-4 mr-1" />Add Product
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Name</th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">ID</th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Price</th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Stock</th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Active</th>
                        <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product) => (
                        <tr key={product.id} className="border-b border-border/30">
                          <td className="py-3 px-2">{product.name}</td>
                          <td className="py-3 px-2 text-center">{product.dongvan_id}</td>
                          <td className="py-3 px-2 text-center text-primary font-medium">${product.price.toFixed(2)}</td>
                          <td className="py-3 px-2 text-center">{product.stock}</td>
                          <td className="py-3 px-2 text-center">
                            <Badge variant={product.is_active ? 'default' : 'secondary'}>{product.is_active ? 'Active' : 'Inactive'}</Badge>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <div className="flex gap-1 justify-end">
                              <Button variant="ghost" size="sm" onClick={() => {
                                setEditingProduct(product);
                                setProductForm({
                                  name: product.name, description: product.description || '', price: product.price.toString(),
                                  dongvan_id: product.dongvan_id.toString(), live_duration: product.live_duration || '', is_active: product.is_active
                                });
                              }}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => deleteProduct(product.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle>Orders</CardTitle><CardDescription>View all orders</CardDescription></div>
                <Button variant="outline" size="sm" onClick={() => exportToCSV(orders.map(o => ({
                  id: o.id, product: o.product?.name, quantity: o.quantity, total: o.total_price, status: o.status, date: o.created_at
                })), 'orders')}><Download className="h-4 w-4 mr-1" />Export</Button>
              </CardHeader>
              <CardContent>
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
                          <td className="py-3 px-2 text-center text-sm text-muted-foreground">{new Date(order.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle>Users</CardTitle><CardDescription>Manage user accounts</CardDescription></div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search email..." 
                      value={userSearch} 
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-9 w-48"
                    />
                  </div>
                  <Select value={userBalanceFilter} onValueChange={setUserBalanceFilter}>
                    <SelectTrigger className="w-32"><SelectValue placeholder="Balance" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="zero">$0 Balance</SelectItem>
                      <SelectItem value="positive">Has Balance</SelectItem>
                      <SelectItem value="high">$50+ Balance</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => exportToCSV(users.map(u => ({
                    email: u.email, balance: u.balance, joined: u.created_at
                  })), 'users')}><Download className="h-4 w-4 mr-1" />Export</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Email</th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Balance</th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Joined</th>
                        <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((userProfile) => (
                        <tr key={userProfile.id} className="border-b border-border/30">
                          <td className="py-3 px-2">{userProfile.email}</td>
                          <td className="py-3 px-2 text-center text-primary font-medium">${userProfile.balance.toFixed(2)}</td>
                          <td className="py-3 px-2 text-center text-sm text-muted-foreground">{new Date(userProfile.created_at).toLocaleDateString()}</td>
                          <td className="py-3 px-2 text-right">
                            <Button variant="ghost" size="sm" onClick={() => { setEditingUser(userProfile); setBalanceAmount(''); }}>
                              <Wallet className="h-4 w-4 mr-1" />Balance
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Popups Tab */}
          <TabsContent value="popups">
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Geo Popups</CardTitle>
                  <CardDescription>Manage notification popups by country</CardDescription>
                </div>
                <Button onClick={() => {
                  resetPopupForm();
                  setEditingPopup({} as Popup);
                }}>
                  <Plus className="h-4 w-4 mr-1" />Add Popup
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Title</th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Countries</th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Priority</th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                        <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {popups.map((popup) => (
                        <tr key={popup.id} className="border-b border-border/30">
                          <td className="py-3 px-2">
                            <div>
                              <p className="font-medium">{popup.title}</p>
                              <p className="text-sm text-muted-foreground line-clamp-1">{popup.message}</p>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-center">
                            {popup.target_countries?.length > 0 ? (
                              <div className="flex flex-wrap gap-1 justify-center">
                                {popup.target_countries.map(code => {
                                  const country = SUPPORTED_COUNTRIES.find(c => c.code === code);
                                  return <Badge key={code} variant="outline" className="text-xs">{country?.flag} {code}</Badge>;
                                })}
                              </div>
                            ) : (
                              <Badge className="bg-primary/20 text-primary"><Globe className="h-3 w-3 mr-1" />Universal</Badge>
                            )}
                          </td>
                          <td className="py-3 px-2 text-center">{popup.priority}</td>
                          <td className="py-3 px-2 text-center">
                            <Badge variant={popup.is_active ? 'default' : 'secondary'}>{popup.is_active ? 'Active' : 'Inactive'}</Badge>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <div className="flex gap-1 justify-end">
                              <Button variant="ghost" size="sm" onClick={() => {
                                setEditingPopup(popup);
                                setPopupForm({
                                  title: popup.title,
                                  message: popup.message,
                                  image_url: popup.image_url || '',
                                  button_text: popup.button_text || 'OK',
                                  button_link: popup.button_link || '',
                                  target_countries: popup.target_countries || [],
                                  is_active: popup.is_active,
                                  priority: popup.priority
                                });
                              }}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => deletePopup(popup.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {popups.length === 0 && (
                        <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No popups created yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Product Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingProduct?.id ? 'Edit Product' : 'Add Product'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Description</Label><Input value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Price (USD)</Label><Input type="number" step="0.001" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} /></div>
              <div className="space-y-2"><Label>DongVan ID</Label><Input type="number" value={productForm.dongvan_id} onChange={(e) => setProductForm({ ...productForm, dongvan_id: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Live Duration</Label><Input value={productForm.live_duration} onChange={(e) => setProductForm({ ...productForm, live_duration: e.target.value })} /></div>
            <div className="flex items-center gap-2"><Switch checked={productForm.is_active} onCheckedChange={(checked) => setProductForm({ ...productForm, is_active: checked })} /><Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProduct(null)}>Cancel</Button>
            <Button onClick={saveProduct}><Save className="h-4 w-4 mr-1" />Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Balance Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adjust User Balance</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-secondary/30 rounded-lg">
              <p className="text-sm text-muted-foreground">User</p>
              <p className="font-medium">{editingUser?.email}</p>
              <p className="text-sm text-muted-foreground mt-2">Current Balance</p>
              <p className="text-xl font-bold text-primary">${editingUser?.balance.toFixed(2)}</p>
            </div>
            <div className="space-y-2">
              <Label>Amount (negative for deduction)</Label>
              <Input type="number" step="0.01" value={balanceAmount} onChange={(e) => setBalanceAmount(e.target.value)} placeholder="10.00 or -5.00" />
            </div>
            {balanceAmount && !isNaN(parseFloat(balanceAmount)) && (
              <div className="p-3 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground">New Balance</p>
                <p className="text-lg font-bold text-primary">${((editingUser?.balance || 0) + parseFloat(balanceAmount)).toFixed(2)}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button onClick={updateUserBalance} disabled={!balanceAmount}><Save className="h-4 w-4 mr-1" />Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Popup Dialog */}
      <Dialog open={!!editingPopup} onOpenChange={() => setEditingPopup(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingPopup?.id ? 'Edit Popup' : 'Add Popup'}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={popupForm.title} onChange={(e) => setPopupForm({ ...popupForm, title: e.target.value })} placeholder="Welcome!" />
            </div>
            <div className="space-y-2">
              <Label>Message *</Label>
              <textarea 
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={popupForm.message} 
                onChange={(e) => setPopupForm({ ...popupForm, message: e.target.value })} 
                placeholder="Your notification message..."
              />
            </div>
            <div className="space-y-2">
              <Label>Image URL (optional)</Label>
              <Input value={popupForm.image_url} onChange={(e) => setPopupForm({ ...popupForm, image_url: e.target.value })} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Button Text</Label>
                <Input value={popupForm.button_text} onChange={(e) => setPopupForm({ ...popupForm, button_text: e.target.value })} placeholder="OK" />
              </div>
              <div className="space-y-2">
                <Label>Button Link (optional)</Label>
                <Input value={popupForm.button_link} onChange={(e) => setPopupForm({ ...popupForm, button_link: e.target.value })} placeholder="https://..." />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Target Countries (leave empty for Universal)</Label>
              <div className="flex flex-wrap gap-2 p-3 bg-secondary/30 rounded-lg">
                {SUPPORTED_COUNTRIES.map(country => (
                  <Badge 
                    key={country.code}
                    variant={popupForm.target_countries.includes(country.code) ? 'default' : 'outline'}
                    className="cursor-pointer transition-colors"
                    onClick={() => togglePopupCountry(country.code)}
                  >
                    {country.flag} {country.name}
                  </Badge>
                ))}
              </div>
              {popupForm.target_countries.length === 0 && (
                <p className="text-xs text-muted-foreground">🌍 Universal: Shows to all countries</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority (higher = show first)</Label>
                <Input type="number" value={popupForm.priority} onChange={(e) => setPopupForm({ ...popupForm, priority: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={popupForm.is_active} onCheckedChange={(checked) => setPopupForm({ ...popupForm, is_active: checked })} />
                <Label>Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPopup(null)}>Cancel</Button>
            <Button onClick={savePopup} disabled={!popupForm.title || !popupForm.message}><Save className="h-4 w-4 mr-1" />Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
