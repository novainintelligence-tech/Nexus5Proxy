import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert, Users, CreditCard, Server, Activity, Plus, RefreshCw, Trash2, Ban } from "lucide-react";
import {
  useAdminGetStats,
  useAdminListUsers,
  useAdminBanUser,
  useAdminListPayments,
  useAdminConfirmPayment,
  useAdminListProxies,
  useAdminAddProxy,
  useAdminBulkAddProxies,
  useAdminDeleteProxy,
  useAdminCreatePlan,
  useListPlans,
  getAdminListUsersQueryKey,
  getAdminListPaymentsQueryKey,
  getAdminListProxiesQueryKey,
  getListPlansQueryKey,
  getAdminGetStatsQueryKey
} from "@workspace/api-client-react";
import { queryClient } from "../lib/queryClient";

export function Admin() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center border border-primary/30">
          <ShieldAlert className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Console</h1>
          <p className="text-muted-foreground">Manage platform infrastructure and users.</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-card border border-border">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="proxies">Proxies</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
        </TabsList>
        <div className="mt-6">
          <TabsContent value="overview"><OverviewTab /></TabsContent>
          <TabsContent value="users"><UsersTab /></TabsContent>
          <TabsContent value="payments"><PaymentsTab /></TabsContent>
          <TabsContent value="proxies"><ProxiesTab /></TabsContent>
          <TabsContent value="plans"><PlansTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function OverviewTab() {
  const { data: stats, isLoading } = useAdminGetStats();

  if (isLoading) return <div className="h-64 flex items-center justify-center"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          <CreditCard className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">${(stats.totalRevenueCents / 100).toFixed(2)}</div>
        </CardContent>
      </Card>
      
      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
          <Users className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">{stats.totalUsers}</div>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Active Subs</CardTitle>
          <Activity className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">{stats.activeSubscriptions}</div>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Pending Payments</CardTitle>
          <CreditCard className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-yellow-500">{stats.pendingPayments}</div>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Proxy Utilization</CardTitle>
          <Server className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">{stats.assignedProxies} / {stats.totalProxies}</div>
          <p className="text-xs text-muted-foreground mt-1">Assigned vs Total Pool</p>
        </CardContent>
      </Card>
    </div>
  );
}

function UsersTab() {
  const { data: users, isLoading } = useAdminListUsers();
  const banUser = useAdminBanUser();
  const { toast } = useToast();

  const handleToggleBan = (id: string, isBanned: boolean) => {
    banUser.mutate(
      { id, data: { isBanned } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
          toast({ title: isBanned ? "User Banned" : "User Unbanned" });
        }
      }
    );
  };

  if (isLoading) return <div className="h-64 flex items-center justify-center"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>Manage user accounts and access.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map(user => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.role === 'admin' ? 'default' : 'outline'} className="text-xs">
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {user.isBanned ? (
                    <Badge variant="destructive" className="bg-destructive/20 text-destructive border-destructive/30">Banned</Badge>
                  ) : (
                    <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Active</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {user.role !== 'admin' && (
                    <Button 
                      variant={user.isBanned ? "outline" : "destructive"} 
                      size="sm"
                      onClick={() => handleToggleBan(user.id, !user.isBanned)}
                      disabled={banUser.isPending}
                    >
                      <Ban className="w-4 h-4 mr-2" />
                      {user.isBanned ? "Unban" : "Ban"}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PaymentsTab() {
  const { data: payments, isLoading } = useAdminListPayments();
  const confirmPayment = useAdminConfirmPayment();
  const { toast } = useToast();

  const handleConfirm = (id: string) => {
    if(!confirm("Manually confirm this payment? This provisions the user's subscription.")) return;
    
    confirmPayment.mutate(
      { id, data: { adminNote: "Manually confirmed via Admin Panel" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getAdminListPaymentsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getAdminGetStatsQueryKey() });
          toast({ title: "Payment Confirmed", description: "Subscription provisioned successfully." });
        }
      }
    );
  };

  if (isLoading) return <div className="h-64 flex items-center justify-center"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payments & Verification</CardTitle>
        <CardDescription>Review crypto payments and confirm pending transactions.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>TxHash / Wallet</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments?.map(payment => (
              <TableRow key={payment.id}>
                <TableCell className="text-sm font-medium">{payment.userEmail || payment.userId}</TableCell>
                <TableCell className="text-sm">{payment.planName || payment.planId}</TableCell>
                <TableCell>
                  <div className="font-medium text-primary">${(payment.amountUsd / 100).toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">{payment.currency}</div>
                </TableCell>
                <TableCell className="font-mono text-xs max-w-[200px] truncate text-muted-foreground">
                  {payment.txHash || "No TxHash provided"}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={payment.status === 'confirmed' ? 'default' : 'outline'}
                    className={
                      payment.status === 'confirmed' ? "bg-green-500/20 text-green-500 border-green-500/30" : 
                      payment.status === 'pending' ? "border-yellow-500/50 text-yellow-500" : ""
                    }
                  >
                    {payment.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {payment.status === 'pending' && (
                    <Button 
                      size="sm" 
                      className="bg-primary text-primary-foreground"
                      onClick={() => handleConfirm(payment.id)}
                      disabled={confirmPayment.isPending}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Confirm
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ProxiesTab() {
  const { data: proxies, isLoading } = useAdminListProxies();
  const bulkAdd = useAdminBulkAddProxies();
  const deleteProxy = useAdminDeleteProxy();
  const { toast } = useToast();
  
  const [bulkText, setBulkText] = useState("");
  const [bulkType, setBulkType] = useState("residential");

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(!bulkText.trim()) return;

    bulkAdd.mutate(
      { data: { proxyList: bulkText, proxyType: bulkType } },
      {
        onSuccess: (res) => {
          queryClient.invalidateQueries({ queryKey: getAdminListProxiesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getAdminGetStatsQueryKey() });
          setBulkText("");
          toast({ 
            title: "Import Complete", 
            description: `Added: ${res.added}. Skipped/Failed: ${res.skipped}.`
          });
        }
      }
    );
  };

  const handleDelete = (id: string) => {
    if(!confirm("Delete this proxy?")) return;
    deleteProxy.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getAdminListProxiesQueryKey() });
        }
      }
    );
  };

  if (isLoading) return <div className="h-64 flex items-center justify-center"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bulk Import Proxies</CardTitle>
          <CardDescription>Format: IP:PORT:USER:PASS (one per line)</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleBulkSubmit} className="space-y-4">
            <div className="flex gap-4">
              <div className="w-48 space-y-2">
                <Label>Proxy Type</Label>
                <Select value={bulkType} onValueChange={setBulkType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">Residential</SelectItem>
                    <SelectItem value="datacenter">Datacenter</SelectItem>
                    <SelectItem value="mobile">Mobile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Proxy List</Label>
              <Textarea 
                className="font-mono text-xs h-32" 
                placeholder="192.168.1.1:8080:user:pass&#10;192.168.1.2:8080:user:pass"
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={bulkAdd.isPending || !bulkText.trim()}>
              {bulkAdd.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Import Proxies
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Proxy Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-[500px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead>IP:Port</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proxies?.slice(0, 100).map(proxy => (
                  <TableRow key={proxy.id}>
                    <TableCell className="font-mono text-sm">{proxy.ip}:{proxy.port}</TableCell>
                    <TableCell><Badge variant="outline">{proxy.proxyType}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{proxy.country || "Unknown"}</TableCell>
                    <TableCell>
                      {proxy.isAssigned ? (
                        <Badge className="bg-primary/20 text-primary border-primary/30">Assigned</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground">Available</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!proxy.isAssigned && (
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(proxy.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="p-2 text-xs text-muted-foreground text-center border-t border-border">
            Showing up to 100 recent proxies.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PlansTab() {
  const { data: plans, isLoading } = useListPlans();
  const createPlan = useAdminCreatePlan();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    id: "",
    name: "",
    description: "",
    planType: "standard",
    priceUsd: "50",
    bandwidthGb: "10",
    proxyCount: "100",
    durationDays: "30",
    proxyTypes: "residential",
    features: "HTTPS/SOCKS5,API Access"
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPlan.mutate(
      {
        data: {
          id: formData.id,
          name: formData.name,
          description: formData.description,
          planType: formData.planType,
          priceUsd: parseInt(formData.priceUsd) * 100, // convert to cents
          bandwidthGb: parseInt(formData.bandwidthGb),
          proxyCount: parseInt(formData.proxyCount),
          durationDays: parseInt(formData.durationDays),
          proxyTypes: formData.proxyTypes.split(",").map(s => s.trim()),
          features: formData.features.split(",").map(s => s.trim())
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPlansQueryKey() });
          toast({ title: "Plan Created" });
        }
      }
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  if (isLoading) return <div className="h-64 flex items-center justify-center"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Plan</CardTitle>
          <CardDescription>Add a new subscription tier to the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plan ID (system name)</Label>
                <Input name="id" placeholder="e.g. premium-100" required value={formData.id} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input name="name" placeholder="e.g. Premium Proxies" required value={formData.name} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>Price (USD)</Label>
                <Input name="priceUsd" type="number" required value={formData.priceUsd} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>Plan Type Flag</Label>
                <Select value={formData.planType} onValueChange={(val) => setFormData(prev => ({...prev, planType: val}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Proxy Count</Label>
                <Input name="proxyCount" type="number" required value={formData.proxyCount} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>Bandwidth (GB)</Label>
                <Input name="bandwidthGb" type="number" required value={formData.bandwidthGb} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>Duration (Days)</Label>
                <Input name="durationDays" type="number" required value={formData.durationDays} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>Proxy Types (comma separated)</Label>
                <Input name="proxyTypes" placeholder="residential,datacenter" required value={formData.proxyTypes} onChange={handleChange} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input name="description" value={formData.description} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>Features (comma separated list for UI)</Label>
              <Textarea name="features" value={formData.features} onChange={handleChange} placeholder="HTTPS Access,City Targeting,Unlimited Threads" />
            </div>
            <Button type="submit" disabled={createPlan.isPending}>
              {createPlan.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Create Plan
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Proxies</TableHead>
                <TableHead>Bandwidth</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans?.map(plan => (
                <TableRow key={plan.id}>
                  <TableCell className="font-mono text-xs">{plan.id}</TableCell>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell>${(plan.priceUsd / 100).toFixed(2)}</TableCell>
                  <TableCell>{plan.proxyCount}</TableCell>
                  <TableCell>{plan.bandwidthGb} GB</TableCell>
                  <TableCell>
                    <Badge variant={plan.isActive ? 'default' : 'secondary'} className={plan.isActive ? "bg-green-500/20 text-green-500" : ""}>
                      {plan.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// Add CheckCircle2 import missing at the top
import { CheckCircle2 } from "lucide-react";