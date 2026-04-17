import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { travelService, travelPdfUrl } from "@/services/travelService";
import { StatusBadge } from "./StatusBadge";
import { FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const FinanceQueue = () => {
  const { toast } = useToast();
  const [travel, setTravel] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [t, e] = await Promise.all([travelService.listTravelRequests(), travelService.listExpenseClaims()]);
      setTravel(t?.requests || []);
      setExpenses(e?.claims || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const setTravelStatus = async (id: number, status: 'per_diem_paid'|'completed') => {
    try {
      const r = await travelService.setFinanceStatus(id, status);
      if (!r?.success) throw new Error(r?.message);
      toast({ title: 'Updated' }); load();
    } catch (e: any) { toast({ title: 'Failed', description: e.message, variant: 'destructive' }); }
  };

  const markExpensePaid = async (id: number) => {
    try {
      const r = await travelService.markExpensePaid(id);
      if (!r?.success) throw new Error(r?.message);
      toast({ title: 'Marked paid' }); load();
    } catch (e: any) { toast({ title: 'Failed', description: e.message, variant: 'destructive' }); }
  };

  const exportCsv = () => {
    const rows = [['Type','#','Employee','Description','Amount (ZAR)','Status','Created']];
    travel.forEach(r => rows.push(['Travel', r.id, r.requester_name, r.place_to_be_visited, Number(r.total_zar).toFixed(2), r.status, new Date(r.created_at).toLocaleDateString()]));
    expenses.forEach(r => rows.push(['Expense', r.id, r.requester_name, r.purpose, Number(r.total_amount).toFixed(2), r.status, new Date(r.created_at).toLocaleDateString()]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `finance-export-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Finance Queue</h1>
        <Button variant="outline" onClick={exportCsv}>Export CSV</Button>
      </div>
      <Tabs defaultValue="travel">
        <TabsList>
          <TabsTrigger value="travel">Travel Per Diem ({travel.length})</TabsTrigger>
          <TabsTrigger value="expense">Expense Claims ({expenses.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="travel">
          <Card><CardContent className="p-0">
            {loading ? <p className="p-6 text-sm text-muted-foreground">Loading…</p> : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>#</TableHead><TableHead>Employee</TableHead><TableHead>Total ZAR</TableHead><TableHead>Bank</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {travel.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">#{r.id}</TableCell>
                      <TableCell className="font-medium">{r.requester_name}</TableCell>
                      <TableCell>R {Number(r.total_zar).toFixed(2)}</TableCell>
                      <TableCell className="text-xs">{r.bank_name || '—'} {r.account_number ? `· ${r.account_number}` : ''}</TableCell>
                      <TableCell><StatusBadge status={r.status} /></TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button asChild size="sm" variant="ghost" title="View PDF">
                          <a href={travelPdfUrl(r.id)} target="_blank" rel="noopener noreferrer"><FileText className="h-4 w-4" /></a>
                        </Button>
                        {(r.status === 'approved' || r.status === 'booked') && <Button size="sm" className="bg-blue-700 hover:bg-blue-800" onClick={() => setTravelStatus(r.id, 'per_diem_paid')}>Mark Paid</Button>}
                        {r.status === 'per_diem_paid' && <Button size="sm" variant="outline" onClick={() => setTravelStatus(r.id, 'completed')}>Mark Completed</Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="expense">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>#</TableHead><TableHead>Employee</TableHead><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {expenses.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">#{r.id}</TableCell>
                    <TableCell className="font-medium">{r.requester_name}</TableCell>
                    <TableCell className="capitalize">{r.purpose.replace('_',' ')}</TableCell>
                    <TableCell>R {Number(r.total_amount).toFixed(2)}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-right">
                      {r.status === 'approved' && <Button size="sm" className="bg-blue-700 hover:bg-blue-800" onClick={() => markExpensePaid(r.id)}>Mark Paid</Button>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
