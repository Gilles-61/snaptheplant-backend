import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertCircle, CalendarIcon, Download, Mail } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AdminPanel() {
  const { user, refetchUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [trialDays, setTrialDays] = useState(3);
  
  // Check if current user is admin
  const isAdmin = user?.username === "admin" || user?.email?.includes("admin");
  
  const fetchUsers = async () => {
    if (!isAdmin) return;
    
    try {
      setLoading(true);
      const response = await apiRequest("GET", "/api/admin/users");
      const data = await response.json();
      setUsers(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching users:", error);
      setLoading(false);
    }
  };
  
  // Get current user when loaded
  useEffect(() => {
    if (user && isAdmin) {
      fetchUsers();
      // If no users loaded, use current user for testing
      setSelectedUser(user);
    }
  }, [user, isAdmin]);
  
  const updateUserStatus = async (userId: number, status: string) => {
    try {
      setLoading(true);
      await apiRequest("POST", "/api/admin/update-user-status", {
        userId,
        subscriptionType: status,
      });
      
      toast({
        title: "User updated",
        description: `User status changed to ${status}`,
      });
      
      fetchUsers();
      refetchUser();
      setLoading(false);
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
      setLoading(false);
    }
  };
  
  const startTrial = async (userId: number, days: number) => {
    try {
      setLoading(true);
      await apiRequest("POST", "/api/admin/start-trial", {
        userId,
        days,
      });
      
      toast({
        title: "Trial started",
        description: `Trial started for ${days} days`,
      });
      
      fetchUsers();
      refetchUser();
      setLoading(false);
    } catch (error) {
      console.error("Error starting trial:", error);
      toast({
        title: "Error",
        description: "Failed to start trial",
        variant: "destructive",
      });
      setLoading(false);
    }
  };
  
  const sendTestEmail = async (type: string) => {
    try {
      setLoading(true);
      await apiRequest("POST", "/api/admin/send-test-email", {
        emailType: type,
        email: testEmail || user?.email,
      });
      
      toast({
        title: "Email sent",
        description: `Test email (${type}) sent successfully`,
      });
      
      setLoading(false);
    } catch (error) {
      console.error("Error sending test email:", error);
      toast({
        title: "Error",
        description: "Failed to send test email",
        variant: "destructive",
      });
      setLoading(false);
    }
  };
  
  const downloadProPack = async () => {
    try {
      setLoading(true);
      const response = await apiRequest("GET", "/api/download-pro-pack");
      const data = await response.json();
      
      toast({
        title: "Pro Pack ready",
        description: "Your Pro Pack download is ready",
      });
      
      // Open download in new tab (in real app)
      // window.open(data.downloadUrl, '_blank');
      
      setLoading(false);
      return data;
    } catch (error) {
      console.error("Error downloading Pro Pack:", error);
      toast({
        title: "Error",
        description: "Failed to download Pro Pack",
        variant: "destructive",
      });
      setLoading(false);
    }
  };
  
  // Show unauthorized message if not admin
  if (!isAdmin) {
    return (
      <div className="container py-10">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unauthorized</AlertTitle>
          <AlertDescription>
            You do not have permission to access the admin panel.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Developer Admin Panel</h1>
      
      <Tabs defaultValue="users">
        <TabsList className="mb-4">
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="emails">Test Emails</TabsTrigger>
          <TabsTrigger value="downloads">Downloads</TabsTrigger>
        </TabsList>
      
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Status Management</CardTitle>
              <CardDescription>
                Change subscription status and trial periods for testing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="user">Select User</Label>
                <Select
                  value={selectedUser?.id?.toString()}
                  onValueChange={(value) => {
                    const user = users.find(u => u.id.toString() === value) || null;
                    setSelectedUser(user);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={user?.id?.toString()}>
                      {user?.username} (you)
                    </SelectItem>
                    {users.filter(u => u.id !== user?.id).map((u) => (
                      <SelectItem key={u.id} value={u.id.toString()}>
                        {u.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedUser && (
                <>
                  <div className="border p-4 rounded-md">
                    <h3 className="font-medium mb-2">Current Status</h3>
                    <p>Username: <span className="font-bold">{selectedUser.username}</span></p>
                    <p>Email: <span className="font-bold">{selectedUser.email}</span></p>
                    <p>Status: <span className="font-bold">{selectedUser.subscriptionType || 'free'}</span></p>
                    {selectedUser.trialEndDate && (
                      <p>Trial ends: <span className="font-bold">
                        {new Date(selectedUser.trialEndDate).toLocaleDateString()}
                      </span></p>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div className="grid gap-4">
                    <h3 className="font-medium">Change Status</h3>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant="outline"
                        onClick={() => updateUserStatus(selectedUser.id, 'free')}
                        disabled={loading}
                      >
                        Set Free
                      </Button>
                      <Button
                        variant="outline" 
                        onClick={() => updateUserStatus(selectedUser.id, 'premium')}
                        disabled={loading}
                      >
                        Set Monthly Premium
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => updateUserStatus(selectedUser.id, 'premium-lifetime')}
                        disabled={loading}
                      >
                        Set Lifetime Premium
                      </Button>
                    </div>
                    
                    <div className="mt-2">
                      <h3 className="font-medium mb-2">Trial Management</h3>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <Label htmlFor="trialDays">Trial Days</Label>
                          <Input 
                            id="trialDays"
                            type="number" 
                            value={trialDays}
                            onChange={(e) => setTrialDays(parseInt(e.target.value))}
                            min={1}
                            max={30}
                          />
                        </div>
                        <Button
                          onClick={() => startTrial(selectedUser.id, trialDays)}
                          disabled={loading}
                        >
                          Start Trial
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="emails" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Email Notifications</CardTitle>
              <CardDescription>
                Send test emails to verify the notification system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="testEmail">Email Address</Label>
                <Input 
                  id="testEmail"
                  type="email" 
                  placeholder={user?.email || "Enter email address"} 
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Leave blank to use your account email
                </p>
              </div>
              
              <Separator />
              
              <div className="grid gap-4">
                <h3 className="font-medium">Send Test Emails</h3>
                <div className="space-y-2">
                  <Accordion type="single" collapsible>
                    <AccordionItem value="trial">
                      <AccordionTrigger>Trial Emails</AccordionTrigger>
                      <AccordionContent className="space-y-2">
                        <Button 
                          className="w-full" 
                          variant="outline"
                          onClick={() => sendTestEmail('trial_started')}
                          disabled={loading}
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          Trial Started Email
                        </Button>
                        <Button 
                          className="w-full" 
                          variant="outline"
                          onClick={() => sendTestEmail('trial_ending_1day')}
                          disabled={loading}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          Trial Ending (1 day) Email
                        </Button>
                        <Button 
                          className="w-full" 
                          variant="outline"
                          onClick={() => sendTestEmail('trial_ending_2days')}
                          disabled={loading}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          Trial Ending (2 days) Email
                        </Button>
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="subscription">
                      <AccordionTrigger>Subscription Emails</AccordionTrigger>
                      <AccordionContent className="space-y-2">
                        <Button 
                          className="w-full" 
                          variant="outline"
                          onClick={() => sendTestEmail('subscription_monthly')}
                          disabled={loading}
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          Monthly Subscription Confirmation
                        </Button>
                        <Button 
                          className="w-full" 
                          variant="outline"
                          onClick={() => sendTestEmail('subscription_lifetime')}
                          disabled={loading}
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          Lifetime Subscription Confirmation
                        </Button>
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="propack">
                      <AccordionTrigger>Pro Pack Emails</AccordionTrigger>
                      <AccordionContent>
                        <Button 
                          className="w-full" 
                          variant="outline"
                          onClick={() => sendTestEmail('pro_pack_download')}
                          disabled={loading}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Pro Pack Download Email
                        </Button>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="downloads">
          <Card>
            <CardHeader>
              <CardTitle>Developer Downloads</CardTitle>
              <CardDescription>
                Access premium content for testing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={downloadProPack}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Pro Pack
              </Button>
              <p className="text-sm text-muted-foreground">
                This will bypass subscription checks and allow you to download the Pro Pack for testing.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}