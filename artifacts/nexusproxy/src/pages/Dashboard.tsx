import { Link } from "wouter";
import { useGetActiveSubscription, useGetMyProxies } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Activity, Server, Clock, ShieldAlert, CreditCard } from "lucide-react";

export function Dashboard() {
  const { data: activeSub, isLoading: isSubLoading } = useGetActiveSubscription();
  const { data: proxies, isLoading: isProxiesLoading } = useGetMyProxies();

  if (isSubLoading || isProxiesLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-24 bg-muted/50 rounded-t-xl" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const hasSubscription = !!activeSub?.subscription;
  
  if (!hasSubscription) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto mt-12">
        <Card className="border-primary/20 bg-primary/5 text-center p-12">
          <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-6">
            <ShieldAlert className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-4">No Active Subscription</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            You don't have an active proxy subscription. Purchase a plan to get access to our elite proxy network.
          </p>
          <Link href="/plans">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(0,240,255,0.3)]">
              <CreditCard className="w-4 h-4 mr-2" />
              View Plans
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const { subscription, plan, remainingHours, bandwidthRemainingMb } = activeSub;
  const totalBandwidthMb = subscription.bandwidthGbTotal * 1024;
  const bandwidthPercent = Math.max(0, 100 - (subscription.bandwidthUsedMb / totalBandwidthMb) * 100);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex gap-3">
          <Link href="/usage">
            <Button variant="outline">View Usage</Button>
          </Link>
          <Link href="/plans">
            <Button className="bg-primary text-primary-foreground">Buy Plan</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary mb-1">{plan.name}</div>
            <p className="text-sm text-muted-foreground">{plan.proxyCount} Proxies • {plan.durationDays} Days</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Time Remaining
              <Clock className="w-4 h-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">
              {remainingHours ? Math.floor(remainingHours / 24) : 0} <span className="text-lg font-normal text-muted-foreground">days</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {remainingHours ? remainingHours % 24 : 0} hours left
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Bandwidth Remaining
              <Activity className="w-4 h-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-3">
              {(bandwidthRemainingMb / 1024).toFixed(2)} <span className="text-lg font-normal text-muted-foreground">GB</span>
            </div>
            <Progress value={bandwidthPercent} className="h-2 bg-secondary/20" indicatorClassName="bg-primary" />
          </CardContent>
        </Card>
      </div>

      <div className="pt-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Server className="w-5 h-5 text-primary" />
            Assigned Proxies
          </h2>
          <Link href="/proxies">
            <Button variant="link" className="text-primary">View All</Button>
          </Link>
        </div>
        
        {proxies && proxies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {proxies.slice(0, 6).map((proxy) => (
              <Card key={proxy.id} className="bg-card/50">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex-1 truncate font-mono text-sm">
                    {proxy.ip}:{proxy.port}:{proxy.username}:••••
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-xs text-muted-foreground hover:text-primary"
                    onClick={() => {
                      navigator.clipboard.writeText(`${proxy.ip}:${proxy.port}:${proxy.username}:${proxy.password}`);
                    }}
                  >
                    Copy
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-xl border border-border border-dashed">
            <p className="text-muted-foreground">No proxies currently assigned.</p>
          </div>
        )}
      </div>
    </div>
  );
}