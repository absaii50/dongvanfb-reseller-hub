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
  RefreshCw
} from 'lucide-react';

export default function Tools() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Read Mailbox state
  const [email, setEmail] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [clientId, setClientId] = useState('');
  const [messages, setMessages] = useState<MailMessage[]>([]);
  
  // Get Code state
  const [codeType, setCodeType] = useState('facebook');
  const [codeResult, setCodeResult] = useState<{ code: string; content: string } | null>(null);

  const handleReadMailbox = async () => {
    if (!email || !refreshToken || !clientId) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setMessages([]);
    try {
      const { data, error } = await supabase.functions.invoke('read-mailbox', {
        body: { email, refresh_token: refreshToken, client_id: clientId }
      });

      if (error) throw error;

      if (data.status && data.messages) {
        setMessages(data.messages);
        toast({
          title: 'Success',
          description: `Found ${data.messages.length} messages.`,
        });
      } else {
        throw new Error(data.error || 'Failed to read mailbox');
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
    if (!email || !refreshToken || !clientId) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setCodeResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('get-code', {
        body: { 
          email, 
          refresh_token: refreshToken, 
          client_id: clientId,
          type: codeType
        }
      });

      if (error) throw error;

      if (data.status && data.code) {
        setCodeResult({ code: data.code, content: data.content || '' });
        toast({
          title: 'Code Found!',
          description: `Verification code: ${data.code}`,
        });
      } else {
        toast({
          title: 'No Code Found',
          description: 'No verification code found in recent emails.',
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
    // Format: email|password|refresh_token|client_id
    const parts = input.split('|');
    if (parts.length >= 4) {
      setEmail(parts[0]);
      setRefreshToken(parts[2]);
      setClientId(parts[3]);
      toast({
        title: 'Parsed!',
        description: 'Credentials have been filled in.',
      });
    } else {
      toast({
        title: 'Invalid Format',
        description: 'Please use format: email|password|refresh_token|client_id',
        variant: 'destructive',
      });
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Mail Tools</h1>
          <p className="text-muted-foreground">Read mailbox and get verification codes using OAuth2</p>
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
                Enter your OAuth2 credentials or paste the full format
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Quick Parse</Label>
                <Textarea
                  placeholder="Paste: email|password|refresh_token|client_id"
                  className="bg-secondary/50 border-border/50 h-20"
                  onChange={(e) => {
                    if (e.target.value.includes('|')) {
                      parseMailCredentials(e.target.value);
                      e.target.value = '';
                    }
                  }}
                />
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
                <Label>Refresh Token</Label>
                <Textarea
                  value={refreshToken}
                  onChange={(e) => setRefreshToken(e.target.value)}
                  placeholder="M.C556_SN1.0.U.-..."
                  className="bg-secondary/50 border-border/50 h-20 font-mono text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label>Client ID</Label>
                <Input
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="bg-secondary/50 border-border/50 font-mono text-xs"
                />
              </div>
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
                              <p className="font-medium">{msg.subject}</p>
                              <p className="text-xs text-muted-foreground">
                                From: {msg.from?.[0]?.name || msg.from?.[0]?.address || 'Unknown'}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(msg.date).toLocaleString()}
                            </span>
                          </div>
                          {msg.code && (
                            <div className="mt-2 p-2 rounded bg-primary/10 border border-primary/20">
                              <span className="text-xs text-muted-foreground">Code: </span>
                              <span className="font-bold text-primary">{msg.code}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="code" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Code Type</Label>
                    <div className="flex flex-wrap gap-2">
                      {['facebook', 'instagram', 'twitter', 'google', 'telegram', 'tiktok', 'all'].map((type) => (
                        <Button
                          key={type}
                          variant={codeType === type ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCodeType(type)}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Button>
                      ))}
                    </div>
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
                        Get {codeType.charAt(0).toUpperCase() + codeType.slice(1)} Code
                      </>
                    )}
                  </Button>

                  {codeResult && (
                    <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                      <p className="text-sm text-muted-foreground mb-2">Verification Code Found:</p>
                      <p className="text-3xl font-bold text-success text-center">{codeResult.code}</p>
                      {codeResult.content && (
                        <p className="text-xs text-muted-foreground mt-2 text-center">{codeResult.content}</p>
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
