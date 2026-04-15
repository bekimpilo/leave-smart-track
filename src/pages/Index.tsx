
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMaintenanceMode } from "@/contexts/MaintenanceContext";
import { AuthenticationPage } from "@/components/auth/AuthenticationPage";
import { MainLayout } from "@/components/layout/MainLayout";
import { MaintenancePage } from "@/components/MaintenancePage";
import { AppSelector } from "@/components/AppSelector";
import { useUserRole } from "@/hooks/useUserRole";

const Index = () => {
  const {
    user,
    isAuthenticated,
    loading,
    manualLogin,
    manualSignUp,
    resetPassword
  } = useAuth();

  const { userRole, setUserRole, currentUser } = useUserRole(user);
  const { isMaintenanceMode, loading: maintenanceLoading } = useMaintenanceMode();
  const [selectedApp, setSelectedApp] = useState<'leave' | 'travel' | null>(null);

  // Updated manualSignUp handler to include gender - now properly async
  const handleManualSignUp = async (userData: {
    email: string;
    password: string;
    confirmPassword: string;
    name: string;
    surname: string;
    department: string;
    gender: string;
  }) => {
    await manualSignUp(userData);
  };

  // Show loading state
  if (loading || maintenanceLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show sign-in page if not authenticated
  if (!isAuthenticated) {
    return (
      <AuthenticationPage
        manualLogin={manualLogin}
        manualSignUp={handleManualSignUp}
        resetPassword={resetPassword}
      />
    );
  }

  // Show maintenance page for non-admin users when maintenance mode is active
  if (isMaintenanceMode && userRole !== 'admin') {
    return <MaintenancePage />;
  }

  // Show app selector if no app chosen yet
  if (!selectedApp) {
    return (
      <AppSelector
        currentUser={currentUser}
        onSelectApp={setSelectedApp}
      />
    );
  }

  // Travel app placeholder (to be built later)
  if (selectedApp === 'travel') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Travel & Expense Claims</h1>
          <p className="text-gray-500 mb-6">This module is coming soon.</p>
          <button
            onClick={() => setSelectedApp(null)}
            className="text-blue-600 hover:underline"
          >
            ← Back to app selection
          </button>
        </div>
      </div>
    );
  }

  return (
    <MainLayout
      currentUser={currentUser}
      userRole={userRole}
      setUserRole={setUserRole}
      onSwitchApp={() => setSelectedApp(null)}
    />
  );
};

export default Index;
