import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bell, Check, Clock, Mail, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";

interface UserNotificationSettings {
  emailNotificationsEnabled: boolean;
  notificationEmail: string | null;
  email: string | null;
}

export default function NotificationSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  
  // iOS notification support
  const { 
    permissions: iosPermissions, 
    isNative, 
    requestPermissions: requestIOSPermissions,
    scheduleDailyReminder
  } = useNotifications();
  
  // Email notification states
  const [isEmailEnabled, setIsEmailEnabled] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [emailInputTouched, setEmailInputTouched] = useState(false);
  
  // iOS notification states
  const [iosNotificationsEnabled, setIOSNotificationsEnabled] = useState(false);

  // Fetch user notification settings
  const { data: settings } = useQuery<UserNotificationSettings>({
    queryKey: ["/api/user/notification-settings"],
  });

  // Test email notifications mutation
  const testEmailNotifications = useMutation({
    mutationFn: () => apiRequest("POST", "/api/test-email-notifications"),
    onSuccess: () => {
      toast({
        title: "Test email sent!",
        description: "Check your inbox for the test notification",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send test email",
        description: error.message || "Please check your email settings",
        variant: "destructive",
      });
    },
  });

  // Update email settings mutation
  const updateEmailSettings = useMutation({
    mutationFn: (data: { emailEnabled: boolean; emailAddress?: string }) =>
      apiRequest("POST", "/api/user/notification-settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/notification-settings"] });
      toast({
        title: "Email settings updated",
        description: "Your notification preferences have been saved",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update settings",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Initialize state from settings
  useEffect(() => {
    if (settings) {
      setIsEmailEnabled(settings.emailNotificationsEnabled);
      setEmailAddress(settings.notificationEmail || settings.email || "");
    }
  }, [settings]);

  const isEmailValid = emailAddress.includes("@") && emailAddress.includes(".");

  const handleEmailNotificationToggle = (enabled: boolean) => {
    if (enabled && !isEmailValid) {
      setEmailInputTouched(true);
      toast({
        title: "Email address required",
        description: "Please enter a valid email address first",
        variant: "destructive"
      });
      return;
    }

    setIsEmailEnabled(enabled);
    updateEmailSettings.mutate({ 
      emailEnabled: enabled, 
      emailAddress: enabled ? emailAddress : undefined 
    });
  };

  const handleEmailSave = () => {
    if (!isEmailValid) {
      setEmailInputTouched(true);
      return;
    }
    
    updateEmailSettings.mutate({ 
      emailEnabled: true, 
      emailAddress 
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Notification Settings
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Set up reminders to help you track your mood consistently
        </p>
      </div>
      
      <div className="space-y-4">
        {/* Email Notifications Section */}
        <div className={`p-4 rounded-lg border ${
          isEmailEnabled && isEmailValid 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' 
            : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Mail className={`h-5 w-5 ${
                isEmailEnabled && isEmailValid 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-blue-600 dark:text-blue-400'
              }`} />
              <div>
                <Label className="text-base font-medium text-slate-900 dark:text-white">
                  Email Reminders
                </Label>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {isEmailEnabled && isEmailValid 
                    ? `Active for ${emailAddress}` 
                    : 'Receive mood tracking reminders via email'
                  }
                </p>
              </div>
            </div>
            <Switch 
              checked={isEmailEnabled}
              onCheckedChange={handleEmailNotificationToggle}
            />
          </div>

          {(!isEmailEnabled || !isEmailValid) && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  value={emailAddress}
                  onChange={(e) => {
                    setEmailAddress(e.target.value);
                    setEmailInputTouched(true);
                  }}
                  className={`flex-1 text-slate-900 dark:text-white ${
                    emailInputTouched && !isEmailValid 
                      ? 'border-red-500 focus:border-red-500' 
                      : 'border-blue-200 dark:border-blue-700'
                  }`}
                />
                <Button
                  size="sm"
                  onClick={handleEmailSave}
                  disabled={updateEmailSettings.isPending || !isEmailValid}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Save
                </Button>
              </div>
              
              {emailInputTouched && !isEmailValid && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  Please enter a valid email address
                </p>
              )}
            </div>
          )}

          {isEmailEnabled && isEmailValid && (
            <div className="flex items-center justify-between p-3 bg-green-100 dark:bg-green-900/40 rounded-lg">
              <div className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-800 dark:text-green-200">
                  Email notifications active
                </span>
              </div>
              <div className="flex space-x-2">
                {/* Test Email button - Admin only */}
                {user?.role === 'admin' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      testEmailNotifications.mutate();
                    }}
                    disabled={testEmailNotifications.isPending}
                    className="text-green-700 border-green-300 hover:bg-green-100"
                  >
                    <Mail className="h-3 w-3 mr-1" />
                    {testEmailNotifications.isPending ? "Sending..." : "Test Email"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEmailEnabled(false);
                    updateEmailSettings.mutate({ 
                      emailEnabled: false
                    });
                  }}
                  className="text-green-700 border-green-300 hover:bg-green-200 dark:text-green-200 dark:border-green-600 dark:hover:bg-green-800"
                >
                  Change Email
                </Button>
              </div>
            </div>
          )}

          {isEmailEnabled && isEmailValid && (
            <div className="text-sm text-green-700 dark:text-green-300 mt-3">
              Daily reminders will be sent to <strong>{emailAddress}</strong> at 12 PM and 8 PM
            </div>
          )}
        </div>

        {/* iOS Native Notifications Section */}
        {isNative ? (
          <div className={`p-4 rounded-lg border ${
            iosNotificationsEnabled && iosPermissions.granted
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' 
              : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Bell className={`h-5 w-5 ${
                  iosNotificationsEnabled && iosPermissions.granted
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-blue-600 dark:text-blue-400'
                }`} />
                <div>
                  <Label className="text-base font-medium text-slate-900 dark:text-white">
                    iOS Push Notifications
                  </Label>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {iosNotificationsEnabled && iosPermissions.granted
                      ? 'Daily mood reminders active' 
                      : 'Get native iOS notifications for mood tracking'
                    }
                  </p>
                </div>
              </div>
              <Switch 
                checked={iosNotificationsEnabled && iosPermissions.granted}
                onCheckedChange={async (checked) => {
                  if (checked && !iosPermissions.granted) {
                    const granted = await requestIOSPermissions();
                    if (granted) {
                      setIOSNotificationsEnabled(true);
                      // Schedule daily reminders
                      await scheduleDailyReminder(12, 0); // 12 PM
                      await scheduleDailyReminder(20, 0); // 8 PM
                      toast({
                        title: "iOS Notifications Enabled",
                        description: "You'll receive daily mood tracking reminders at 12 PM and 8 PM",
                      });
                    } else {
                      toast({
                        title: "Permission Required",
                        description: "Please enable notifications in iOS Settings to receive reminders",
                        variant: "destructive",
                      });
                    }
                  } else {
                    setIOSNotificationsEnabled(false);
                    toast({
                      title: "iOS Notifications Disabled",
                      description: "Daily reminders have been turned off",
                    });
                  }
                }}
              />
            </div>
            
            {!iosPermissions.granted && iosNotificationsEnabled && (
              <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700">
                <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                  Notification permissions required. Tap the switch above to enable notifications in iOS Settings.
                </AlertDescription>
              </Alert>
            )}
            
            {iosNotificationsEnabled && iosPermissions.granted && (
              <div className="flex items-center justify-between p-3 bg-green-100 dark:bg-green-900/40 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">
                    iOS notifications active
                  </span>
                </div>
                {user?.role === 'admin' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const { scheduleLocalNotification } = useNotifications();
                      const success = await scheduleLocalNotification(
                        "InsideMeter Test", 
                        "Your iOS mood tracking notifications are working perfectly! 🎉"
                      );
                      if (success) {
                        toast({
                          title: "Test notification sent!",
                          description: "Check your iPhone notification center",
                        });
                      } else {
                        toast({
                          title: "Test failed",
                          description: "Please ensure notifications are enabled in iOS Settings",
                          variant: "destructive",
                        });
                      }
                    }}
                    className="text-green-700 border-green-300 hover:bg-green-100"
                  >
                    <Bell className="h-3 w-3 mr-1" />
                    Test Notification
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Web SMS Notifications Section - Disabled */
          <div className="p-4 rounded-lg border bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <MessageSquare className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                <div>
                  <Label className="text-base font-medium text-slate-600 dark:text-slate-400">
                    SMS Text Reminders
                  </Label>
                  <p className="text-sm text-slate-500 dark:text-slate-500">
                    SMS functionality disabled - Use iOS app for native notifications
                  </p>
                </div>
              </div>
              <Switch 
                checked={false}
                disabled={true}
                onCheckedChange={() => {}}
              />
            </div>
          </div>
        )}

        {/* Notification Schedule */}
        <Alert className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700">
          <Clock className="h-4 w-4" />
          <AlertDescription className="text-slate-700 dark:text-slate-300">
            <strong>Daily Schedule:</strong> Mood tracking reminders are sent at 12:00 PM and 8:00 PM every day.
            These gentle nudges help you maintain consistent tracking for better insights into your emotional patterns.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}