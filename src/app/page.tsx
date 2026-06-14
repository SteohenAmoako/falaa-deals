
'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Smartphone, Zap, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "@/app/actions/auth";
import { useToast } from "@/hooks/use-toast";

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
      toast({ title: "Login Successful", description: "Taking you to your dashboard..." });
      router.push('/dashboard');
    } else {
      toast({ title: "Login Failed", description: result.message, variant: "destructive" });
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
      toast({ title: "Account Created!", description: "You can now log in with your credentials." });
      setLoading(false);
      setActiveTab("login");
    } else {
      toast({ title: "Signup Failed", description: result.message, variant: "destructive" });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-white">
      {/* Abstract Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-accent rounded-full blur-[100px]"></div>
      </div>

      <header className="relative z-10 p-6 lg:p-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center font-black italic shadow-lg shadow-primary/20">FD</div>
          <span className="text-2xl font-black tracking-tighter">FalaaData</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/admin" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden md:block">Admin Portal</Link>
          <Button variant="ghost" className="font-bold hover:bg-white/5">Help Center</Button>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 pt-16 pb-32">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary uppercase tracking-widest">
               <Zap className="w-3 h-3" /> Fully Automated Service
             </div>
             <h1 className="text-6xl lg:text-8xl font-black leading-[0.9] tracking-tighter">
                DATA BUNDLES <br />
                <span className="text-primary italic">REIMAGINED.</span>
             </h1>
             <p className="text-xl text-muted-foreground max-w-md leading-relaxed">
                Instant data activation. Use your custom reference code to top up your wallet via MoMo and buy data in 2 clicks.
             </p>
             
             <div className="grid grid-cols-2 gap-8 pt-10 border-t border-white/5">
                <div>
                   <div className="text-3xl font-black text-foreground">1.5s</div>
                   <div className="text-sm text-muted-foreground uppercase font-bold tracking-widest">Avg Activation</div>
                </div>
                <div>
                   <div className="text-3xl font-black text-foreground">24/7</div>
                   <div className="text-sm text-muted-foreground uppercase font-bold tracking-widest">MoMo Engine</div>
                </div>
             </div>
          </div>

          <div className="relative">
            <Card className="bg-card/40 backdrop-blur-2xl border-white/5 shadow-2xl p-2 relative z-20 overflow-hidden">
               <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                 <TabsList className="grid w-full grid-cols-2 bg-background/50 mb-4 h-12">
                   <TabsTrigger value="login" className="font-bold">Login</TabsTrigger>
                   <TabsTrigger value="signup" className="font-bold">Register</TabsTrigger>
                 </TabsList>
                 
                 <TabsContent value="login">
                   <form onSubmit={handleLogin}>
                     <CardHeader className="text-center pb-6">
                       <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
                       <CardDescription>Enter your email and password to access your wallet.</CardDescription>
                     </CardHeader>
                     <CardContent className="space-y-4">
                       <div className="space-y-2">
                         <Label>Email Address</Label>
                         <Input name="email" type="email" required placeholder="name@example.com" className="h-12 bg-background/50 border-white/5" />
                       </div>
                       <div className="space-y-2">
                         <Label>Password</Label>
                         <Input name="password" type="password" required placeholder="••••••••" className="h-12 bg-background/50 border-white/5" />
                       </div>
                       <Button disabled={loading} className="w-full h-12 font-bold text-lg mt-4">
                         {loading ? <Loader2 className="animate-spin" /> : "LOG IN"}
                       </Button>
                     </CardContent>
                   </form>
                 </TabsContent>

                 <TabsContent value="signup">
                   <form onSubmit={handleSignup}>
                     <CardHeader className="text-center pb-6">
                       <CardTitle className="text-2xl font-bold">Join FalaaData</CardTitle>
                       <CardDescription>Create an account to start buying automated bundles.</CardDescription>
                     </CardHeader>
                     <CardContent className="space-y-4">
                        <div className="space-y-2">
                         <Label>Full Name</Label>
                         <Input name="fullName" required placeholder="Kojo Antwi" className="h-11 bg-background/50 border-white/5" />
                       </div>
                       <div className="space-y-2">
                         <Label>Email Address</Label>
                         <Input name="email" type="email" required placeholder="kojo@example.com" className="h-11 bg-background/50 border-white/5" />
                       </div>
                       <div className="space-y-2">
                         <Label>MTN Phone Number</Label>
                         <Input name="phone" required placeholder="024 XXX XXXX" className="h-11 bg-background/50 border-white/5" />
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

            {/* Decorative Card Stack */}
            <div className="absolute top-8 left-8 w-full h-full bg-primary/5 rounded-[var(--radius)] -z-10 border border-white/5 rotate-3 scale-105"></div>
            <div className="absolute top-4 left-4 w-full h-full bg-secondary rounded-[var(--radius)] -z-10 border border-white/5 rotate-1 scale-102"></div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/5 p-10 bg-card/20 text-center">
         <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center text-[10px] font-black">FD</div>
            <span className="font-bold text-sm tracking-tight">FalaaData Automations © 2024</span>
         </div>
         <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Powered by Rahitalu Engine. Deposits processed via automated reference tracking.
         </p>
      </footer>
    </div>
  );
}
