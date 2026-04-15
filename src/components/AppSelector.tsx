
import { Calendar, Plane } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface AppSelectorProps {
  currentUser: any;
  onSelectApp: (app: 'leave' | 'travel') => void;
}

export const AppSelector = ({ currentUser, onSelectApp }: AppSelectorProps) => {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <img src="/logo/chailogo.png" alt="Company Logo" className="h-10 w-10" />
          <span className="text-lg font-semibold text-slate-800">CHAI Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">Welcome, {currentUser?.name}</span>
          <Button variant="ghost" size="sm" onClick={() => logout()} className="text-red-600 hover:text-red-700 hover:bg-red-50">
            <LogOut className="h-4 w-4 mr-1" />
            Sign out
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-3xl w-full">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">What would you like to do?</h1>
            <p className="text-slate-500">Select an application to continue</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Leave App */}
            <Card
              className="group cursor-pointer border-2 border-transparent hover:border-blue-400 hover:shadow-xl transition-all duration-300 bg-white"
              onClick={() => onSelectApp('leave')}
            >
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-500 transition-colors duration-300">
                  <Calendar className="h-8 w-8 text-blue-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Leave Management</h2>
                <p className="text-sm text-slate-500">
                  Request leave, view balances, manage team requests and holidays.
                </p>
              </CardContent>
            </Card>

            {/* Travel & Expense */}
            <Card
              className="group cursor-pointer border-2 border-transparent hover:border-emerald-400 hover:shadow-xl transition-all duration-300 bg-white"
              onClick={() => onSelectApp('travel')}
            >
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-500 transition-colors duration-300">
                  <Plane className="h-8 w-8 text-emerald-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Travel & Expense Claims</h2>
                <p className="text-sm text-slate-500">
                  Submit travel requests, expense claims, and track reimbursements.
                </p>
                <span className="inline-block mt-3 text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                  Coming Soon
                </span>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
