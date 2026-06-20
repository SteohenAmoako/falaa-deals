'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { signUp } from "@/app/actions/auth";
import { useToast } from "@/hooks/use-toast";

export default function LandingPage() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [checkingSession, setCheckingSession] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('user_id', session.user.id)
            .maybeSingle();

          if (profile?.is_admin) {
            router.replace('/falaadealsadminurl$$');
          } else {
            router.replace('/dashboard');
          }
        } else {
          setCheckingSession(false);
        }
      } catch (err) {
        setCheckingSession(false);
      }
    }
    checkSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error || !data.session) {
        toast({
          title: "Login Failed",
          description: error?.message || "Invalid credentials.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('user_id', data.session.user.id)
        .maybeSingle();

      if (profile?.is_admin) {
        router.push('/falaadealsadminurl$$');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      toast({
        title: "Login Failed",
        description: err.message || "Something went wrong.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;
    const phone = formData.get('phone') as string;

    try {
      const result = await signUp({ email, password, fullName, phone });

      if (!result.success) {
        toast({
          title: "Signup Failed",
          description: result.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error || !data.session) {
        setActiveTab("login");
        setLoading(false);
        toast({ title: "Account Created!" });
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('user_id', data.session.user.id)
        .maybeSingle();

      if (profile?.is_admin) {
        router.push('/falaadealsadminurl$$');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      toast({
        title: "Signup Failed",
        description: err.message || "Something went wrong.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-foreground flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[140px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/20 rounded-full blur-[120px]" />

      <div className="relative w-full max-w-sm z-10 space-y-6">
        <div className="flex flex-col items-center gap-3 text-white">
          <div className="w-12 h-12 bg-violet-600 rounded-2xl flex items-center justify-center font-black italic shadow-2xl text-white text-xl">FD</div>
          <h1 className="text-2xl font-black tracking-tighter">Falaa Deals</h1>
        </div>

        <Card className="bg-[#111827]/80 backdrop-blur-2xl border-white/5 shadow-2xl overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-black/20 h-10 rounded-none">
              <TabsTrigger value="login" className="font-black text-[9px] data-[state=active]:bg-white/5 uppercase tracking-widest">Login</TabsTrigger>
              <TabsTrigger value="signup" className="font-black text-[9px] data-[state=active]:bg-white/5 uppercase tracking-widest">Register</TabsTrigger>
            </TabsList>
            
            <div className="p-2">
              <TabsContent value="login" className="mt-0 outline-none">
                <form onSubmit={handleLogin}>
                  <CardHeader className="text-center pb-4 pt-6">
                    <CardTitle className="text-lg font-black italic">WELCOME BACK</CardTitle>
                    <CardDescription className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Automated Data Portal</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[9px] uppercase font-black text-muted-foreground tracking-widest">Email Address</Label>
                      <Input name="email" type="email" required placeholder="user@mail.com" className="h-10 bg-white/5 border-white/5 text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] uppercase font-black text-muted-foreground tracking-widest">Password</Label>
                      <Input name="password" type="password" required placeholder="••••••••" className="h-10 bg-white/5 border-white/5 text-xs" />
                    </div>
                    <Button disabled={loading} className="w-full h-11 font-black text-xs mt-2 group bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 uppercase tracking-widest">
                      {loading ? <Loader2 className="animate-spin" /> : (
                        <span className="flex items-center gap-2">LOG IN <ArrowRight className="w-4 h-4" /></span>
                      )}
                    </Button>
                  </CardContent>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0 outline-none">
                <form onSubmit={handleSignup}>
                  <CardHeader className="text-center pb-4 pt-6">
                    <CardTitle className="text-lg font-black italic">CREATE ACCOUNT</CardTitle>
                    <CardDescription className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Join the network</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-[9px] uppercase font-black text-muted-foreground tracking-widest">Full Name</Label>
                      <Input name="fullName" required placeholder="John Doe" className="h-10 bg-white/5 border-white/5 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] uppercase font-black text-muted-foreground tracking-widest">Email</Label>
                      <Input name="email" type="email" required placeholder="john@mail.com" className="h-10 bg-white/5 border-white/5 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] uppercase font-black text-muted-foreground tracking-widest">Phone</Label>
                      <Input name="phone" required placeholder="024XXXXXXX" className="h-10 bg-white/5 border-white/5 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] uppercase font-black text-muted-foreground tracking-widest">Password</Label>
                      <Input name="password" type="password" required placeholder="••••••••" className="h-10 bg-white/5 border-white/5 text-xs" />
                    </div>
                    <Button disabled={loading} className="w-full h-11 font-black text-xs mt-3 bg-primary hover:bg-primary/90 text-white uppercase tracking-widest">
                      {loading ? <Loader2 className="animate-spin" /> : "JOIN NOW"}
                    </Button>
                  </CardContent>
                </form>
              </TabsContent>
            </div>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
