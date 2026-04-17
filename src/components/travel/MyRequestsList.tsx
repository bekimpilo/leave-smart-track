import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { travelService, TravelRequestRow, ExpenseClaimRow } from "@/services/travelService";
import { StatusBadge } from "./StatusBadge";
import { useToast } from "@/hooks/use-toast";

type Mode = 'travel' | 'expense';
interface Props { mode: Mode; currentUser: any; }

export const MyRequestsList = ({ mode, currentUser }: Props) => {
  const { toast } = useToast();
  const [rows, setRows] = useState<(TravelRequestRow | ExpenseClaimRow)[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = mode === 'travel' ? await travelService.listTravelRequests() : await travelService.listExpenseClaims();
      const all = mode === 'travel' ? (r?.requests || []) : (r?.claims || []);
      setRows(all.filter((x: any) => x.requester_email === currentUser?.email));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [mode, currentUser?.email]);

  const cancel = async (id: number) => {
    try {
      const r = mode === 'travel' ? await travelService.cancelTravelRequest(id) : await travelService.cancelExpenseClaim(id);
      if (!r?.success) throw new Error(r?.message);
      toast({ title: 'Cancelled' });
      load();
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{mode === 'travel' ? 'My Travel Requests' : 'My Expense Claims'}</h1>
      <Card>
        <CardContent className="p-0">
          {loading ? <p className="p-6 text-sm text-muted-foreground">Loading…</p> : rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No records yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {mode === 'travel' ? <>
                    <TableHead>#</TableHead><TableHead>Destination</TableHead><TableHead>Purpose</TableHead><TableHead>Total</TableHead>
                  </> : <>
                    <TableHead>#</TableHead><TableHead>Type</TableHead><TableHead>Amount</TableHead>
                  </>}
                  <TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">#{r.id}</TableCell>
                    {mode === 'travel' ? <>
                      <TableCell className="font-medium">{r.place_to_be_visited}</TableCell>
                      <TableCell className="max-w-xs truncate">{r.purpose_of_travel}</TableCell>
                      <TableCell>R {Number(r.total_zar).toFixed(2)}</TableCell>
                    </> : <>
                      <TableCell className="capitalize">{(r.purpose || '').replace('_', ' ')}</TableCell>
                      <TableCell>R {Number(r.total_amount).toFixed(2)}</TableCell>
                    </>}
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      {r.status === 'pending' && (
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => cancel(r.id)}>Cancel</Button>
                      )}
                    </TableCell>
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
