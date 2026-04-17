import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plane, Receipt, Clock, CheckCircle2, XCircle } from "lucide-react";
import { travelService, TravelRequestRow, ExpenseClaimRow } from "@/services/travelService";
import { StatusBadge } from "./StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface Props { currentUser: any; onNavigate: (tab: string) => void; }

export const TravelDashboard = ({ currentUser, onNavigate }: Props) => {
  const [travel, setTravel] = useState<TravelRequestRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseClaimRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [t, e] = await Promise.all([
          travelService.listTravelRequests(),
          travelService.listExpenseClaims(),
        ]);
        setTravel(t?.requests || []);
        setExpenses(e?.claims || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const myTravel = travel.filter(t => t.requester_email === currentUser?.email);
  const myExp = expenses.filter(e => e.requester_email === currentUser?.email);

  const stats = [
    { label: 'My Travel Requests', value: myTravel.length, icon: Plane, color: 'text-blue-700 bg-blue-100' },
    { label: 'Pending Approval', value: myTravel.filter(t => t.status === 'pending').length, icon: Clock, color: 'text-amber-600 bg-amber-100' },
    { label: 'Approved', value: myTravel.filter(t => ['approved','in_progress','booked','per_diem_paid','completed'].includes(t.status)).length, icon: CheckCircle2, color: 'text-blue-600 bg-blue-100' },
    { label: 'My Expense Claims', value: myExp.length, icon: Receipt, color: 'text-purple-600 bg-purple-100' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome, {currentUser?.name?.split(' ')[0]}</h1>
          <p className="text-muted-foreground text-sm">Manage travel requests and expense claims.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => onNavigate('new-travel')} className="bg-blue-700 hover:bg-blue-800">
            <Plane className="h-4 w-4 mr-2" /> New Travel
          </Button>
          <Button onClick={() => onNavigate('new-expense')} variant="outline">
            <Receipt className="h-4 w-4 mr-2" /> New Expense
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map(s => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{s.label}</p>
                  <p className="text-2xl font-bold mt-1">{s.value}</p>
                </div>
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Travel Requests</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : myTravel.length === 0 ? (
            <p className="text-sm text-muted-foreground">No travel requests yet.</p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Destination</TableHead><TableHead>Purpose</TableHead>
                <TableHead>Total (ZAR)</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {myTravel.slice(0, 5).map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.place_to_be_visited}</TableCell>
                    <TableCell className="max-w-xs truncate">{t.purpose_of_travel}</TableCell>
                    <TableCell>R {Number(t.total_zar).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell><StatusBadge status={t.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
