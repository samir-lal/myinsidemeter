import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, ShieldCheck, Key, AlertTriangle, Copy, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface TwoFactorStatus {
  enabled: boolean;
  backupCodesCount: number;
  lowBackupCodes: boolean;
}

interface SetupData {
  qrCodeDataUrl: string;
  secret: string;
  backupCodes: string[];
}

export function User2FASettings() {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupMode, setSetupMode] = useState(false);
  const [setupData, setSetupData] = useState<SetupData | null>(null);
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
      const response = await apiRequest("GET", "/api/user/2fa/status");
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
    setSetupData(null);
    try {
      
      const response = await apiRequest("POST", "/api/user/2fa/setup");
      const data = await response.json();
      
      if (data && typeof data === 'object') {
        if (data.qrCodeDataUrl && data.backupCodes && data.secret) {
          setSetupData(data);
          setSetupMode(true);
          toast({
            title: "Setup Ready",
            description: "2FA setup initialized successfully",
          });
          return;
        } else {
          throw new Error(`Missing required data: ${!data.qrCodeDataUrl ? 'QR code ' : ''}${!data.backupCodes ? 'backup codes ' : ''}${!data.secret ? 'secret' : ''}`);
        }
      } else {
        throw new Error("No valid data received from server");
      }
    } catch (error) {
      console.error("Error initializing 2FA setup:", error);
      
      if (error instanceof Error && error.message.includes("already enabled")) {
        toast({
          title: "Already Enabled",
          description: "2FA is already enabled for this account.",
          variant: "default",
        });
        await fetchStatus();
        queryClient.invalidateQueries({ queryKey: ["/api/user/2fa/status"] });
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
    if (!verificationToken || verificationToken.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a valid 6-digit code",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      await apiRequest("POST", "/api/user/2fa/verify-setup", {
        token: verificationToken,
      });

      toast({
        title: "2FA Enabled",
        description: "Two-factor authentication has been successfully enabled!",
      });

      setSetupMode(false);
      setSetupData(null);
      setVerificationToken("");
      await fetchStatus();
      queryClient.invalidateQueries({ queryKey: ["/api/user/2fa/status"] });
    } catch (error) {
      console.error("Error verifying 2FA setup:", error);
      toast({
        title: "Verification Failed",
        description: "Invalid code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const disable2FA = async () => {
    if (!verificationToken || verificationToken.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a valid 6-digit code to disable 2FA",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      await apiRequest("POST", "/api/user/2fa/disable", {
        token: verificationToken,
      });

      toast({
        title: "2FA Disabled",
        description: "Two-factor authentication has been disabled",
      });

      setVerificationToken("");
      await fetchStatus();
      queryClient.invalidateQueries({ queryKey: ["/api/user/2fa/status"] });
    } catch (error) {
      console.error("Error disabling 2FA:", error);
      toast({
        title: "Disable Failed",
        description: "Invalid code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const regenerateBackupCodes = async () => {
    if (!verificationToken || verificationToken.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a valid 6-digit code to regenerate backup codes",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await apiRequest("POST", "/api/user/2fa/regenerate-backup-codes", {
        token: verificationToken,
      });
      const data = await response.json();

      setSetupData(data);
      setShowBackupCodes(true);
      setVerificationToken("");

      toast({
        title: "Backup Codes Generated",
        description: "New backup codes have been generated",
      });

      await fetchStatus();
      queryClient.invalidateQueries({ queryKey: ["/api/user/2fa/status"] });
    } catch (error) {
      console.error("Error regenerating backup codes:", error);
      toast({
        title: "Generation Failed",
        description: "Invalid code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: `${type} copied to clipboard`,
      });
    } catch (error) {
      console.error("Failed to copy:", error);
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
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
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
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
          Add an extra layer of security to your account with time-based one-time passwords (TOTP)
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
              Set up 2FA to add an extra layer of security to your account. You'll need an authenticator app like Google Authenticator or Authy.
            </p>
            
            <Button 
              onClick={initializeSetup} 
              disabled={isProcessing}
              className="w-full"
            >
              <Shield className="h-4 w-4 mr-2" />
              {isProcessing ? "Setting up..." : "Enable 2FA"}
            </Button>
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
                onChange={(e) => setVerificationToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
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

        {/* Setup Modal */}
        {setupMode && setupData && (
          <Dialog open={setupMode} onOpenChange={setSetupMode}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
                <DialogDescription>
                  Follow these steps to secure your account with 2FA
                </DialogDescription>
              </DialogHeader>
              
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
                    )) || <div className="col-span-2 text-center text-muted-foreground">No backup codes available</div>}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={verifySetup}
                    disabled={isProcessing || verificationToken.length !== 6}
                    className="flex-1"
                  >
                    {isProcessing ? "Verifying..." : "Complete Setup"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSetupMode(false)}
                    disabled={isProcessing}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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