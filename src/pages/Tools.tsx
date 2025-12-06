import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MailMessage } from '@/lib/types';
import { 
  Mail, 
  Loader2, 
  Search,
  Code,
  Inbox,
  RefreshCw,
  Copy
} from 'lucide-react';

export default function Tools() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Read Mailbox state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [clientId, setClientId] = useState('');
  const [messages, setMessages] = useState<MailMessage[]>([]);
  
  // Get Code state
  const [sender, setSender] = useState('');
  const [codeResult, setCodeResult] = useState<{ code: string; message?: string } | null>(null);

  const handleReadMailbox = async () => {
    if (!email) {
      toast({
        title: 'Missing Fields',
        description: 'Please enter email address.',
        variant: 'destructive',
      });
      return;
    }

    if (!password && !refreshToken) {
      toast({
        title: 'Missing Fields',
        description: 'Please enter password or refresh token.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setMessages([]);
    try {
      const { data, error } = await supabase.functions.invoke('dongvan-api', {
        body: { 
          action: 'read_mailbox', 
          email, 
          password,
          refresh_token: refreshToken || undefined,
          client_id: clientId || undefined
        }
      });

      if (error) throw error;

      if (data.success && data.data) {
        setMessages(data.data);
        toast({
          title: 'Success',
          description: `Found ${data.data.length} messages.`,
        });
      } else {
        throw new Error(data.message || data.error || 'Failed to read mailbox');
      }
    } catch (error: any) {
      console.error('Read mailbox error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to read mailbox.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGetCode = async () => {
    if (!email) {
      toast({
        title: 'Missing Fields',
        description: 'Please enter email address.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setCodeResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('dongvan-api', {
        body: { 
          action: 'get_code',
          email, 
          password,
          sender: sender || undefined,
          refresh_token: refreshToken || undefined,
          client_id: clientId || undefined
        }
      });

      if (error) throw error;

      if (data.success && data.data) {
        setCodeResult({ code: data.data.code || data.data, message: data.message });
        toast({
          title: 'Code Found!',
          description: `Verification code: ${data.data.code || data.data}`,
        });
      } else {
        toast({
          title: 'No Code Found',
          description: data.message || 'No verification code found in recent emails.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Get code error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to get code.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const parseMailCredentials = (input: string) => {
    // Format: email|password or email|password|refresh_token|client_id
    const parts = input.split('|');
    if (parts.length >= 2) {
      setEmail(parts[0]?.trim() || '');
      setPassword(parts[1]?.trim() || '');
      setRefreshToken(parts[2]?.trim() || '');
      setClientId(parts[3]?.trim() || '');
      toast({
        title: 'Parsed!',
        description: `Credentials filled. ${parts.length >= 4 ? 'OAuth2 tokens detected.' : 'Password-based auth.'}`,
      });
    } else {
      toast({
        title: 'Invalid Format',
        description: 'Please use format: email|password or email|password|refresh_token|client_id',
        variant: 'destructive',
      });
    }
  };

  const copyCode = () => {
    if (codeResult?.code) {
      navigator.clipboard.writeText(codeResult.code);
      toast({
        title: 'Copied!',
        description: 'Code copied to clipboard.',
      });
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Mail Tools</h1>
          <p className="text-muted-foreground">Read mailbox and get verification codes</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Credentials Input */}
          <Card className="bg-card/50 border-border/50 lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Mail Credentials
              </CardTitle>
              <CardDescription>
                Enter your mail credentials or paste the full format
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Quick Parse (Recommended)</Label>
                <Textarea
                  placeholder="Paste full format: email|password|refresh_token|client_id"
                  className="bg-secondary/50 border-border/50 h-20"
                  onChange={(e) => {
                    if (e.target.value.includes('|')) {
                      parseMailCredentials(e.target.value);
                      e.target.value = '';
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Paste mail data directly from your order to auto-fill all fields
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or enter manually</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@hotmail.com"
                  className="bg-secondary/50 border-border/50"
                />
              </div>

              <div className="space-y-2">
                <Label>Password / Refresh Token</Label>
                <Input
                  value={password || refreshToken}
                  onChange={(e) => {
                    // If it looks like a token (long string), set as refresh token
                    if (e.target.value.length > 50) {
                      setRefreshToken(e.target.value);
                      setPassword('');
                    } else {
                      setPassword(e.target.value);
                    }
                  }}
                  placeholder="Password or OAuth2 refresh token"
                  className="bg-secondary/50 border-border/50"
                />
              </div>

              {refreshToken && (
                <div className="space-y-2">
                  <Label>Client ID (for OAuth2)</Label>
                  <Input
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="OAuth2 Client ID"
                    className="bg-secondary/50 border-border/50"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tools */}
          <Card className="bg-card/50 border-border/50 lg:col-span-2">
            <Tabs defaultValue="mailbox">
              <CardHeader>
                <TabsList className="w-full">
                  <TabsTrigger value="mailbox" className="flex-1">
                    <Inbox className="h-4 w-4 mr-2" />
                    Read Mailbox
                  </TabsTrigger>
                  <TabsTrigger value="code" className="flex-1">
                    <Code className="h-4 w-4 mr-2" />
                    Get Code
                  </TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent>
                <TabsContent value="mailbox" className="space-y-4">
                  <Button 
                    onClick={handleReadMailbox} 
                    disabled={loading}
                    variant="glow"
                    className="w-full"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Search className="h-4 w-4" />
                        Read Mailbox
                      </>
                    )}
                  </Button>

                  {messages.length > 0 && (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {messages.map((msg, i) => (
                        <div key={i} className="p-4 rounded-lg bg-secondary/30 border border-border/30">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium">{msg.subject || 'No Subject'}</p>
                              <p className="text-xs text-muted-foreground">
                                From: {typeof msg.from === 'string' ? msg.from : 'Unknown'}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {msg.date ? new Date(msg.date).toLocaleString() : ''}
                            </span>
                          </div>
                          {(msg.body || msg.message) && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{msg.body || msg.message}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="code" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Sender Filter (Optional)</Label>
                    <Input
                      value={sender}
                      onChange={(e) => setSender(e.target.value)}
                      placeholder="facebook, instagram, google..."
                      className="bg-secondary/50 border-border/50"
                    />
                    <p className="text-xs text-muted-foreground">
                      Filter codes by sender name (e.g., facebook, instagram, tiktok)
                    </p>
                  </div>

                  <Button 
                    onClick={handleGetCode} 
                    disabled={loading}
                    variant="glow"
                    className="w-full"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Get Verification Code
                      </>
                    )}
                  </Button>

                  {codeResult && (
                    <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                      <p className="text-sm text-muted-foreground mb-2">Verification Code Found:</p>
                      <div className="flex items-center justify-center gap-3">
                        <p className="text-3xl font-bold text-success">{codeResult.code}</p>
                        <Button variant="ghost" size="icon" onClick={copyCode}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      {codeResult.message && (
                        <p className="text-xs text-muted-foreground mt-2 text-center">{codeResult.message}</p>
                      )}
                    </div>
                  )}
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
