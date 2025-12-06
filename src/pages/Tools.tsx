import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MailMessage } from '@/lib/types';
import { 
  Mail, 
  Loader2, 
  Search,
  Inbox,
  Copy,
  Eye,
  Users,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface BulkMailResult {
  email: string;
  success: boolean;
  messages: MailMessage[];
  error?: string;
}

export default function Tools() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Mode toggle
  const [bulkMode, setBulkMode] = useState(false);
  
  // Single mode state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [clientId, setClientId] = useState('');
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<MailMessage | null>(null);
  
  // Bulk mode state
  const [bulkCredentials, setBulkCredentials] = useState('');
  const [bulkResults, setBulkResults] = useState<BulkMailResult[]>([]);
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

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

  const handleBulkReadMailbox = async () => {
    const lines = bulkCredentials.trim().split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      toast({
        title: 'No Credentials',
        description: 'Please enter at least one credential line.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setBulkResults([]);
    setBulkProgress({ current: 0, total: lines.length });
    
    const results: BulkMailResult[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const parts = line.split('|');
      
      if (parts.length < 2) {
        results.push({
          email: line,
          success: false,
          messages: [],
          error: 'Invalid format'
        });
        setBulkProgress({ current: i + 1, total: lines.length });
        continue;
      }

      const emailAddr = parts[0]?.trim() || '';
      const pwd = parts[1]?.trim() || '';
      const token = parts[2]?.trim() || '';
      const cid = parts[3]?.trim() || '';

      try {
        const { data, error } = await supabase.functions.invoke('dongvan-api', {
          body: { 
            action: 'read_mailbox', 
            email: emailAddr, 
            password: pwd,
            refresh_token: token || undefined,
            client_id: cid || undefined
          }
        });

        if (error) throw error;

        if (data.success && data.data) {
          results.push({
            email: emailAddr,
            success: true,
            messages: data.data
          });
        } else {
          results.push({
            email: emailAddr,
            success: false,
            messages: [],
            error: data.message || data.error || 'Failed to read mailbox'
          });
        }
      } catch (error: any) {
        results.push({
          email: emailAddr,
          success: false,
          messages: [],
          error: error.message || 'Failed to read mailbox'
        });
      }

      setBulkProgress({ current: i + 1, total: lines.length });
      setBulkResults([...results]);
    }

    const successCount = results.filter(r => r.success).length;
    toast({
      title: 'Bulk Read Complete',
      description: `${successCount}/${lines.length} mailboxes read successfully.`,
    });
    
    setLoading(false);
  };

  const parseMailCredentials = (input: string) => {
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

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: 'Copied!',
      description: 'Code copied to clipboard.',
    });
  };

  const toggleEmailExpanded = (emailAddr: string) => {
    const newExpanded = new Set(expandedEmails);
    if (newExpanded.has(emailAddr)) {
      newExpanded.delete(emailAddr);
    } else {
      newExpanded.add(emailAddr);
    }
    setExpandedEmails(newExpanded);
  };

  const renderMessageCard = (msg: MailMessage, index: number) => {
    const fromDisplay = typeof msg.from === 'string' 
      ? msg.from 
      : Array.isArray(msg.from) && msg.from[0]
        ? (msg.from[0] as { name?: string; address?: string }).name || (msg.from[0] as { address?: string }).address || 'Unknown'
        : 'Unknown';
    
    const dateDisplay = msg.date ? (() => {
      try {
        const d = new Date(msg.date);
        return isNaN(d.getTime()) ? '' : d.toLocaleString();
      } catch {
        return '';
      }
    })() : '';
    
    const bodyText = (msg.body || msg.message || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    
    return (
      <div 
        key={index} 
        className="p-4 rounded-lg bg-secondary/30 border border-border/30 cursor-pointer hover:bg-secondary/50 transition-colors"
        onClick={() => setSelectedEmail(msg)}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{msg.subject || 'No Subject'}</p>
            <p className="text-xs text-muted-foreground truncate">
              From: {fromDisplay}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {dateDisplay && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {dateDisplay}
              </span>
            )}
            <Eye className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        {msg.code && (
          <div 
            className="mb-2 p-2 bg-success/10 border border-success/20 rounded flex items-center justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <span className="text-xs text-muted-foreground">Code: </span>
              <span className="font-bold text-success">{msg.code}</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => copyCode(msg.code!)}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        )}
        {bodyText && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{bodyText.slice(0, 200)}{bodyText.length > 200 ? '...' : ''}</p>
        )}
      </div>
    );
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Mail Tools</h1>
          <p className="text-muted-foreground">Read mailbox messages</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Credentials Input */}
          <Card className="bg-card/50 border-border/50 lg:col-span-1">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  {bulkMode ? 'Bulk Credentials' : 'Mail Credentials'}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Label htmlFor="bulk-mode" className="text-xs text-muted-foreground">Bulk</Label>
                  <Switch 
                    id="bulk-mode" 
                    checked={bulkMode} 
                    onCheckedChange={setBulkMode}
                  />
                </div>
              </div>
              <CardDescription>
                {bulkMode 
                  ? 'Enter multiple credentials, one per line'
                  : 'Enter your mail credentials or paste the full format'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {bulkMode ? (
                <>
                  <div className="space-y-2">
                    <Label>Credentials List</Label>
                    <Textarea
                      value={bulkCredentials}
                      onChange={(e) => setBulkCredentials(e.target.value)}
                      placeholder="email|password|refresh_token|client_id
email2|password2|refresh_token2|client_id2
..."
                      className="bg-secondary/50 border-border/50 h-48 font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      One credential per line. Format: email|password or email|password|refresh_token|client_id
                    </p>
                  </div>
                  
                  {bulkProgress.total > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span>{bulkProgress.current}/{bulkProgress.total}</span>
                      </div>
                      <div className="w-full bg-secondary/50 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
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
                </>
              )}
            </CardContent>
          </Card>

          {/* Read Mailbox */}
          <Card className="bg-card/50 border-border/50 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {bulkMode ? <Users className="h-5 w-5" /> : <Inbox className="h-5 w-5" />}
                {bulkMode ? 'Bulk Read Mailboxes' : 'Read Mailbox'}
              </CardTitle>
              <CardDescription>
                {bulkMode 
                  ? 'Fetch emails from multiple mailboxes at once'
                  : 'Fetch and view emails from your mailbox'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={bulkMode ? handleBulkReadMailbox : handleReadMailbox} 
                disabled={loading}
                variant="glow"
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {bulkMode && bulkProgress.total > 0 && (
                      <span className="ml-2">
                        {bulkProgress.current}/{bulkProgress.total}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    {bulkMode ? 'Read All Mailboxes' : 'Read Mailbox'}
                  </>
                )}
              </Button>

              {/* Single mode results */}
              {!bulkMode && messages.length > 0 && (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {messages.map((msg, i) => renderMessageCard(msg, i))}
                </div>
              )}

              {/* Bulk mode results */}
              {bulkMode && bulkResults.length > 0 && (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {bulkResults.map((result, i) => (
                    <div 
                      key={i} 
                      className={`rounded-lg border ${result.success ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5'}`}
                    >
                      <div 
                        className="p-3 flex items-center justify-between cursor-pointer"
                        onClick={() => result.success && result.messages.length > 0 && toggleEmailExpanded(result.email)}
                      >
                        <div className="flex items-center gap-2">
                          {result.success ? (
                            <CheckCircle className="h-4 w-4 text-success" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                          <span className="font-medium text-sm">{result.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {result.success ? (
                            <>
                              <span className="text-xs text-muted-foreground">
                                {result.messages.length} emails
                                {result.messages.some(m => m.code) && (
                                  <span className="ml-1 text-success">
                                    ({result.messages.filter(m => m.code).length} with codes)
                                  </span>
                                )}
                              </span>
                              {result.messages.length > 0 && (
                                expandedEmails.has(result.email) 
                                  ? <ChevronUp className="h-4 w-4" />
                                  : <ChevronDown className="h-4 w-4" />
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-destructive">{result.error}</span>
                          )}
                        </div>
                      </div>
                      
                      {result.success && expandedEmails.has(result.email) && result.messages.length > 0 && (
                        <div className="px-3 pb-3 space-y-2">
                          {result.messages.map((msg, j) => renderMessageCard(msg, j))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Email Detail Modal */}
      <Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedEmail?.subject || 'Email Details'}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              From: {typeof selectedEmail?.from === 'string' 
                ? selectedEmail.from 
                : Array.isArray(selectedEmail?.from) && selectedEmail.from[0]
                  ? (selectedEmail.from[0] as { name?: string; address?: string }).name || (selectedEmail.from[0] as { address?: string }).address
                  : 'Unknown'}
            </p>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-white rounded-lg">
            <iframe
              srcDoc={selectedEmail?.body || selectedEmail?.message || '<p>No content</p>'}
              className="w-full min-h-[400px] border-0"
              title="Email content"
              sandbox="allow-same-origin"
            />
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
