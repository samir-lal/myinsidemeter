import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldCheck, Key, AlertTriangle, Copy, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface TwoFactorStatus {
  enabled: boolean;
  backupCodesCount: number;
  lowBackupCodes: boolean;
}

interface SetupResponse {
  qrCodeDataUrl: string;
  backupCodes: string[];
  secret: string;
}

export default function Admin2FASettings() {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupMode, setSetupMode] = useState(false);
  const [setupData, setSetupData] = useState<SetupResponse | null>(null);
  const [verificationToken, setVerificationToken] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Force fresh data on mount
    setStatus(null);
    setLoading(true);
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await apiRequest("GET", "/api/admin/2fa/status");
      const data = await response.json() as TwoFactorStatus;
      setStatus(data);
    } catch (error) {
      console.error("Error fetching 2FA status:", error);
      toast({
        title: "Error",
        description: "Failed to fetch 2FA status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeSetup = async () => {
    setIsProcessing(true);
    setSetupData(null); // Clear any previous data
    try {
      
      // Make the API request with proper error handling
      const response = await apiRequest("POST", "/api/admin/2fa/setup");
      const data = await response.json();
      
      // Validate response data structure
      if (data && typeof data === 'object') {
        // Data validation complete
      }
      
      // Simplified validation - just check if we got data
      if (data && typeof data === 'object') {
        // Try to set the data regardless of strict validation
        if (data.qrCodeDataUrl && data.backupCodes && data.secret) {
          setSetupData(data as SetupResponse);
          setSetupMode(true);
          
          toast({
            title: "Setup Ready",
            description: "2FA setup initialized successfully",
          });
          return; // Success path
        } else {
          console.error("❌ Missing required fields:", {
            missingQR: !data.qrCodeDataUrl,
            missingCodes: !data.backupCodes,
            missingSecret: !data.secret
          });
          throw new Error(`Missing required data: ${!data.qrCodeDataUrl ? 'QR code ' : ''}${!data.backupCodes ? 'backup codes ' : ''}${!data.secret ? 'secret' : ''}`);
        }
      } else {
        console.error("❌ Invalid data type or null data");
        throw new Error("No valid data received from server");
      }
    } catch (error) {
      console.error("Error initializing 2FA setup:", error);
      
      // Check if 2FA is already enabled
      if (error instanceof Error && error.message.includes("already enabled")) {
        toast({
          title: "Already Enabled",
          description: "2FA is already enabled for this account.",
          variant: "default",
        });
        // Force refresh status to show current state
        await fetchStatus();
        queryClient.invalidateQueries({ queryKey: ["/api/admin/2fa/status"] });
      } else {
        toast({
          title: "Setup Failed",
          description: "Failed to initialize 2FA setup. Please try again.",
          variant: "destructive",
        });
      }
      setSetupMode(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const verifySetup = async () => {
    if (!verificationToken.trim()) {
      toast({
        title: "Error",
        description: "Please enter the verification code",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      await apiRequest("POST", "/api/admin/2fa/verify-setup", {
        token: verificationToken,
      });

      toast({
        title: "Success",
        description: "2FA has been successfully enabled",
      });

      setSetupMode(false);
      setSetupData(null);
      setVerificationToken("");
      
      // Invalidate and refetch the 2FA status
      queryClient.invalidateQueries({ queryKey: ["/api/admin/2fa/status"] });
      fetchStatus();
    } catch (error) {
      console.error("Error verifying 2FA setup:", error);
      toast({
        title: "Error",
        description: "Invalid verification code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const disable2FA = async () => {
    if (!verificationToken.trim()) {
      toast({
        title: "Error",
        description: "Please enter your current 2FA code to disable",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      await apiRequest("POST", "/api/admin/2fa/disable", {
        token: verificationToken,
      });

      toast({
        title: "Success",
        description: "2FA has been disabled",
      });

      setVerificationToken("");
      fetchStatus();
    } catch (error) {
      console.error("Error disabling 2FA:", error);
      toast({
        title: "Error",
        description: "Failed to disable 2FA. Check your verification code.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const regenerateBackupCodes = async () => {
    if (!verificationToken.trim()) {
      toast({
        title: "Error",
        description: "Please enter your current 2FA code",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await apiRequest("POST", "/api/admin/2fa/regenerate-backup-codes", {
        token: verificationToken,
      }) as unknown as { backupCodes: string[]; message: string };

      toast({
        title: "Success",
        description: "New backup codes generated",
      });

      // Show the new backup codes
      setSetupData({ 
        qrCodeDataUrl: setupData?.qrCodeDataUrl || '', 
        secret: setupData?.secret || '', 
        backupCodes: response.backupCodes 
      });
      setShowBackupCodes(true);
      setVerificationToken("");
      fetchStatus();
    } catch (error) {
      console.error("Error regenerating backup codes:", error);
      toast({
        title: "Error",
        description: "Failed to regenerate backup codes",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Two-Factor Authentication
          {status?.enabled ? (
            <Badge variant="default" className="bg-green-500">
              <ShieldCheck className="h-3 w-3 mr-1" />
              Enabled
            </Badge>
          ) : (
            <Badge variant="secondary">
              Disabled
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Enhance admin account security with time-based one-time passwords (TOTP)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {status?.lowBackupCodes && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You have {status.backupCodesCount} backup codes remaining. Consider regenerating new ones.
            </AlertDescription>
          </Alert>
        )}

        {!status?.enabled ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Set up 2FA to add an extra layer of security to your admin account. You'll need an authenticator app like Google Authenticator or Authy.
            </p>
            
            <Button 
              onClick={initializeSetup} 
              disabled={isProcessing}
              className="w-full"
            >
              <Shield className="h-4 w-4 mr-2" />
              {isProcessing ? "Setting up..." : "Enable 2FA"}
            </Button>

            <Dialog open={setupMode} onOpenChange={setSetupMode}>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950">
                <DialogHeader className="sticky top-0 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 pb-4 border-b border-amber-200 dark:border-amber-800">
                  <DialogTitle className="text-amber-800 dark:text-amber-200 flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Set up Two-Factor Authentication
                  </DialogTitle>
                  <DialogDescription className="text-amber-700 dark:text-amber-300">
                    Enhance your admin account security with time-based authentication codes
                  </DialogDescription>
                </DialogHeader>
                
                <div className="px-1 py-4">
                  {isProcessing && !setupData ? (
                    <div className="text-center py-8">
                      <div className="animate-spin w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p className="text-amber-700 dark:text-amber-300">Setting up your 2FA...</p>
                    </div>
                  ) : setupData ? (
                      <div className="space-y-6">
                        {/* QR Code Section */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center shadow-sm border border-amber-200 dark:border-amber-800">
                          <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-4">
                            Scan with Authenticator App
                          </h3>
                          <div className="bg-white p-4 rounded-lg inline-block shadow-sm">
                            <img 
                              src={setupData.qrCodeDataUrl} 
                              alt="2FA QR Code" 
                              className="w-48 h-48 mx-auto"
                            />
                          </div>
                          <p className="text-sm text-amber-600 dark:text-amber-400 mt-3">
                            Google Authenticator, Authy, or any TOTP app
                          </p>
                        </div>

                        {/* Manual Entry */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-amber-200 dark:border-amber-800">
                          <Label className="text-amber-800 dark:text-amber-200 font-medium">Manual Entry Key</Label>
                          <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
                            Can't scan? Enter this code manually in your authenticator app
                          </p>
                          <div className="flex items-center gap-2">
                            <Input
                              type={showSecret ? "text" : "password"}
                              value={setupData.secret || ''}
                              readOnly
                              className="font-mono text-sm bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-gray-900 dark:text-gray-100"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setShowSecret(!showSecret)}
                              className="border-amber-300 hover:bg-amber-50 dark:border-amber-600 dark:hover:bg-amber-900/20"
                            >
                              {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(setupData.secret || '', "Secret key")}
                              className="border-amber-300 hover:bg-amber-50 dark:border-amber-600 dark:hover:bg-amber-900/20"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Verification */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-amber-200 dark:border-amber-800">
                          <Label htmlFor="verification-code" className="text-amber-800 dark:text-amber-200 font-medium">
                            Verification Code
                          </Label>
                          <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
                            Enter the 6-digit code from your authenticator app
                          </p>
                          <Input
                            id="verification-code"
                            type="text"
                            placeholder="000000"
                            value={verificationToken}
                            onChange={(e) => setVerificationToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            maxLength={6}
                            className="text-center text-2xl font-mono tracking-widest bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-900 dark:text-amber-100 placeholder:text-amber-500 dark:placeholder:text-amber-400"
                          />
                        </div>

                        {/* Backup Codes */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-amber-200 dark:border-amber-800">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-amber-800 dark:text-amber-200 font-medium">Recovery Codes</h3>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(setupData.backupCodes?.join('\n') || '', "Backup codes")}
                              className="border-amber-300 hover:bg-amber-50 dark:border-amber-600 dark:hover:bg-amber-900/20"
                            >
                              <Copy className="h-4 w-4 mr-1" />
                              Copy All
                            </Button>
                          </div>
                          <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
                            Save these codes safely. Each can be used once if you lose your authenticator.
                          </p>
                          <div className="grid grid-cols-2 gap-2 font-mono text-sm bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-700">
                            {setupData.backupCodes?.map((code, index) => (
                              <div key={index} className="p-2 bg-white dark:bg-gray-700 rounded text-center text-amber-800 dark:text-amber-200">
                                {code}
                              </div>
                            )) || <div className="col-span-2 text-center text-amber-600 dark:text-amber-400">Loading backup codes...</div>}
                          </div>
                        </div>

                        <Button 
                          onClick={verifySetup} 
                          disabled={isProcessing || verificationToken.length !== 6}
                          className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 text-lg font-medium"
                        >
                      {isProcessing ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                          Verifying...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-5 w-5 mr-2" />
                          Enable 2FA Security
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                    <p className="text-amber-700 dark:text-amber-300">
                      Unable to load 2FA setup data. Please try again.
                    </p>
                    <Button 
                      onClick={initializeSetup} 
                      variant="outline"
                      className="mt-4 border-amber-300 hover:bg-amber-50 dark:border-amber-600 dark:hover:bg-amber-900/20"
                    >
                      Retry Setup
                    </Button>
                  </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">2FA is enabled</p>
                <p className="text-sm text-muted-foreground">
                  Backup codes: {status.backupCodesCount} remaining
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="current-code">Enter current 2FA code for actions below</Label>
              <Input
                id="current-code"
                type="text"
                placeholder="Enter 6-digit code"
                value={verificationToken}
                onChange={(e) => setVerificationToken(e.target.value)}
                maxLength={6}
                className="text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
              />
            </div>

            <div className="grid gap-2">
              <Button
                variant="outline"
                onClick={regenerateBackupCodes}
                disabled={isProcessing || !verificationToken.trim()}
              >
                <Key className="h-4 w-4 mr-2" />
                Generate New Backup Codes
              </Button>
              
              <Button
                variant="destructive"
                onClick={disable2FA}
                disabled={isProcessing || !verificationToken.trim()}
              >
                Disable 2FA
              </Button>
            </div>
          </div>
        )}

        {showBackupCodes && setupData?.backupCodes && (
          <Dialog open={showBackupCodes} onOpenChange={setShowBackupCodes}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Backup Codes Generated</DialogTitle>
                <DialogDescription>
                  Save these codes in a secure location. Your old backup codes are no longer valid.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 font-mono text-sm bg-muted p-3 rounded-md">
                  {setupData.backupCodes?.map((code, index) => (
                    <div key={index} className="p-1">{code}</div>
                  )) || <div className="col-span-2 text-center text-muted-foreground">No backup codes available</div>}
                </div>
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(setupData.backupCodes?.join('\n') || '', "Backup codes")}
                  className="w-full"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy All Codes
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}