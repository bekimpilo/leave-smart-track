import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { travelService, travelPdfUrl } from "@/services/travelService";
import { StatusBadge } from "./StatusBadge";
import { FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const CoordinatorQueue = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await travelService.listTravelRequests();
      setRows(r?.requests || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (id: number, status: 'in_progress'|'booked') => {
    try {
      const r = await travelService.setCoordinatorStatus(id, status);
      if (!r?.success) throw new Error(r?.message);
      toast({ title: 'Updated' });
      load();
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Bookings Queue</h1>
      <Card><CardContent className="p-0">
        {loading ? <p className="p-6 text-sm text-muted-foreground">Loading…</p> : rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No approved travel requests to process.</p>
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>#</TableHead><TableHead>Employee</TableHead><TableHead>Destination</TableHead><TableHead>Travel date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">#{r.id}</TableCell>
                  <TableCell className="font-medium">{r.requester_name}</TableCell>
                  <TableCell>{r.place_to_be_visited}</TableCell>
                  <TableCell className="text-xs">{r.date_amount_required ? new Date(r.date_amount_required).toLocaleDateString() : '—'}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button asChild size="sm" variant="ghost" title="View PDF">
                      <a href={travelPdfUrl(r.id)} target="_blank" rel="noopener noreferrer"><FileText className="h-4 w-4" /></a>
                    </Button>
                    {r.status === 'approved' && <Button size="sm" variant="outline" onClick={() => setStatus(r.id, 'in_progress')}>Mark In Progress</Button>}
                    {(r.status === 'approved' || r.status === 'in_progress') && <Button size="sm" className="bg-blue-700 hover:bg-blue-800" onClick={() => setStatus(r.id, 'booked')}>Mark Booked</Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>
    </div>
  );
};
