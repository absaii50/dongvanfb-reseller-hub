import { useState, useEffect } from 'react';
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
import { Product, Order, Profile } from '@/lib/types';
import { 
  Settings, 
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
  XCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export default function Admin() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [apiBalance, setApiBalance] = useState<number | null>(null);
  
  // Product editing
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    dongvan_id: '',
    is_active: true
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
      const [productsRes, ordersRes, usersRes] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('orders').select('*, product:products(*)').order('created_at', { ascending: false }).limit(50),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      ]);

      if (productsRes.data) setProducts(productsRes.data.map(p => ({ ...p, price: Number(p.price) })));
      if (ordersRes.data) setOrders(ordersRes.data.map(o => ({ ...o, total_price: Number(o.total_price) })));
      if (usersRes.data) setUsers(usersRes.data.map(u => ({ ...u, balance: Number(u.balance) })));
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkApiBalance = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-dongvan-balance');
      if (error) throw error;
      if (data.balance !== undefined) {
        setApiBalance(data.balance);
        toast({ title: 'Balance Updated', description: `DongVanFB Balance: ${data.balance}₫` });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const syncProducts = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('sync-products');
      if (error) throw error;
      toast({ title: 'Success', description: 'Products synced from DongVanFB' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const saveProduct = async () => {
    try {
      const productData = {
        name: productForm.name,
        description: productForm.description,
        price: parseFloat(productForm.price),
        dongvan_id: parseInt(productForm.dongvan_id),
        is_active: productForm.is_active
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);
        if (error) throw error;
        toast({ title: 'Success', description: 'Product updated' });
      } else {
        const { error } = await supabase
          .from('products')
          .insert({ ...productData, stock: 0 });
        if (error) throw error;
        toast({ title: 'Success', description: 'Product created' });
      }

      setEditingProduct(null);
      setProductForm({ name: '', description: '', price: '', dongvan_id: '', is_active: true });
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-success/20 text-success"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'pending':
        return <Badge className="bg-warning/20 text-warning"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'failed':
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
            <p className="text-muted-foreground">Manage products, orders, and users</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={checkApiBalance}>
              <Wallet className="h-4 w-4 mr-1" />
              {apiBalance !== null ? `${apiBalance.toLocaleString()}₫` : 'Check Balance'}
            </Button>
            <Button variant="outline" onClick={syncProducts}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Sync Products
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{products.length}</p>
                  <p className="text-xs text-muted-foreground">Products</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{orders.length}</p>
                  <p className="text-xs text-muted-foreground">Total Orders</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{users.length}</p>
                  <p className="text-xs text-muted-foreground">Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    ${orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.total_price, 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="products">
          <TabsList className="mb-4">
            <TabsTrigger value="products"><Package className="h-4 w-4 mr-2" />Products</TabsTrigger>
            <TabsTrigger value="orders"><ShoppingBag className="h-4 w-4 mr-2" />Orders</TabsTrigger>
            <TabsTrigger value="users"><Users className="h-4 w-4 mr-2" />Users</TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Products</CardTitle>
                  <CardDescription>Manage your mail products and pricing</CardDescription>
                </div>
                <Button onClick={() => {
                  setProductForm({ name: '', description: '', price: '', dongvan_id: '', is_active: true });
                  setEditingProduct({} as Product);
                }}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Product
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Name</th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">DongVan ID</th>
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
                            <Badge variant={product.is_active ? 'default' : 'secondary'}>
                              {product.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <div className="flex gap-2 justify-end">
                              <Button variant="ghost" size="sm" onClick={() => {
                                setEditingProduct(product);
                                setProductForm({
                                  name: product.name,
                                  description: product.description || '',
                                  price: product.price.toString(),
                                  dongvan_id: product.dongvan_id.toString(),
                                  is_active: product.is_active
                                });
                              }}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => deleteProduct(product.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
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

          <TabsContent value="orders">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>View and manage customer orders</CardDescription>
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
                          <td className="py-3 px-2 text-center text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle>Users</CardTitle>
                <CardDescription>Manage user accounts and balances</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Email</th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Balance</th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((userProfile) => (
                        <tr key={userProfile.id} className="border-b border-border/30">
                          <td className="py-3 px-2">{userProfile.email}</td>
                          <td className="py-3 px-2 text-center text-primary font-medium">${userProfile.balance.toFixed(2)}</td>
                          <td className="py-3 px-2 text-center text-sm text-muted-foreground">
                            {new Date(userProfile.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
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
          <DialogHeader>
            <DialogTitle>{editingProduct?.id ? 'Edit Product' : 'Add Product'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                placeholder="HotMail NEW Graph"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                placeholder="With OAuth2 support"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price (USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  placeholder="0.50"
                />
              </div>
              <div className="space-y-2">
                <Label>DongVan ID</Label>
                <Input
                  type="number"
                  value={productForm.dongvan_id}
                  onChange={(e) => setProductForm({ ...productForm, dongvan_id: e.target.value })}
                  placeholder="1"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={productForm.is_active}
                onCheckedChange={(checked) => setProductForm({ ...productForm, is_active: checked })}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProduct(null)}>Cancel</Button>
            <Button onClick={saveProduct}>
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
