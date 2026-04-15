
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ManualSignInForm } from "@/components/ManualSignInForm";
import { ManualSignUpForm } from "@/components/ManualSignUpForm";
import { PasswordResetForm } from "@/components/PasswordResetForm";
import { useAuth } from "@/contexts/AuthContext";

interface AuthenticationPageProps {
  manualLogin: (email: string, password: string) => Promise<void>;
  manualSignUp: (userData: {
    email: string;
    password: string;
    confirmPassword: string;
    name: string;
    surname: string;
    department: string;
    gender: string;
  }) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

export const AuthenticationPage = ({ manualLogin, manualSignUp, resetPassword }: AuthenticationPageProps) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const { mockAdminLogin } = useAuth();

  if (authMode === 'reset') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <PasswordResetForm
          onBack={() => setAuthMode('signin')}
          onResetRequest={resetPassword}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src="/logo/chailogo.png" 
              alt="Company Logo" 
              className="h-12 w-12"
            />
          </div>
          <CardTitle className="text-2xl text-navy">LeaveApp_SA</CardTitle>
          <CardDescription>Leave Management System - South Africa</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auth mode toggle */}
          <div className="flex space-x-2">
            <Button
              variant={authMode === 'signin' ? 'navy' : 'outline'}
              className="flex-1"
              onClick={() => setAuthMode('signin')}
            >
              Sign In
            </Button>
            <Button
              variant={authMode === 'signup' ? 'navy' : 'outline'}
              className="flex-1"
              onClick={() => setAuthMode('signup')}
            >
              Sign Up
            </Button>
          </div>

          {/* Auth forms */}
          {authMode === 'signin' ? (
            <>
              <ManualSignInForm onSignIn={manualLogin} />
              <div className="text-center">
                <Button
                  variant="link"
                  className="text-sm"
                  onClick={() => setAuthMode('reset')}
                >
                  Forgot your password?
                </Button>
              </div>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full border-dashed"
                onClick={mockAdminLogin}
              >
                Demo Login (Admin)
              </Button>
            </>
          ) : (
            <ManualSignUpForm onSignUp={manualSignUp} />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
