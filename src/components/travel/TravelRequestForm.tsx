import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Plane, Car, Hotel, Wallet, User, Building2 } from "lucide-react";
import { travelService, PerDiemRate, ProjectId } from "@/services/travelService";
import { useToast } from "@/hooks/use-toast";

interface Props { currentUser: any; onSubmitted?: () => void; }

interface Flight { from_location: string; to_location: string; flight_date: string; time_from: string; time_to: string; meal_request: string; frequent_flyer_number: string; }
interface PerDiemLine { line_date: string; expense_category: string; amount: number; currency: string; fx_rate: number; amount_zar: number; region: string; }

const REGIONS = ['SA', 'Africa', 'Europe', 'USA', 'Asia'];

export const TravelRequestForm = ({ currentUser, onSubmitted }: Props) => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [rates, setRates] = useState<PerDiemRate[]>([]);
  const [projects, setProjects] = useState<ProjectId[]>([]);
  const [agreed, setAgreed] = useState(false);

  // personal
  const [credential, setCredential] = useState<'MR'|'MRS'|'DR'>('MR');
  const [idPassport, setIdPassport] = useState('');
  const [dob, setDob] = useState('');
  const [projectId1, setProjectId1] = useState('');
  const [projectId2, setProjectId2] = useState('');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [cellphone, setCellphone] = useState('');
  const [purpose, setPurpose] = useState('');
  const [place, setPlace] = useState('');
  const [chaiRole, setChaiRole] = useState('');

  // flights
  const [flights, setFlights] = useState<Flight[]>([
    { from_location: '', to_location: '', flight_date: '', time_from: '', time_to: '', meal_request: '', frequent_flyer_number: '' }
  ]);

  // car rental
  const [carRequired, setCarRequired] = useState(false);
  const [preferredMode, setPreferredMode] = useState<'Manual'|'Automatic'>('Automatic');
  const [totalKilos, setTotalKilos] = useState<number | ''>('');
  const [pickupBranch, setPickupBranch] = useState('');
  const [dropoffBranch, setDropoffBranch] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [dropoffDate, setDropoffDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [dropoffTime, setDropoffTime] = useState('');

  // accommodation
  const [accomRequired, setAccomRequired] = useState(false);
  const [venue, setVenue] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [mealFirst, setMealFirst] = useState(false);
  const [mealFull, setMealFull] = useState(false);
  const [specificMeal, setSpecificMeal] = useState('');

  // per diem
  const [perDiemLines, setPerDiemLines] = useState<PerDiemLine[]>([]);
  const [businessAdvance, setBusinessAdvance] = useState<number>(0);
  const [dateRequired, setDateRequired] = useState('');
  const [disbursementMethod, setDisbursementMethod] = useState<'Bank Details'|'Petty Cash'>('Bank Details');

  // banking
  const [bankName, setBankName] = useState('');
  const [branchNumber, setBranchNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');

  useEffect(() => {
    (async () => {
      const [r, p] = await Promise.all([travelService.listPerDiem(), travelService.listProjectIds()]);
      setRates(r?.rates || []);
      setProjects(p?.projects || []);
    })();
  }, []);

  // expense category options for per diem (e.g. "SA - Full Day")
  const categoryOptions = useMemo(() => rates.map(r => ({
    label: `${r.region} - ${r.meal_type}`,
    value: `${r.region}|${r.meal_type}`,
    rate: r,
  })), [rates]);

  // totals
  const localZar = perDiemLines.filter(l => l.region === 'SA').reduce((s, l) => s + Number(l.amount_zar || 0), 0);
  const otherZar = perDiemLines.filter(l => l.region !== 'SA').reduce((s, l) => s + Number(l.amount_zar || 0), 0);
  const totalZar = localZar + otherZar + Number(businessAdvance || 0);

  const addFlight = () => setFlights([...flights, { from_location: '', to_location: '', flight_date: '', time_from: '', time_to: '', meal_request: '', frequent_flyer_number: '' }]);
  const removeFlight = (i: number) => setFlights(flights.filter((_, idx) => idx !== i));
  const updateFlight = (i: number, k: keyof Flight, v: string) => setFlights(flights.map((f, idx) => idx === i ? { ...f, [k]: v } : f));

  const addPerDiem = () => setPerDiemLines([...perDiemLines, { line_date: '', expense_category: '', amount: 0, currency: 'ZAR', fx_rate: 1, amount_zar: 0, region: 'SA' }]);
  const removePerDiem = (i: number) => setPerDiemLines(perDiemLines.filter((_, idx) => idx !== i));
  const updatePerDiem = (i: number, patch: Partial<PerDiemLine>) => {
    setPerDiemLines(prev => prev.map((l, idx) => {
      if (idx !== i) return l;
      const merged = { ...l, ...patch };
      // recompute ZAR if currency!=ZAR
      const amt = Number(merged.amount || 0);
      const fx = Number(merged.fx_rate || 1);
      merged.amount_zar = merged.currency === 'ZAR' ? amt : amt * fx;
      return merged;
    }));
  };

  const onCategoryChange = (i: number, value: string) => {
    const opt = categoryOptions.find(o => o.value === value);
    if (!opt) return updatePerDiem(i, { expense_category: value });
    updatePerDiem(i, {
      expense_category: `${opt.rate.region} - ${opt.rate.meal_type}`,
      region: opt.rate.region,
      currency: opt.rate.currency,
      amount: Number(opt.rate.amount),
      fx_rate: opt.rate.currency === 'ZAR' ? 1 : 0,
      amount_zar: opt.rate.currency === 'ZAR' ? Number(opt.rate.amount) : 0,
    });
  };

  const submit = async () => {
    if (!agreed) return toast({ title: 'Please accept terms', variant: 'destructive' });
    if (!idPassport || !dob || !projectId1 || !cellphone || !purpose || !place || !chaiRole) {
      return toast({ title: 'Fill required fields', variant: 'destructive' });
    }
    if (flights.length === 0 || flights.some(f => !f.from_location || !f.to_location || !f.flight_date)) {
      return toast({ title: 'Add at least one complete flight', variant: 'destructive' });
    }
    setSubmitting(true);
    try {
      const body = {
        credential, id_passport: idPassport, date_of_birth: dob,
        project_id_1: projectId1, project_id_2: projectId2 || null,
        email, cellphone, purpose_of_travel: purpose, place_to_be_visited: place, chai_role: chaiRole,
        flights,
        car_rental: carRequired ? {
          required: true, preferred_mode: preferredMode, total_kilos_estimated: totalKilos || null,
          pickup_branch: pickupBranch, dropoff_branch: dropoffBranch,
          pickup_date: pickupDate, dropoff_date: dropoffDate,
          pickup_time: pickupTime, dropoff_time: dropoffTime,
        } : null,
        accommodation: accomRequired ? {
          required: true, venue, check_in_date: checkIn, check_out_date: checkOut,
          meal_first_day: mealFirst, meal_full_duration: mealFull, specific_meal_request: specificMeal,
        } : null,
        per_diem_lines: perDiemLines,
        business_advance_zar: businessAdvance,
        date_amount_required: dateRequired || null,
        disbursement_method: disbursementMethod,
        bank_name: bankName, branch_number: branchNumber, account_number: accountNumber, account_name: accountName,
      };
      const r = await travelService.createTravelRequest(body);
      if (!r?.success) throw new Error(r?.message || 'Submit failed');
      toast({ title: 'Travel request submitted', description: `Request #${r.id} sent for approval.` });
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
        <h1 className="text-2xl font-bold">Travel & Business Advance Authorisation</h1>
        <p className="text-muted-foreground text-sm">Complete all sections below.</p>
      </div>

      {/* Personal Info */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4" /> Personal Information</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <div><Label>Requester Name *</Label><Input value={currentUser?.name || ''} disabled /></div>
          <div>
            <Label>Credential *</Label>
            <Select value={credential} onValueChange={(v: any) => setCredential(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="MR">MR</SelectItem><SelectItem value="MRS">MRS</SelectItem><SelectItem value="DR">DR</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>ID/Passport *</Label><Input value={idPassport} onChange={e => setIdPassport(e.target.value)} /></div>
          <div><Label>Date of Birth *</Label><Input type="date" value={dob} onChange={e => setDob(e.target.value)} /></div>
          <div>
            <Label>Project ID 1 *</Label>
            <Select value={projectId1} onValueChange={setProjectId1}>
              <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
              <SelectContent>
                {projects.length === 0 && <SelectItem value="__none" disabled>No projects configured</SelectItem>}
                {projects.map(p => <SelectItem key={p.id} value={p.project_code}>{p.project_code}{p.description ? ` — ${p.description}` : ''}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Project ID 2</Label>
            <Select value={projectId2} onValueChange={setProjectId2}>
              <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">— None —</SelectItem>
                {projects.map(p => <SelectItem key={p.id} value={p.project_code}>{p.project_code}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Email *</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div><Label>Cellphone *</Label><Input value={cellphone} onChange={e => setCellphone(e.target.value)} /></div>
          <div><Label>CHAI Role *</Label><Input value={chaiRole} onChange={e => setChaiRole(e.target.value)} /></div>
          <div className="md:col-span-3"><Label>Purpose of Travel *</Label><Textarea value={purpose} onChange={e => setPurpose(e.target.value)} /></div>
          <div className="md:col-span-3"><Label>Place to be Visited *</Label><Input value={place} onChange={e => setPlace(e.target.value)} /></div>
        </CardContent>
      </Card>

      {/* Flights */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base"><Plane className="h-4 w-4" /> Flight Details</CardTitle>
          <Button size="sm" variant="outline" onClick={addFlight}><Plus className="h-3 w-3 mr-1" /> Add flight</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {flights.map((f, i) => (
            <div key={i} className="grid md:grid-cols-7 gap-2 items-end p-3 border rounded-lg">
              <div><Label className="text-xs">From *</Label><Input value={f.from_location} onChange={e => updateFlight(i, 'from_location', e.target.value)} /></div>
              <div><Label className="text-xs">To *</Label><Input value={f.to_location} onChange={e => updateFlight(i, 'to_location', e.target.value)} /></div>
              <div><Label className="text-xs">Date *</Label><Input type="date" value={f.flight_date} onChange={e => updateFlight(i, 'flight_date', e.target.value)} /></div>
              <div><Label className="text-xs">From time</Label><Input type="time" value={f.time_from} onChange={e => updateFlight(i, 'time_from', e.target.value)} /></div>
              <div><Label className="text-xs">To time</Label><Input type="time" value={f.time_to} onChange={e => updateFlight(i, 'time_to', e.target.value)} /></div>
              <div><Label className="text-xs">FF #</Label><Input value={f.frequent_flyer_number} onChange={e => updateFlight(i, 'frequent_flyer_number', e.target.value)} /></div>
              <Button size="sm" variant="ghost" onClick={() => removeFlight(i)} className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
              <div className="md:col-span-7"><Label className="text-xs">Special meal request</Label><Input value={f.meal_request} onChange={e => updateFlight(i, 'meal_request', e.target.value)} /></div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Car Rental */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Car className="h-4 w-4" /> Car Rental / Shuttle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2"><Checkbox checked={carRequired} onCheckedChange={v => setCarRequired(!!v)} /> Required</label>
          {carRequired && (
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Preferred Mode *</Label>
                <Select value={preferredMode} onValueChange={(v: any) => setPreferredMode(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Manual">Manual</SelectItem><SelectItem value="Automatic">Automatic</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Estimated Kilos</Label><Input type="number" value={totalKilos} onChange={e => setTotalKilos(e.target.value as any)} /></div>
              <div /></div>
          )}
          {carRequired && (
            <div className="grid md:grid-cols-2 gap-4">
              <div><Label>Pick-up Branch *</Label><Input value={pickupBranch} onChange={e => setPickupBranch(e.target.value)} /></div>
              <div><Label>Drop-off Branch *</Label><Input value={dropoffBranch} onChange={e => setDropoffBranch(e.target.value)} /></div>
              <div><Label>Pick-up Date *</Label><Input type="date" value={pickupDate} onChange={e => setPickupDate(e.target.value)} /></div>
              <div><Label>Drop-off Date *</Label><Input type="date" value={dropoffDate} onChange={e => setDropoffDate(e.target.value)} /></div>
              <div><Label>Pick-up Time *</Label><Input type="time" value={pickupTime} onChange={e => setPickupTime(e.target.value)} /></div>
              <div><Label>Drop-off Time *</Label><Input type="time" value={dropoffTime} onChange={e => setDropoffTime(e.target.value)} /></div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accommodation */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Hotel className="h-4 w-4" /> Accommodation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2"><Checkbox checked={accomRequired} onCheckedChange={v => setAccomRequired(!!v)} /> Required</label>
          {accomRequired && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2"><Label>Venue (City, Suburb, Hotel) *</Label><Input value={venue} onChange={e => setVenue(e.target.value)} /></div>
              <div><Label>Check-in *</Label><Input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} /></div>
              <div><Label>Check-out *</Label><Input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} /></div>
              <label className="flex items-center gap-2"><Checkbox checked={mealFirst} onCheckedChange={v => setMealFirst(!!v)} /> Meal on first day</label>
              <label className="flex items-center gap-2"><Checkbox checked={mealFull} onCheckedChange={v => setMealFull(!!v)} /> Meals for full duration</label>
              <div className="md:col-span-2"><Label>Specific meal request</Label><Input value={specificMeal} onChange={e => setSpecificMeal(e.target.value)} /></div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per Diem */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base"><Wallet className="h-4 w-4" /> Travel Per Diem</CardTitle>
          <Button size="sm" variant="outline" onClick={addPerDiem}><Plus className="h-3 w-3 mr-1" /> Add line</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {perDiemLines.length === 0 && <p className="text-sm text-muted-foreground">No per diem lines yet.</p>}
          {perDiemLines.map((l, i) => (
            <div key={i} className="grid md:grid-cols-8 gap-2 items-end p-3 border rounded-lg">
              <div className="md:col-span-2"><Label className="text-xs">Date *</Label><Input type="date" value={l.line_date} onChange={e => updatePerDiem(i, { line_date: e.target.value })} /></div>
              <div className="md:col-span-2">
                <Label className="text-xs">Category *</Label>
                <Select value={categoryOptions.find(o => `${o.rate.region} - ${o.rate.meal_type}` === l.expense_category)?.value || ''} onValueChange={v => onCategoryChange(i, v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{categoryOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label} ({o.rate.currency} {Number(o.rate.amount).toFixed(2)})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Amount</Label><Input type="number" value={l.amount} onChange={e => updatePerDiem(i, { amount: Number(e.target.value) })} /></div>
              <div><Label className="text-xs">Curr.</Label><Input value={l.currency} onChange={e => updatePerDiem(i, { currency: e.target.value.toUpperCase() })} /></div>
              <div><Label className="text-xs">FX → ZAR</Label><Input type="number" step="0.0001" value={l.fx_rate} onChange={e => updatePerDiem(i, { fx_rate: Number(e.target.value) })} disabled={l.currency === 'ZAR'} /></div>
              <div><Label className="text-xs">ZAR</Label><Input value={Number(l.amount_zar).toFixed(2)} disabled /></div>
              <Button size="sm" variant="ghost" onClick={() => removePerDiem(i)} className="text-red-600 md:col-span-8 justify-self-end"><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}

          <Separator />

          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div><Label>Per Diem Local (ZAR)</Label><Input value={`R ${localZar.toFixed(2)}`} disabled /></div>
            <div><Label>Per Diem Other (ZAR)</Label><Input value={`R ${otherZar.toFixed(2)}`} disabled /></div>
            <div><Label>Business Advance (ZAR)</Label><Input type="number" value={businessAdvance} onChange={e => setBusinessAdvance(Number(e.target.value))} /></div>
            <div className="md:col-span-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <div className="flex justify-between text-base font-semibold text-emerald-900">
                <span>Total Requested (1+2+3)</span>
                <span>R {totalZar.toFixed(2)}</span>
              </div>
            </div>
            <div><Label>Date Amount Required</Label><Input type="date" value={dateRequired} onChange={e => setDateRequired(e.target.value)} /></div>
            <div>
              <Label>Disbursement Method</Label>
              <Select value={disbursementMethod} onValueChange={(v: any) => setDisbursementMethod(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Bank Details">Bank Details</SelectItem><SelectItem value="Petty Cash">Petty Cash</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Banking */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4" /> Banking Details</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div><Label>Bank Name</Label><Input value={bankName} onChange={e => setBankName(e.target.value)} /></div>
          <div><Label>Branch Number</Label><Input value={branchNumber} onChange={e => setBranchNumber(e.target.value)} /></div>
          <div><Label>Account Number</Label><Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} /></div>
          <div><Label>Account Name</Label><Input value={accountName} onChange={e => setAccountName(e.target.value)} /></div>
        </CardContent>
      </Card>

      {/* Terms */}
      <Card>
        <CardContent className="p-4 space-y-3 text-xs text-muted-foreground">
          <p><strong>Early Return & Acquittal:</strong> Per-diem must be returned within 5 days of early return. Travel advance acquittal must be submitted within 5 days of completion. Failure to comply authorises CHAI to deduct from future reimbursements or payroll.</p>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox checked={agreed} onCheckedChange={v => setAgreed(!!v)} /> I agree to the terms above
          </label>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2 sticky bottom-4">
        <Button onClick={submit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
          {submitting ? 'Submitting…' : 'Submit Travel Request'}
        </Button>
      </div>
    </div>
  );
};
