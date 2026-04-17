import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { travelService } from "@/services/travelService";
import { StatusBadge } from "./StatusBadge";
import { useToast } from "@/hooks/use-toast";

interface Props { currentUser: any; }

export const ManagerApprovals = ({ currentUser }: Props) => {
  const { toast } = useToast();
  const [travel, setTravel] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [decisionTarget, setDecisionTarget] = useState<{ kind: 'travel'|'expense'; id: number; action: 'approve'|'reject' } | null>(null);
  const [comment, setComment] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [t, e] = await Promise.all([travelService.listTravelRequests(), travelService.listExpenseClaims()]);
      // only show records where I'm the manager and status is pending
      setTravel((t?.requests || []).filter((r: any) => r.manager_email === currentUser?.email && r.status === 'pending'));
      setExpenses((e?.claims || []).filter((r: any) => r.manager_email === currentUser?.email && r.status === 'pending'));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [currentUser?.email]);

  const submitDecision = async () => {
    if (!decisionTarget) return;
    if (decisionTarget.action === 'reject' && !comment.trim()) {
      return toast({ title: 'Reason required for rejection', variant: 'destructive' });
    }
    try {
      const r = decisionTarget.kind === 'travel'
        ? await travelService.decideTravelRequest(decisionTarget.id, decisionTarget.action, comment)
        : await travelService.decideExpenseClaim(decisionTarget.id, decisionTarget.action, comment);
      if (!r?.success) throw new Error(r?.message);
      toast({ title: `Request ${decisionTarget.action}d` });
      setDecisionTarget(null);
      setComment('');
      load();
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Approvals</h1>
      <Tabs defaultValue="travel">
        <TabsList>
          <TabsTrigger value="travel">Travel ({travel.length})</TabsTrigger>
          <TabsTrigger value="expense">Expense ({expenses.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="travel">
          <Card><CardContent className="p-0">
            {loading ? <p className="p-6 text-sm text-muted-foreground">Loading…</p> : travel.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No pending travel requests.</p>
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>#</TableHead><TableHead>Employee</TableHead><TableHead>Destination</TableHead><TableHead>Total</TableHead><TableHead>Created</TableHead><TableHead className="text-right">Decision</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {travel.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">#{r.id}</TableCell>
                      <TableCell className="font-medium">{r.requester_name}</TableCell>
                      <TableCell>{r.place_to_be_visited}</TableCell>
                      <TableCell>R {Number(r.total_zar).toFixed(2)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setDecisionTarget({ kind: 'travel', id: r.id, action: 'approve' })}>Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => setDecisionTarget({ kind: 'travel', id: r.id, action: 'reject' })}>Reject</Button>
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
            {expenses.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No pending expense claims.</p> : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>#</TableHead><TableHead>Employee</TableHead><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead className="text-right">Decision</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {expenses.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">#{r.id}</TableCell>
                      <TableCell className="font-medium">{r.requester_name}</TableCell>
                      <TableCell className="capitalize">{r.purpose.replace('_',' ')}</TableCell>
                      <TableCell>R {Number(r.total_amount).toFixed(2)}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setDecisionTarget({ kind: 'expense', id: r.id, action: 'approve' })}>Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => setDecisionTarget({ kind: 'expense', id: r.id, action: 'reject' })}>Reject</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!decisionTarget} onOpenChange={o => { if (!o) { setDecisionTarget(null); setComment(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{decisionTarget?.action === 'approve' ? 'Approve Request' : 'Reject Request'}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Comment {decisionTarget?.action === 'reject' && <span className="text-red-600">*</span>}</Label>
            <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder={decisionTarget?.action === 'approve' ? 'Optional comment' : 'Required reason for rejection'} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecisionTarget(null)}>Cancel</Button>
            <Button className={decisionTarget?.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'} onClick={submitDecision}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
