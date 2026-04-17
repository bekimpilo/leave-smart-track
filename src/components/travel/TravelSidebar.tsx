import { LucideIcon, LayoutDashboard, FilePlus, Receipt, CheckSquare, ClipboardList, Banknote, Settings, LogOut, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { TravelRole } from "@/services/travelService";
import { cn } from "@/lib/utils";

interface TravelSidebarProps {
  currentUser: any;
  travelRole: TravelRole;
  activeTab: string;
  onTabChange: (t: string) => void;
  onSwitchApp?: () => void;
}

interface NavItem { value: string; label: string; icon: LucideIcon; }

const buildNav = (role: TravelRole): NavItem[] => {
  const items: NavItem[] = [
    { value: 'dashboard', label: 'My Dashboard', icon: LayoutDashboard },
    { value: 'new-travel', label: 'New Travel Request', icon: FilePlus },
    { value: 'new-expense', label: 'New Expense Claim', icon: Receipt },
    { value: 'my-travel', label: 'My Travel Requests', icon: ClipboardList },
    { value: 'my-expenses', label: 'My Expense Claims', icon: ClipboardList },
  ];
  if (role === 'manager' || role === 'admin') {
    items.push({ value: 'manager-approvals', label: 'Approvals', icon: CheckSquare });
  }
  if (role === 'office_coordinator' || role === 'admin') {
    items.push({ value: 'coordinator-queue', label: 'Bookings Queue', icon: ClipboardList });
  }
  if (role === 'finance_admin' || role === 'admin') {
    items.push({ value: 'finance-queue', label: 'Finance Queue', icon: Banknote });
  }
  if (role === 'admin') {
    items.push({ value: 'admin-config', label: 'System Config', icon: Settings });
  }
  return items;
};

export const TravelSidebar = ({ currentUser, travelRole, activeTab, onTabChange, onSwitchApp }: TravelSidebarProps) => {
  const { logout } = useAuth();
  const items = buildNav(travelRole);

  const roleLabel = travelRole.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 bg-gradient-to-b from-slate-950 via-blue-950 to-slate-900 text-white border-r border-blue-900/50">
      <div className="p-5 border-b border-blue-900/50 flex items-center gap-3">
        <img src="/logo/chailogo.png" alt="CHAI" className="h-9 w-9 rounded bg-white/10 p-1" />
        <div>
          <div className="font-bold leading-tight">Travel & Expense</div>
          <div className="text-xs text-blue-300/80">CHAI Portal</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {items.map(it => (
          <button
            key={it.value}
            onClick={() => onTabChange(it.value)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
              activeTab === it.value
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                : "text-blue-100/80 hover:bg-blue-900/50 hover:text-white"
            )}
          >
            <it.icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{it.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-blue-900/50 space-y-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-blue-600 text-white text-xs">
              {currentUser?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{currentUser?.name}</p>
            <p className="text-xs text-blue-300/70 truncate">{currentUser?.email}</p>
          </div>
        </div>
        <Badge className="w-full justify-center bg-blue-600/20 text-blue-200 border border-blue-400/30 hover:bg-blue-600/30">
          {roleLabel}
        </Badge>
        {onSwitchApp && (
          <Button
            size="sm"
            onClick={onSwitchApp}
            className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/10"
          >
            <ArrowLeftRight className="h-4 w-4 mr-2" /> Switch App
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => logout()}
          className="w-full text-red-300 hover:bg-red-500/10 hover:text-red-200"
        >
          <LogOut className="h-4 w-4 mr-2" /> Sign out
        </Button>
      </div>
    </aside>
  );
};
