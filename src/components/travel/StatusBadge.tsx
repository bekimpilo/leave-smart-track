import { Badge } from "@/components/ui/badge";
import { TravelStatus, ExpenseStatus } from "@/services/travelService";

const colors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  approved: "bg-blue-100 text-blue-900 border-blue-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-gray-100 text-gray-700 border-gray-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  booked: "bg-indigo-100 text-indigo-800 border-indigo-200",
  per_diem_paid: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-blue-100 text-blue-950 border-blue-300",
  paid: "bg-blue-100 text-blue-900 border-blue-200",
};

export const StatusBadge = ({ status }: { status: TravelStatus | ExpenseStatus | string }) => {
  const cls = colors[status] || "bg-gray-100 text-gray-700 border-gray-200";
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return <Badge variant="outline" className={cls}>{label}</Badge>;
};
