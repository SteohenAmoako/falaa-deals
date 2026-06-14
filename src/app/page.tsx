'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Smartphone, Zap, ShieldCheck, ArrowRight, UserPlus, LogIn } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
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
          <Button variant="ghost" className="font-bold hover:bg-white/5">Sign In</Button>
          <Button className="font-black px-8 shadow-xl shadow-primary/30">GET STARTED</Button>
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
                Connect your MoMo, get your reference code, and experience zero-lag data activation. No waiting, no manual transfers.
             </p>
             <div className="flex flex-col sm:flex-row gap-4 pt-4">
               <Link href="/dashboard">
                 <Button className="h-14 px-8 text-lg font-bold gap-2 group shadow-2xl shadow-primary/40">
                   Enter Dashboard <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                 </Button>
               </Link>
               <Button variant="outline" className="h-14 px-8 text-lg font-bold border-white/10 bg-transparent hover:bg-white/5">
                 View Coverage
               </Button>
             </div>

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
            <Card className="bg-card/40 backdrop-blur-2xl border-white/5 shadow-2xl p-8 relative z-20 overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl -z-10"></div>
               <CardHeader className="text-center pb-8">
                 <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/5">
                    <ShieldCheck className="w-8 h-8 text-primary" />
                 </div>
                 <CardTitle className="text-2xl font-bold">Secure Access</CardTitle>
                 <CardDescription>Enter your credentials to manage your wallet.</CardDescription>
               </CardHeader>
               <CardContent className="space-y-6">
                 <div className="space-y-2">
                   <Label>Phone Number</Label>
                   <Input placeholder="024 XXX XXXX" className="h-12 bg-background/50 border-white/5" />
                 </div>
                 <div className="space-y-2">
                   <Label>Password</Label>
                   <Input type="password" placeholder="••••••••" className="h-12 bg-background/50 border-white/5" />
                 </div>
                 <Link href="/dashboard" className="block">
                  <Button className="w-full h-12 font-bold text-lg">LOG IN TO FALAADATA</Button>
                 </Link>
                 <div className="text-center text-sm text-muted-foreground">
                   Don't have an account? <Link href="#" className="text-primary font-bold hover:underline">Register Now</Link>
                 </div>
               </CardContent>
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
            Powered by Rahitalu Engine. Data provided is subject to network availability. 
            All deposits are final and credited within 60 seconds.
         </p>
      </footer>
    </div>
  );
}