
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Code2, RefreshCw, Globe, ShieldCheck, Loader2, BookOpen, Smartphone } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { getUserApiKey, regenerateApiKey } from '@/app/actions/api-keys';
import { useToast } from '@/hooks/use-toast';

export default function ApiDocsPage() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenLoading, setRegenLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function loadKey() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const key = await getUserApiKey(session.user.id);
        setApiKey(key);
      }
      setLoading(false);
    }
    loadKey();
  }, []);

  const handleRegenerate = async () => {
    if (!confirm("Your old API key will stop working immediately. Proceed?")) return;
    setRegenLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const res = await regenerateApiKey(session.user.id);
      if (res.success) {
        setApiKey(res.api_key!);
        toast({ title: "API Key Regenerated" });
      }
    }
    setRegenLoading(false);
  };

  const copyToClipboard = async (text: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        toast({ title: "Copied to clipboard" });
      } else {
        throw new Error('Clipboard API not available');
      }
    } catch (err) {
      console.warn('Clipboard failed:', err);
      toast({ 
        variant: "destructive", 
        title: "Copy Restricted", 
        description: "Clipboard access is blocked by your browser. Please copy manually." 
      });
    }
  };

  const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/public/v1` : 'https://falaa-deals.vercel.app/api/public/v1';

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
              <Code2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-black tracking-tight">Falaa API</h1>
          </div>
          <p className="text-zinc-500 text-xs">Programmatic access for resellers and automation.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-4 bg-[#111118] border-white/5 h-fit">
            <CardHeader className="p-4 border-b border-white/5">
              <CardTitle className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Authentication</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-[9px] font-bold text-zinc-500 uppercase">API BEARER TOKEN</Label>
                <div className="relative">
                  <Input 
                    value={apiKey || 'No key generated'} 
                    readOnly 
                    className="pr-10 bg-black/40 border-white/5 text-[10px] font-mono text-violet-400 h-10 truncate"
                  />
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-zinc-600 hover:text-white"
                    onClick={() => apiKey && copyToClipboard(apiKey)}
                  >
                    <Copy size={12} />
                  </Button>
                </div>
              </div>
              <Button 
                onClick={handleRegenerate}
                disabled={regenLoading}
                className="w-full bg-violet-600/10 hover:bg-violet-600 text-violet-400 hover:text-white border border-violet-600/20 font-black text-[9px] uppercase h-10"
              >
                {regenLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} className="mr-2" />}
                Regenerate Key
              </Button>
              <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl flex gap-2">
                <ShieldCheck size={14} className="text-amber-500 shrink-0" />
                <p className="text-[9px] text-amber-200/50 leading-relaxed font-medium">Keep this key secret. Anyone with this key can use your wallet.</p>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-8 space-y-6">
            <Card className="bg-[#111118] border-white/5 overflow-hidden">
              <CardHeader className="p-4 border-b border-white/5">
                <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-500">
                  <Globe size={14} className="text-violet-400" />
                  Base URL
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="p-3 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between">
                  <code className="text-[11px] text-zinc-400 font-mono truncate mr-4">{baseUrl}</code>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-600" onClick={() => copyToClipboard(baseUrl)}>
                    <Copy size={12} />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h2 className="text-sm font-black flex items-center gap-2 uppercase tracking-widest">
                <BookOpen size={16} className="text-violet-400" />
                Endpoints
              </h2>

              <Tabs defaultValue="order" className="w-full">
                <TabsList className="bg-black/20 p-1 border border-white/5 w-full justify-start overflow-x-auto no-scrollbar h-auto flex gap-1">
                  <TabsTrigger value="order" className="text-[9px] font-black uppercase py-2 px-4 whitespace-nowrap">Place Order</TabsTrigger>
                  <TabsTrigger value="status" className="text-[9px] font-black uppercase py-2 px-4 whitespace-nowrap">Status</TabsTrigger>
                  <TabsTrigger value="bundles" className="text-[9px] font-black uppercase py-2 px-4 whitespace-nowrap">Packages</TabsTrigger>
                </TabsList>

                <TabsContent value="order" className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <Card className="bg-[#111118] border-white/5 p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[8px] font-black rounded uppercase">POST</span>
                      <code className="text-[10px] text-zinc-400">/order</code>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-bold text-zinc-600 uppercase">JSON Request</p>
                      <pre className="p-3 bg-black/40 rounded-xl overflow-x-auto text-[10px] font-mono text-violet-400 border border-white/5">
{`{
  "recipient": "0240000000",
  "network": "MTN",
  "gb_size": "5"
}`}
                      </pre>
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="status" className="mt-4">
                  <Card className="bg-[#111118] border-white/5 p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[8px] font-black rounded uppercase">GET</span>
                      <code className="text-[10px] text-zinc-400">/status/{`{order_id}`}</code>
                    </div>
                    <pre className="p-3 bg-black/40 rounded-xl overflow-x-auto text-[10px] font-mono text-zinc-400 border border-white/5">
{`GET /status/ORD12345`}
                    </pre>
                  </Card>
                </TabsContent>

                <TabsContent value="bundles" className="mt-4">
                  <Card className="bg-[#111118] border-white/5 p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[8px] font-black rounded uppercase">GET</span>
                      <code className="text-[10px] text-zinc-400">/bundles</code>
                    </div>
                    <p className="text-[10px] text-zinc-500">Fetch packages with your tier pricing.</p>
                  </Card>
                </TabsContent>
              </Tabs>

              <div className="p-4 bg-violet-600/5 border border-violet-600/10 rounded-2xl flex items-start gap-3">
                <Smartphone size={18} className="text-violet-400 shrink-0" />
                <div className="space-y-1">
                  <h4 className="text-[10px] font-black text-violet-200 uppercase tracking-widest">Automation Tip</h4>
                  <p className="text-[9px] text-zinc-500 leading-relaxed font-medium">
                    Use iOS Shortcuts <strong>"Get Contents of URL"</strong>. Set method to POST, add Authorization header with your token, and provide the JSON body.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
