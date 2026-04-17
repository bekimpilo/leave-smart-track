import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Receipt, Car, FileSpreadsheet } from "lucide-react";
import { travelService, ProjectId, ExpenseCategory } from "@/services/travelService";
import { useToast } from "@/hooks/use-toast";

interface Props { currentUser: any; onSubmitted?: () => void; }

interface Line { expense_date: string; location: string; project_id: string; expense_category: string; receipt_amount: number; description: string; manual_receipt_vendor?: string; manual_receipt_purpose?: string; manual_receipt_signature?: string; }
interface Mileage { travel_date_from: string; travel_date_to: string; opening_km: number; closing_km: number; total_km: number; private_km: number; business_km: number; business_details: string; }

export const ExpenseClaimForm = ({ currentUser, onSubmitted }: Props) => {
  const { toast } = useToast();
  const [purpose, setPurpose] = useState<'reimbursement'|'advance_acquittal'>('reimbursement');
  const [submitting, setSubmitting] = useState(false);

  const [projects, setProjects] = useState<ProjectId[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);

  const [lines, setLines] = useState<Line[]>([
    { expense_date: '', location: '', project_id: '', expense_category: '', receipt_amount: 0, description: '' }
  ]);
  const [mileage, setMileage] = useState<Mileage[]>([]);

  useEffect(() => {
    (async () => {
      const [p, c] = await Promise.all([travelService.listProjectIds(), travelService.listCategories()]);
      setProjects(p?.projects || []);
      setCategories(c?.categories || []);
    })();
  }, []);

  const total = useMemo(() => lines.reduce((s, l) => s + Number(l.receipt_amount || 0), 0), [lines]);

  const addLine = () => setLines([...lines, { expense_date: '', location: '', project_id: '', expense_category: '', receipt_amount: 0, description: '' }]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
  const updateLine = (i: number, patch: Partial<Line>) => setLines(lines.map((l, idx) => idx === i ? { ...l, ...patch } : l));

  const addMileage = () => setMileage([...mileage, { travel_date_from: '', travel_date_to: '', opening_km: 0, closing_km: 0, total_km: 0, private_km: 0, business_km: 0, business_details: '' }]);
  const removeMileage = (i: number) => setMileage(mileage.filter((_, idx) => idx !== i));
  const updateMileage = (i: number, patch: Partial<Mileage>) => setMileage(mileage.map((m, idx) => {
    if (idx !== i) return m;
    const merged = { ...m, ...patch };
    merged.total_km = Math.max(0, Number(merged.closing_km || 0) - Number(merged.opening_km || 0));
    merged.business_km = Math.max(0, merged.total_km - Number(merged.private_km || 0));
    return merged;
  }));

  const submit = async () => {
    if (lines.length === 0 || lines.some(l => !l.expense_date || !l.receipt_amount)) {
      return toast({ title: 'Add at least one valid expense line', variant: 'destructive' });
    }
    setSubmitting(true);
    try {
      const r = await travelService.createExpenseClaim({ purpose, lines, mileage });
      if (!r?.success) throw new Error(r?.message || 'Submit failed');
      toast({ title: 'Expense claim submitted', description: `Claim #${r.id} sent for approval.` });
      onSubmitted?.();
    } catch (e: any) {
      toast({ title: 'Submission failed', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Expense Claim Form</h1>
        <p className="text-muted-foreground text-sm">Submit a reimbursement or acquittal of an advance.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Receipt className="h-4 w-4" /> Purpose</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Purpose of Claim *</Label>
            <Select value={purpose} onValueChange={(v: any) => setPurpose(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="reimbursement">Reimbursement</SelectItem>
                <SelectItem value="advance_acquittal">Advance Acquittal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><FileSpreadsheet className="h-4 w-4" /> Expense Lines</CardTitle>
          <Button size="sm" variant="outline" onClick={addLine}><Plus className="h-3 w-3 mr-1" /> Add line</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {lines.map((l, i) => (
            <div key={i} className="grid md:grid-cols-7 gap-2 items-end p-3 border rounded-lg">
              <div className="md:col-span-1"><Label className="text-xs">No.</Label><Input value={i + 1} disabled /></div>
              <div className="md:col-span-1"><Label className="text-xs">Date *</Label><Input type="date" value={l.expense_date} onChange={e => updateLine(i, { expense_date: e.target.value })} /></div>
              <div className="md:col-span-1"><Label className="text-xs">Location</Label><Input value={l.location} onChange={e => updateLine(i, { location: e.target.value })} /></div>
              <div className="md:col-span-1">
                <Label className="text-xs">Project</Label>
                <Select value={l.project_id} onValueChange={v => updateLine(i, { project_id: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.project_code}>{p.project_code}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="md:col-span-1">
                <Label className="text-xs">Category</Label>
                <Select value={l.expense_category} onValueChange={v => updateLine(i, { expense_category: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {categories.length === 0 && <SelectItem value="__none" disabled>None configured</SelectItem>}
                    {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-1"><Label className="text-xs">Amount (ZAR) *</Label><Input type="number" value={l.receipt_amount} onChange={e => updateLine(i, { receipt_amount: Number(e.target.value) })} /></div>
              <Button size="sm" variant="ghost" onClick={() => removeLine(i)} className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
              <div className="md:col-span-7"><Label className="text-xs">Description (business purpose; for meals: names + reason)</Label><Textarea value={l.description} onChange={e => updateLine(i, { description: e.target.value })} rows={2} /></div>
              <div className="md:col-span-7 grid md:grid-cols-3 gap-2 pt-2 border-t">
                <p className="md:col-span-3 text-xs text-muted-foreground">Manual receipt (only if no invoice attached):</p>
                <div><Label className="text-xs">Vendor</Label><Input value={l.manual_receipt_vendor || ''} onChange={e => updateLine(i, { manual_receipt_vendor: e.target.value })} /></div>
                <div><Label className="text-xs">Purpose</Label><Input value={l.manual_receipt_purpose || ''} onChange={e => updateLine(i, { manual_receipt_purpose: e.target.value })} /></div>
                <div><Label className="text-xs">Signature</Label><Input value={l.manual_receipt_signature || ''} onChange={e => updateLine(i, { manual_receipt_signature: e.target.value })} /></div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Car className="h-4 w-4" /> Mileage Log (Private Vehicle)</CardTitle>
          <Button size="sm" variant="outline" onClick={addMileage}><Plus className="h-3 w-3 mr-1" /> Add trip</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {mileage.length === 0 && <p className="text-sm text-muted-foreground">Optional — only for travel claims when using a private vehicle.</p>}
          {mileage.map((m, i) => (
            <div key={i} className="grid md:grid-cols-8 gap-2 items-end p-3 border rounded-lg">
              <div><Label className="text-xs">From *</Label><Input type="date" value={m.travel_date_from} onChange={e => updateMileage(i, { travel_date_from: e.target.value })} /></div>
              <div><Label className="text-xs">To *</Label><Input type="date" value={m.travel_date_to} onChange={e => updateMileage(i, { travel_date_to: e.target.value })} /></div>
              <div><Label className="text-xs">Opening km *</Label><Input type="number" value={m.opening_km} onChange={e => updateMileage(i, { opening_km: Number(e.target.value) })} /></div>
              <div><Label className="text-xs">Closing km *</Label><Input type="number" value={m.closing_km} onChange={e => updateMileage(i, { closing_km: Number(e.target.value) })} /></div>
              <div><Label className="text-xs">Total km</Label><Input value={m.total_km} disabled /></div>
              <div><Label className="text-xs">Private km</Label><Input type="number" value={m.private_km} onChange={e => updateMileage(i, { private_km: Number(e.target.value) })} /></div>
              <div><Label className="text-xs">Business km</Label><Input value={m.business_km} disabled /></div>
              <Button size="sm" variant="ghost" onClick={() => removeMileage(i)} className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
              <div className="md:col-span-8"><Label className="text-xs">Business Details (where, reason)</Label><Input value={m.business_details} onChange={e => updateMileage(i, { business_details: e.target.value })} /></div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center text-base font-semibold p-3 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200">
            <span>Total {purpose === 'advance_acquittal' ? 'Advance' : 'Reimbursement'}</span>
            <span>R {total.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={submit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
          {submitting ? 'Submitting…' : 'Submit Claim'}
        </Button>
      </div>
    </div>
  );
};
