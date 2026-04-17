import { useState } from "react";
import { TravelSidebar } from "./TravelSidebar";
import { TravelDashboard } from "./TravelDashboard";
import { TravelRequestForm } from "./TravelRequestForm";
import { ExpenseClaimForm } from "./ExpenseClaimForm";
import { MyRequestsList } from "./MyRequestsList";
import { ManagerApprovals } from "./ManagerApprovals";
import { CoordinatorQueue } from "./CoordinatorQueue";
import { FinanceQueue } from "./FinanceQueue";
import { AdminTravelConfig } from "./AdminTravelConfig";
import { useTravelRole } from "@/hooks/useTravelRole";

interface Props { currentUser: any; onSwitchApp?: () => void; }

export const TravelApp = ({ currentUser, onSwitchApp }: Props) => {
  const { travelRole, loading } = useTravelRole(currentUser);
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <TravelDashboard currentUser={currentUser} onNavigate={setActiveTab} />;
      case 'new-travel': return <TravelRequestForm currentUser={currentUser} onSubmitted={() => setActiveTab('my-travel')} />;
      case 'new-expense': return <ExpenseClaimForm currentUser={currentUser} onSubmitted={() => setActiveTab('my-expenses')} />;
      case 'my-travel': return <MyRequestsList mode="travel" currentUser={currentUser} />;
      case 'my-expenses': return <MyRequestsList mode="expense" currentUser={currentUser} />;
      case 'manager-approvals': return <ManagerApprovals currentUser={currentUser} />;
      case 'coordinator-queue': return <CoordinatorQueue />;
      case 'finance-queue': return <FinanceQueue />;
      case 'admin-config': return <AdminTravelConfig />;
      default: return <TravelDashboard currentUser={currentUser} onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
      <TravelSidebar
        currentUser={currentUser}
        travelRole={travelRole}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSwitchApp={onSwitchApp}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">{renderContent()}</div>
      </main>
    </div>
  );
};
