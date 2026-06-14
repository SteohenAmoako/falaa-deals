
'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Smartphone, Zap, ShieldCheck, ArrowRight, Loader2, Info } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "@/app/actions/auth";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function LandingPage() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const result = await signIn({ email, password });
    if (result.success) {
      toast({ title: "Welcome Back", description: "Login successful!" });
      router.push('/dashboard');
    } else {
      toast({ 
        title: "Login Failed", 
        description: result.message === "Email not confirmed" 
          ? "Please disable 'Confirm email' in Supabase Auth settings to allow instant login." 
          : result.message, 
        variant: "destructive" 
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

    const result = await signUp({ email, password, fullName, phone });
    if (result.success) {
      toast({ 
        title: "Account Created!", 
        description: "You can now log in. Ensure email verification is disabled in Supabase." 
      });
      setLoading(false);
      setActiveTab("login");
    } else {
      toast({ title: "Signup Failed", description: result.message, variant: "destructive" });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-white">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary rounded-full blur-[140px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent rounded-full blur-[120px]"></div>
      </div>

      <header className="relative z-10 p-6 lg:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center font-black italic shadow-lg shadow-primary/20">FD</div>
          <span className="text-2xl font-black tracking-tighter">FalaaData</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/admin" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden md:block">Admin Portal</Link>
          <Button variant="ghost" className="font-bold hover:bg-white/5">Help</Button>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 pt-12 pb-32">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary uppercase tracking-widest">
               <Zap className="w-3 h-3" /> Automating Your Connectivity
             </div>
             <h1 className="text-6xl lg:text-8xl font-black leading-[0.9] tracking-tighter">
                INSTANT DATA.<br />
                <span className="text-primary italic">NO LIMITS.</span>
             </h1>
             <p className="text-xl text-muted-foreground max-w-md leading-relaxed">
                Connect your MoMo wallet via a simple reference code and get your data bundles delivered in under 5 seconds.
             </p>
             
             <div className="grid grid-cols-2 gap-8 pt-10 border-t border-white/5">
                <div>
                   <div className="text-3xl font-black text-foreground">24/7</div>
                   <div className="text-sm text-muted-foreground uppercase font-bold tracking-widest">Automation</div>
                </div>
                <div>
                   <div className="text-3xl font-black text-foreground">GHS 0</div>
                   <div className="text-sm text-muted-foreground uppercase font-bold tracking-widest">Setup Fee</div>
                </div>
             </div>
          </div>

          <div className="relative">
            <Card className="bg-card/40 backdrop-blur-2xl border-white/5 shadow-2xl p-2 relative z-20 overflow-hidden">
               <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                 <TabsList className="grid w-full grid-cols-2 bg-background/50 mb-6 h-12">
                   <TabsTrigger value="login" className="font-bold text-base">Login</TabsTrigger>
                   <TabsTrigger value="signup" className="font-bold text-base">Register</TabsTrigger>
                 </TabsList>
                 
                 <TabsContent value="login">
                   <form onSubmit={handleLogin}>
                     <CardHeader className="text-center pb-6">
                       <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
                       <CardDescription>Enter your credentials to access your dashboard.</CardDescription>
                     </CardHeader>
                     <CardContent className="space-y-4">
                       <div className="space-y-2">
                         <Label>Email</Label>
                         <Input name="email" type="email" required placeholder="user@example.com" className="h-12 bg-background/50 border-white/5" />
                       </div>
                       <div className="space-y-2">
                         <Label>Password</Label>
                         <Input name="password" type="password" required placeholder="••••••••" className="h-12 bg-background/50 border-white/5" />
                       </div>
                       <Button disabled={loading} className="w-full h-12 font-bold text-lg mt-4 group">
                         {loading ? <Loader2 className="animate-spin" /> : (
                           <span className="flex items-center gap-2">LOG IN <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></span>
                         )}
                       </Button>
                     </CardContent>
                   </form>
                 </TabsContent>

                 <TabsContent value="signup">
                   <form onSubmit={handleSignup}>
                     <CardHeader className="text-center pb-6">
                       <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
                       <CardDescription>Join the future of data bundle automation.</CardDescription>
                     </CardHeader>
                     <CardContent className="space-y-4">
                        <div className="space-y-2">
                         <Label>Full Name</Label>
                         <Input name="fullName" required placeholder="Kojo Antwi" className="h-11 bg-background/50 border-white/5" />
                       </div>
                       <div className="space-y-2">
                         <Label>Email</Label>
                         <Input name="email" type="email" required placeholder="kojo@example.com" className="h-11 bg-background/50 border-white/5" />
                       </div>
                       <div className="space-y-2">
                         <Label>Phone (MTN)</Label>
                         <Input name="phone" required placeholder="024XXXXXXX" className="h-11 bg-background/50 border-white/5" />
                       </div>
                       <div className="space-y-2">
                         <Label>Password</Label>
                         <Input name="password" type="password" required placeholder="••••••••" className="h-11 bg-background/50 border-white/5" />
                       </div>
                       <Button disabled={loading} className="w-full h-12 font-bold text-lg mt-4">
                         {loading ? <Loader2 className="animate-spin" /> : "CREATE ACCOUNT"}
                       </Button>
                     </CardContent>
                   </form>
                 </TabsContent>
               </Tabs>
            </Card>

            {/* Visual Decoration */}
            <div className="absolute top-8 left-8 w-full h-full bg-primary/5 rounded-[var(--radius)] -z-10 border border-white/5 rotate-3 scale-105"></div>
            <div className="absolute top-4 left-4 w-full h-full bg-secondary rounded-[var(--radius)] -z-10 border border-white/5 rotate-1 scale-102"></div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/5 p-10 bg-card/20">
         <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
            <div className="flex items-center gap-2 mb-4">
               <div className="w-6 h-6 bg-primary rounded flex items-center justify-center text-[10px] font-black">FD</div>
               <span className="font-bold text-sm tracking-tight uppercase">FalaaData Automations © 2024</span>
            </div>
            <p className="text-xs text-muted-foreground max-w-md">
               Secure instant deposits via MoMo. Reference-based wallet funding powered by Rahitalu Engine.
            </p>
         </div>
      </footer>
    </div>
  );
}
