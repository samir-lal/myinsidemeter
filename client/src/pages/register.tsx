import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Moon, UserPlus, ArrowLeft } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useGuestSession } from "@/hooks/useGuestSession";
import { Link } from "wouter";

export default function Register() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    name: "",
    email: "",
    age: "",
    gender: ""
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null);
  const { toast } = useToast();
  const { guestSession, clearGuestSession } = useGuestSession();

  const registerMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      console.log('🚀 Registration: Starting account creation for:', data.username);
      
      const payload = {
        ...data,
        age: data.age ? parseInt(data.age) : null,
        guestId: guestSession?.guestId
      };
      
      console.log('📦 Registration: Payload prepared:', { ...payload, password: '[REDACTED]' });
      
      const response = await apiRequest("POST", "/api/register", payload);
      console.log('✅ Registration: API response received:', response);
      console.log('🔍 Registration: Response type:', typeof response);
      console.log('🔍 Registration: Response keys:', Object.keys(response || {}));
      
      return response;
    },
    onSuccess: (data) => {
      console.log('🎉 Registration: Account created successfully for user:', data.user?.username);
      console.log('🔍 Registration: Full response data:', data);
      
      clearGuestSession();
      
      toast({
        title: "Account created successfully!",
        description: "Account registration was successful. Logging you in..."
      });
      
      // Invalidate auth queries to refresh authentication state
      queryClient.invalidateQueries({ queryKey: ["/api/auth/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status-realtime"] });
      
      // Navigate to home page
      setTimeout(() => {
        console.log('🔄 Registration: Navigating to home page');
        window.location.href = "/";
      }, 1000);
    },
    onError: (error: any) => {
      console.error('❌ Registration: Account creation failed:', error);
      
      toast({
        title: "Registration failed",
        description: error.message || "Please check your information and try again.",
        variant: "destructive"
      });
    }
  });

  const validateForm = () => {
    const newErrors: string[] = [];
    
    // Username validation
    if (!formData.username.trim()) newErrors.push("Username is required");
    if (formData.username.length < 3) newErrors.push("Username must be at least 3 characters");
    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.push("Username can only contain letters, numbers, and underscores");
    }
    
    // Password validation
    if (!formData.password) newErrors.push("Password is required");
    if (formData.password.length < 6) newErrors.push("Password must be at least 6 characters");
    if (formData.password !== formData.confirmPassword) newErrors.push("Passwords don't match");
    
    // Full name validation
    if (!formData.name.trim()) newErrors.push("Name is required");
    if (!/^[a-zA-Z\s'-]+$/.test(formData.name.trim())) {
      newErrors.push("Name can only contain letters, spaces, hyphens, and apostrophes");
    }
    
    // Email validation
    if (!formData.email.trim()) newErrors.push("Email is required");
    if (formData.email && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
      newErrors.push("Please enter a valid email address");
    }
    
    // Age validation
    if (formData.age && (parseInt(formData.age) < 13 || parseInt(formData.age) > 120)) {
      newErrors.push("Age must be between 13 and 120");
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('📝 Registration: Form submission started');
    console.log('🔍 Registration: Form data validation beginning');
    
    if (validateForm()) {
      console.log('✅ Registration: Form validation passed, starting mutation');
      registerMutation.mutate(formData);
    } else {
      console.log('❌ Registration: Form validation failed, errors:', errors);
      toast({
        title: "Please check your information",
        description: "There are validation errors that need to be corrected.",
        variant: "destructive"
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    let sanitizedValue = value;
    
    // Real-time validation and sanitization
    if (field === 'username') {
      // Only allow letters, numbers, and underscores
      sanitizedValue = value.replace(/[^a-zA-Z0-9_]/g, '');
    } else if (field === 'name') {
      // Only allow letters, spaces, hyphens, and apostrophes
      sanitizedValue = value.replace(/[^a-zA-Z\s'-]/g, '');
    } else if (field === 'email') {
      // Only allow valid email characters
      sanitizedValue = value.replace(/[^a-zA-Z0-9._%+-@]/g, '');
    }
    
    const newFormData = { ...formData, [field]: sanitizedValue };
    setFormData(newFormData);
    
    // Real-time password matching validation
    if (field === 'password' || field === 'confirmPassword') {
      const password = field === 'password' ? sanitizedValue : newFormData.password;
      const confirmPassword = field === 'confirmPassword' ? sanitizedValue : newFormData.confirmPassword;
      
      if (confirmPassword === '') {
        setPasswordsMatch(null); // No validation when confirm field is empty
      } else if (password === confirmPassword) {
        setPasswordsMatch(true);
      } else {
        setPasswordsMatch(false);
      }
    }
    
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-2 h-2 bg-white/30 rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-32 w-1 h-1 bg-yellow-300/40 rounded-full animate-pulse delay-1000"></div>
        <div className="absolute bottom-32 left-40 w-1.5 h-1.5 bg-purple-300/30 rounded-full animate-pulse delay-2000"></div>
        <div className="absolute bottom-20 right-20 w-1 h-1 bg-blue-300/40 rounded-full animate-pulse delay-500"></div>
      </div>
      
      <Card className="w-full max-w-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-0 shadow-2xl relative">
        <CardHeader className="text-center pb-6">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-3 rounded-full shadow-lg">
              <Moon className="h-8 w-8 text-white" />
            </div>
          </div>
          
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Begin Your Journey
          </CardTitle>
          
          <CardDescription className="text-slate-600 dark:text-slate-300 text-base leading-relaxed">
            {guestSession?.moodCount ? (
              <div className="space-y-2">
                <p className="font-medium text-green-600 dark:text-green-400">
                  ⭐ Great start! You've already logged {guestSession.moodCount} mood{guestSession.moodCount !== 1 ? 's' : ''}
                </p>
                <p>Create your account to save your progress and unlock deeper insights into your emotional patterns.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="font-medium text-purple-600 dark:text-purple-400">
                  ✨ Welcome to your mindful transformation
                </p>
                <p>Join thousands discovering the profound connection between their inner world and the lunar cycles.</p>
              </div>
            )}
          </CardDescription>
          
          {/* Encouraging quote */}
          <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border-l-4 border-amber-400 shadow-sm">
            <p className="text-sm italic text-amber-800 dark:text-amber-200">
              "The unexamined life is not worth living" - Socrates
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">
              When you see clearly, you live differently
            </p>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.length > 0 && (
              <Alert className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700">
                <AlertDescription className="text-red-700 dark:text-red-300">
                  <ul className="list-disc list-inside space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="username" className="text-slate-700 dark:text-slate-200 font-medium flex items-center gap-2">
                  <span>✨</span> Username
                </Label>
                <input
                  id="username"
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange("username", e.target.value)}
                  className="flex h-12 w-full rounded-lg border-2 border-purple-200 bg-white/80 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 hover:border-purple-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800/80 dark:text-white dark:placeholder:text-slate-400"
                  placeholder="Choose your unique name"
                  required
                  autoComplete="username"
                />
              </div>
              <div>
                <Label htmlFor="name" className="text-slate-700 dark:text-slate-200 font-medium flex items-center gap-2">
                  <span>👤</span> Full Name
                </Label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="flex h-12 w-full rounded-lg border-2 border-purple-200 bg-white/80 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 hover:border-purple-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800/80 dark:text-white dark:placeholder:text-slate-400"
                  placeholder="Your full name"
                  required
                  autoComplete="name"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="text-slate-700 dark:text-slate-200 font-medium flex items-center gap-2">
                <span>📧</span> Email Address
              </Label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className="flex h-12 w-full rounded-lg border-2 border-purple-200 bg-white/80 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 hover:border-purple-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800/80 dark:text-white dark:placeholder:text-slate-400"
                placeholder="your@email.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="password" className="text-slate-700 dark:text-slate-200 font-medium flex items-center gap-2">
                  <span>🔐</span> Password
                </Label>
                <input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  className="flex h-12 w-full rounded-lg border-2 border-purple-200 bg-white/80 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 hover:border-purple-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800/80 dark:text-white dark:placeholder:text-slate-400"
                  placeholder="Create secure password"
                  required
                  autoComplete="new-password"
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword" className="text-slate-700 dark:text-slate-200 font-medium flex items-center gap-2">
                  <span>
                    {passwordsMatch === null ? "🔄" : passwordsMatch ? "✅" : "❌"}
                  </span> 
                  Confirm Password
                </Label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    className={`flex h-12 w-full rounded-lg border-2 bg-white/80 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all duration-200 hover:border-purple-300 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800/80 dark:text-white dark:placeholder:text-slate-400 ${
                      passwordsMatch === null 
                        ? "border-purple-200 focus:ring-purple-500 focus:border-purple-500 dark:border-slate-600"
                        : passwordsMatch 
                        ? "border-green-300 focus:ring-green-500 focus:border-green-500 dark:border-green-600"
                        : "border-red-300 focus:ring-red-500 focus:border-red-500 dark:border-red-600"
                    }`}
                    placeholder="Confirm password"
                    required
                    autoComplete="new-password"
                  />
                  {formData.confirmPassword && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {passwordsMatch === true ? (
                        <span className="text-green-500 text-lg">✓</span>
                      ) : passwordsMatch === false ? (
                        <span className="text-red-500 text-lg">✗</span>
                      ) : null}
                    </div>
                  )}
                </div>
                {passwordsMatch === false && formData.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <span>⚠️</span> Passwords don't match
                  </p>
                )}
                {passwordsMatch === true && formData.confirmPassword && (
                  <p className="text-green-600 text-xs mt-1 flex items-center gap-1">
                    <span>✅</span> Passwords match perfectly!
                  </p>
                )}
                {formData.confirmPassword === '' && formData.password !== '' && (
                  <p className="text-blue-600 text-xs mt-1 flex items-center gap-1">
                    <span>💡</span> Re-enter your password to confirm
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="age" className="text-slate-700 dark:text-slate-200 font-medium flex items-center gap-2">
                  <span>🎂</span> Age (Optional)
                </Label>
                <input
                  id="age"
                  type="number"
                  value={formData.age}
                  onChange={(e) => handleInputChange("age", e.target.value)}
                  className="flex h-12 w-full rounded-lg border-2 border-purple-200 bg-white/80 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 hover:border-purple-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800/80 dark:text-white dark:placeholder:text-slate-400"
                  placeholder="Your age"
                  min="13"
                  max="120"
                />
              </div>
              <div>
                <Label htmlFor="gender" className="text-slate-700 dark:text-slate-200 font-medium flex items-center gap-2">
                  <span>🌈</span> Gender (Optional)
                </Label>
                <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
                  <SelectTrigger className="h-12 bg-white/80 dark:bg-slate-800/80 border-2 border-purple-200 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg hover:border-purple-300 transition-all duration-200">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Encouraging message before submit */}
            <div className="text-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-700">
              <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                🌱 Ready to transform your self-awareness journey?
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Your mindful transformation begins with this single step
              </p>
            </div>

            <Button
              type="submit"
              className={`w-full h-14 font-semibold text-lg rounded-lg shadow-lg hover:shadow-xl transform transition-all duration-200 ${
                (passwordsMatch === false && formData.confirmPassword !== '') || registerMutation.isPending
                  ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 hover:scale-105'
              } text-white`}
              disabled={(passwordsMatch === false && formData.confirmPassword !== '') || registerMutation.isPending}
            >
              {registerMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Creating Your Journey...
                </div>
              ) : (
                <>
                  <UserPlus className="w-5 h-5 mr-2" />
                  Begin My Transformation
                </>
              )}
            </Button>

            <div className="text-center">
              <Link href="/login">
                <Button variant="ghost" className="text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors duration-200">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}