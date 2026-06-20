
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Key, RefreshCw, Code2, Globe, ShieldCheck, Loader2, BookOpen, Terminal, Smartphone } from "lucide-react";
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
    if (!confirm("Are you sure? Your old API key will stop working immediately.")) return;
    setRegenLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const res = await regenerateApiKey(session.user.id);
      if (res.success) {
        setApiKey(res.api_key!);
        toast({ title: "🎉 API Key Regenerated", description: "Your new key is active." });
      }
    }
    setRegenLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Content copied to clipboard." });
  };

  const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/public/v1` : 'https://falaadeals.vercel.app/api/public/v1';

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6 sm:p-10">
      <div className="max-w-5xl mx-auto space-y-10">
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-600 flex items-center justify-center">
              <Code2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tight">Falaa API for Developers</h1>
          </div>
          <p className="text-zinc-500 max-w-2xl">Connect your external applications or iPhone Shortcuts to FalaaDeals.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-1 bg-[#111118] border-white/5 h-fit lg:sticky lg:top-24">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-zinc-400">Your Identity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-[10px] font-bold text-zinc-500">API BEARER TOKEN</Label>
                <div className="relative group">
                  <Input 
                    value={apiKey || 'No key generated'} 
                    readOnly 
                    className="pr-12 bg-black/40 border-white/5 text-xs font-mono text-violet-400 h-12"
                  />
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-zinc-500 hover:text-white"
                    onClick={() => apiKey && copyToClipboard(apiKey)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <Button 
                onClick={handleRegenerate}
                disabled={regenLoading}
                className="w-full bg-violet-600/10 hover:bg-violet-600 text-violet-400 hover:text-white border border-violet-600/20 font-bold uppercase tracking-widest text-[10px] h-11"
              >
                {regenLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Reset Key
              </Button>
              <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-200/70 leading-relaxed font-medium">
                  This key works like a password. Do not share it. If compromised, reset it immediately.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-8">
            <Card className="bg-[#111118] border-white/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Globe className="w-5 h-5 text-violet-400" />
                  Base Connection URL
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between">
                  <code className="text-sm text-zinc-400 font-mono">{baseUrl}</code>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-600" onClick={() => copyToClipboard(baseUrl)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <h2 className="text-xl font-black flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-violet-400" />
                How to use the API
              </h2>

              <Tabs defaultValue="order" className="w-full">
                <TabsList className="bg-black/20 p-1 border border-white/5 w-full justify-start h-12">
                  <TabsTrigger value="order" className="text-xs font-bold uppercase">1. Place Order</TabsTrigger>
                  <TabsTrigger value="status" className="text-xs font-bold uppercase">2. Check Status</TabsTrigger>
                  <TabsTrigger value="bundles" className="text-xs font-bold uppercase">3. Get Packages</TabsTrigger>
                </TabsList>

                <TabsContent value="order" className="mt-4 space-y-4">
                  <Card className="bg-[#111118] border-white/5">
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-black rounded uppercase">POST</span>
                        <code className="text-xs text-zinc-400">/order</code>
                      </div>
                      <p className="text-xs text-zinc-500">Send this JSON body to place a data order. Your wallet will be debited automatically.</p>
                      
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-zinc-600 uppercase">JSON REQUEST BODY</p>
                        <pre className="p-4 bg-black/40 rounded-xl overflow-x-auto text-[11px] font-mono text-violet-400">
{`{
  "recipient": "0240000000",
  "network": "MTN",
  "gb_size": "5"
}`}
                        </pre>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-zinc-600 uppercase">REQUIRED HEADERS</p>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-mono p-2 bg-black/20 rounded border border-white/5">
                            <span className="text-zinc-500">Authorization</span>
                            <span className="text-emerald-400">Bearer YOUR_TOKEN</span>
                          </div>
                          <div className="flex justify-between text-[11px] font-mono p-2 bg-black/20 rounded border border-white/5">
                            <span className="text-zinc-500">Content-Type</span>
                            <span className="text-emerald-400">application/json</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="status" className="mt-4 space-y-4">
                  <Card className="bg-[#111118] border-white/5">
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-black rounded uppercase">GET</span>
                        <code className="text-xs text-zinc-400">/status/{`{order_id}`}</code>
                      </div>
                      <p className="text-xs text-zinc-500">Check if your order was delivered successfully.</p>
                      <pre className="p-4 bg-black/40 rounded-xl overflow-x-auto text-[11px] font-mono text-zinc-400">
{`GET /status/SKP12345678`}
                      </pre>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="bundles" className="mt-4 space-y-4">
                  <Card className="bg-[#111118] border-white/5">
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-black rounded uppercase">GET</span>
                        <code className="text-xs text-zinc-400">/bundles</code>
                      </div>
                      <p className="text-xs text-zinc-500">Get a list of all current data packages and their prices for your account tier.</p>
                      <pre className="p-4 bg-black/40 rounded-xl overflow-x-auto text-[11px] font-mono text-zinc-400">
{`GET /bundles`}
                      </pre>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              <div className="p-6 bg-violet-600/5 border border-violet-600/10 rounded-2xl flex items-start gap-4">
                <Smartphone className="w-6 h-6 text-violet-400 shrink-0" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-violet-200">Tip for iPhone Users</h4>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    You can use the <strong>"Get Contents of URL"</strong> action in iOS Shortcuts to automate data buying for your customers. Set the method to <strong>POST</strong> and include your Bearer token in the Headers.
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
