
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

/**
 * Centered Authentication Portal (Login/Register)
 * Unified at the root path "/"
 */
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
          router.replace('/dashboard');
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
      // Sign in directly with Supabase client (not a server action) to ensure session is set client-side
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error || !data.session) {
        toast({
          title: "Login Failed",
          description: error?.message || "Invalid credentials. Please try again.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Session is confirmed — safe to redirect
      router.push('/dashboard');
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
      // 1. Call server action to create user and profile
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

      // 2. Auto sign in directly on the client after successful signup
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error || !data.session) {
        setActiveTab("login");
        setLoading(false);
        toast({
          title: "Account Created!",
          description: "Please log in with your new credentials.",
        });
        return;
      }

      // Signed in successfully — redirect
      router.push('/dashboard');
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
    <div className="min-h-screen bg-[#0a0f1e] text-foreground flex items-center justify-center p-6 relative overflow-hidden">
      {/* Abstract Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[140px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/20 rounded-full blur-[120px]" />

      <div className="relative w-full max-w-md z-10 space-y-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center font-black italic shadow-2xl shadow-primary/20 text-white text-2xl">SB</div>
          <h1 className="text-3xl font-black tracking-tighter">SB Bundles</h1>
        </div>

        <Card className="bg-[#111827]/80 backdrop-blur-2xl border-white/5 shadow-2xl overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-black/20 h-12 rounded-none">
              <TabsTrigger value="login" className="font-bold text-xs data-[state=active]:bg-white/5 uppercase tracking-widest">Login</TabsTrigger>
              <TabsTrigger value="signup" className="font-bold text-xs data-[state=active]:bg-white/5 uppercase tracking-widest">Register</TabsTrigger>
            </TabsList>
            
            <div className="p-2">
              <TabsContent value="login" className="mt-0 outline-none">
                <form onSubmit={handleLogin}>
                  <CardHeader className="text-center pb-6 pt-8">
                    <CardTitle className="text-xl font-bold">Welcome Back</CardTitle>
                    <CardDescription className="text-xs">Access your automated data dashboard.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Email Address</Label>
                      <Input name="email" type="email" required placeholder="user@example.com" className="h-12 bg-white/5 border-white/5 text-white placeholder:text-gray-600 font-medium" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Password</Label>
                      <Input name="password" type="password" required placeholder="••••••••" className="h-12 bg-white/5 border-white/5 text-white placeholder:text-gray-600" />
                    </div>
                    <Button disabled={loading} className="w-full h-12 font-bold text-base mt-4 group bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
                      {loading ? <Loader2 className="animate-spin" /> : (
                        <span className="flex items-center gap-2">LOG IN <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
                      )}
                    </Button>
                  </CardContent>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0 outline-none">
                <form onSubmit={handleSignup}>
                  <CardHeader className="text-center pb-6 pt-8">
                    <CardTitle className="text-xl font-bold">Create Account</CardTitle>
                    <CardDescription className="text-xs">Join the data automation network.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Full Name</Label>
                      <Input name="fullName" required placeholder="Kojo Antwi" className="h-12 bg-white/5 border-white/5 text-white placeholder:text-gray-600 font-medium" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Email Address</Label>
                      <Input name="email" type="email" required placeholder="kojo@example.com" className="h-12 bg-white/5 border-white/5 text-white placeholder:text-gray-600 font-medium" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Phone Number</Label>
                      <Input name="phone" required placeholder="024XXXXXXX" className="h-12 bg-white/5 border-white/5 text-white placeholder:text-gray-600 font-medium" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Password</Label>
                      <Input name="password" type="password" required placeholder="••••••••" className="h-12 bg-white/5 border-white/5 text-white placeholder:text-gray-600" />
                    </div>
                    <Button disabled={loading} className="w-full h-12 font-bold text-base mt-4 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
                      {loading ? <Loader2 className="animate-spin" /> : "CREATE ACCOUNT"}
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
