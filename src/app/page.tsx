
'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { generateReferenceCode } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function LandingPage() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [setupError, setSetupError] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  // Check if user is already logged in
  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/dashboard');
      } else {
        setCheckingSession(false);
      }
    }
    checkSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setSetupError(null);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({ title: "Welcome Back", description: "Login successful!" });
      router.push('/dashboard');
    } catch (error: any) {
      setSetupError(error.message);
      toast({ 
        title: "Login Failed", 
        description: error.message, 
        variant: "destructive" 
      });
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setSetupError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;
    const phone = formData.get('phone') as string;

    try {
      // 1. Auth Signup
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Signup failed");

      // 2. Create Profile
      const { error: profileError } = await supabase.from('profiles').insert({
        user_id: authData.user.id,
        full_name: fullName,
        phone: phone,
        reference_code: generateReferenceCode(),
        wallet_balance: 0.00,
        is_admin: false
      });

      if (profileError) throw profileError;

      toast({ 
        title: "Account Created!", 
        description: "Welcome to SB Bundles! Redirecting..." 
      });
      
      router.push('/dashboard');
    } catch (error: any) {
      setSetupError(error.message);
      toast({ 
        title: "Signup Failed", 
        description: error.message, 
        variant: "destructive" 
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
    <div className="min-h-screen bg-[#0a0f1e] text-foreground flex items-center justify-center p-6">
      {/* Background blobs for depth */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary rounded-full blur-[140px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent rounded-full blur-[120px]"></div>
      </div>

      <div className="relative w-full max-w-md z-10 space-y-6">
        {/* Centered Logo above card */}
        <div className="flex flex-col items-center gap-2 mb-2">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center font-black italic shadow-xl shadow-primary/20 text-white text-xl">SB</div>
          <span className="text-2xl font-black tracking-tighter">SB Bundles</span>
        </div>

        {setupError && (setupError.includes('rate limit exceeded') || setupError.includes('Confirm email')) && (
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-white">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="font-bold">Configuration Required</AlertTitle>
            <AlertDescription className="text-sm opacity-90">
              Supabase is requiring email confirmation. Please disable "Confirm email" in your Supabase Auth settings.
            </AlertDescription>
          </Alert>
        )}

        <Card className="bg-[#111827]/80 backdrop-blur-2xl border-white/5 shadow-2xl overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-black/20 h-12 rounded-none">
              <TabsTrigger value="login" className="font-bold text-sm data-[state=active]:bg-white/5">LOGIN</TabsTrigger>
              <TabsTrigger value="signup" className="font-bold text-sm data-[state=active]:bg-white/5">REGISTER</TabsTrigger>
            </TabsList>
            
            <div className="p-2">
              <TabsContent value="login" className="mt-0 outline-none">
                <form onSubmit={handleLogin}>
                  <CardHeader className="text-center pb-6 pt-8">
                    <CardTitle className="text-xl font-bold">Welcome Back</CardTitle>
                    <CardDescription className="text-xs">Enter your credentials to access your dashboard.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Email Address</Label>
                      <Input name="email" type="email" required placeholder="user@example.com" className="h-12 bg-[#dbeafe]/90 border-none text-black placeholder:text-gray-500 font-medium" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Password</Label>
                      <Input name="password" type="password" required placeholder="••••••••" className="h-12 bg-[#dbeafe]/90 border-none text-black placeholder:text-gray-500" />
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
                    <CardDescription className="text-xs">Join the future of data bundle automation.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Full Name</Label>
                      <Input name="fullName" required placeholder="Kojo Antwi" className="h-12 bg-[#dbeafe]/90 border-none text-black placeholder:text-gray-500 font-medium" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Email Address</Label>
                      <Input name="email" type="email" required placeholder="kojo@example.com" className="h-12 bg-[#dbeafe]/90 border-none text-black placeholder:text-gray-500 font-medium" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">MTN Phone Number</Label>
                      <Input name="phone" required placeholder="024XXXXXXX" className="h-12 bg-[#dbeafe]/90 border-none text-black placeholder:text-gray-500 font-medium" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Password</Label>
                      <Input name="password" type="password" required placeholder="••••••••" className="h-12 bg-[#dbeafe]/90 border-none text-black placeholder:text-gray-500" />
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
