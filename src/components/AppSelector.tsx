
import { Calendar, Plane, LogOut, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

interface AppSelectorProps {
  currentUser: any;
  onSelectApp: (app: 'leave' | 'travel') => void;
}

export const AppSelector = ({ currentUser, onSelectApp }: AppSelectorProps) => {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#0a0e27] flex flex-col overflow-hidden relative">
      {/* Animated background shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-purple-600/5 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-3">
          <img src="/logo/chailogo.png" alt="Company Logo" className="h-10 w-10 drop-shadow-lg" />
          <span className="text-lg font-bold text-white/90 tracking-wide">CHAI Portal</span>
        </div>
        <div className="flex items-center gap-5">
          <span className="text-sm text-white/50">Welcome, <span className="text-white/80 font-medium">{currentUser?.name}</span></span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logout()}
            className="text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="h-4 w-4 mr-1" />
            Sign out
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4">
        <div className="max-w-3xl w-full">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/50 mb-6">
              <Sparkles className="h-3 w-3" />
              Select your workspace
            </div>
            <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
              What would you like to do?
            </h1>
            <p className="text-white/40 text-base">Choose an application to get started</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Leave App */}
            <button
              className="group relative rounded-2xl p-[1px] bg-gradient-to-b from-blue-500/30 to-transparent hover:from-blue-400/60 hover:to-blue-600/20 transition-all duration-500 text-left"
              onClick={() => onSelectApp('leave')}
            >
              <div className="rounded-2xl bg-[#0d1233]/90 backdrop-blur-xl p-8 h-full transition-all duration-500 group-hover:bg-[#111640]/90">
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-blue-500/5 blur-xl" />

                <div className="relative z-10">
                  <div className="w-14 h-14 mb-6 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 group-hover:scale-110 transition-all duration-300">
                    <Calendar className="h-7 w-7 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-white mb-2">Leave Management</h2>
                  <p className="text-sm text-white/40 leading-relaxed">
                    Request leave, view balances, manage team requests and holidays.
                  </p>
                  <div className="mt-6 flex items-center text-blue-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
                    Open app →
                  </div>
                </div>
              </div>
            </button>

            {/* Travel & Expense */}
            <button
              className="group relative rounded-2xl p-[1px] bg-gradient-to-b from-emerald-500/30 to-transparent hover:from-emerald-400/60 hover:to-emerald-600/20 transition-all duration-500 text-left"
              onClick={() => onSelectApp('travel')}
            >
              <div className="rounded-2xl bg-[#0d1233]/90 backdrop-blur-xl p-8 h-full transition-all duration-500 group-hover:bg-[#111640]/90">
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-emerald-500/5 blur-xl" />

                <div className="relative z-10">
                  <div className="w-14 h-14 mb-6 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 group-hover:scale-110 transition-all duration-300">
                    <Plane className="h-7 w-7 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-white mb-2">Travel & Expense Claims</h2>
                  <p className="text-sm text-white/40 leading-relaxed">
                    Submit travel requests, expense claims, and track reimbursements.
                  </p>
                  <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-amber-400/80 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Coming Soon
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6">
        <p className="text-xs text-white/20">© {new Date().getFullYear()} CHAI · All rights reserved</p>
      </footer>
    </div>
  );
};
