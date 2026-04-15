
import { useState, useEffect } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LeaveRequestForm } from "@/components/LeaveRequestForm";
import { ForfeitRibbon } from "@/components/ForfeitRibbon";
import { MainContent } from "./MainContent";
import { balanceService, EmployeeBalance } from "@/services/balanceService";

interface MainLayoutProps {
  currentUser: any;
  userRole: 'employee' | 'manager' | 'admin' | 'cd';
  setUserRole: (role: 'employee' | 'manager' | 'admin' | 'cd') => void;
  onSwitchApp?: () => void;
}

export const MainLayout = ({ currentUser, userRole, setUserRole, onSwitchApp }: MainLayoutProps) => {
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [employeeBalance, setEmployeeBalance] = useState<EmployeeBalance | null>(null);

  // Fetch real employee balance data from database
  useEffect(() => {
    const fetchEmployeeBalance = async () => {
      if (currentUser?.email && userRole === 'employee') {
        try {
          const balance = await balanceService.getEmployeeBalance(currentUser.email);
          setEmployeeBalance(balance);
        } catch (error) {
          console.error('Failed to fetch employee balance:', error);
        }
      }
    };

    fetchEmployeeBalance();
  }, [currentUser?.email, userRole]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar 
          currentUser={currentUser}
          userRole={userRole}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onRoleChange={setUserRole}
          onSwitchApp={onSwitchApp}
        />
        <SidebarInset>
          {/* Header */}
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1" />
            {/* Top right user info */}
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{currentUser.name}</p>
                <p className="text-xs text-gray-500">{currentUser.email}</p>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 space-y-4 p-4 md:p-6">
            {/* Forfeit ribbon for employees */}
            {userRole === 'employee' && employeeBalance && (
              <ForfeitRibbon 
                broughtforward={employeeBalance.Broughtforward}
                annualUsed={employeeBalance.AnnualUsed}
                annualLeaveAdjustments={employeeBalance.Annual_leave_adjustments}
                forfeited={employeeBalance.Forfeited}
              />
            )}
            
            <MainContent 
              activeTab={activeTab}
              userRole={userRole}
              currentUser={currentUser}
              onNewRequest={() => setShowRequestForm(true)}
            />
          </main>
        </SidebarInset>
      </div>

      {/* Leave Request Form Modal */}
      {showRequestForm && (
        <LeaveRequestForm
          isOpen={showRequestForm}
          onClose={() => setShowRequestForm(false)}
          currentUser={currentUser}
        />
      )}
    </SidebarProvider>
  );
};
