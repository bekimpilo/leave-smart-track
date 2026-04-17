import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, Plus, Trash2, Settings, Users } from "lucide-react";
import { travelService, PerDiemRate, ProjectId, ExpenseCategory, TravelRole } from "@/services/travelService";
import { useToast } from "@/hooks/use-toast";

const TRAVEL_ROLES: TravelRole[] = ['employee','manager','office_coordinator','finance_admin','admin'];

export const AdminTravelConfig = () => {
  const { toast } = useToast();
  // Per Diem
  const [rates, setRates] = useState<PerDiemRate[]>([]);
  const [newRate, setNewRate] = useState({ region: '', meal_type: 'Full Day' as 'Full Day'|'Half Day', amount: '', currency: 'ZAR' });
  const rateFileRef = useRef<HTMLInputElement>(null);

  // Projects
  const [projects, setProjects] = useState<ProjectId[]>([]);
  const [newProject, setNewProject] = useState({ project_code: '', description: '' });
  const projectFileRef = useRef<HTMLInputElement>(null);

  // Categories
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const catFileRef = useRef<HTMLInputElement>(null);

  // Users / roles
  const [users, setUsers] = useState<any[]>([]);

  const reload = async () => {
    const [r, p, c, u] = await Promise.all([
      travelService.listPerDiem(),
      travelService.listProjectIds(),
      travelService.listCategories(),
      travelService.getUsersTravelRoles(),
    ]);
    setRates(r?.rates || []);
    setProjects(p?.projects || []);
    setCategories(c?.categories || []);
    setUsers(u?.users || []);
  };
  useEffect(() => { reload(); }, []);

  // Per Diem actions
  const addRate = async () => {
    if (!newRate.region || !newRate.amount) return toast({ title: 'Region and amount required', variant: 'destructive' });
    const r = await travelService.upsertPerDiem({ region: newRate.region, meal_type: newRate.meal_type, amount: Number(newRate.amount), currency: newRate.currency });
    if (!r?.success) return toast({ title: 'Failed', description: r?.message, variant: 'destructive' });
    setNewRate({ region: '', meal_type: 'Full Day', amount: '', currency: 'ZAR' });
    reload();
  };
  const delRate = async (id: number) => { await travelService.deletePerDiem(id); reload(); };
  const uploadRateCsv = async (f: File) => {
    const r = await travelService.uploadPerDiemCsv(f);
    if (r?.success) toast({ title: `Imported ${r.inserted || 0} rows` });
    else toast({ title: 'Import failed', description: r?.message, variant: 'destructive' });
    reload();
  };

  // Project actions
  const addProject = async () => {
    if (!newProject.project_code) return toast({ title: 'Code required', variant: 'destructive' });
    await travelService.upsertProjectId(newProject);
    setNewProject({ project_code: '', description: '' });
    reload();
  };
  const delProject = async (id: number) => { await travelService.deleteProjectId(id); reload(); };
  const uploadProjectsCsv = async (f: File) => {
    const r = await travelService.uploadProjectIdsCsv(f);
    if (r?.success) toast({ title: `Imported ${r.inserted || 0} rows` });
    reload();
  };

  // Category actions
  const addCategory = async () => {
    if (!newCategory.name) return toast({ title: 'Name required', variant: 'destructive' });
    await travelService.upsertCategory(newCategory);
    setNewCategory({ name: '', description: '' });
    reload();
  };
  const delCategory = async (id: number) => { await travelService.deleteCategory(id); reload(); };
  const uploadCategoriesCsv = async (f: File) => {
    const r = await travelService.uploadCategoriesCsv(f);
    if (r?.success) toast({ title: `Imported ${r.inserted || 0} rows` });
    reload();
  };

  const setUserRole = async (id: number, role: TravelRole) => {
    const r = await travelService.setUserTravelRole(id, role);
    if (r?.success) { toast({ title: 'Role updated' }); reload(); }
    else toast({ title: 'Failed', description: r?.message, variant: 'destructive' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5" /><h1 className="text-2xl font-bold">System Configuration</h1>
      </div>
      <Tabs defaultValue="per-diem">
        <TabsList>
          <TabsTrigger value="per-diem">Per Diem Rates</TabsTrigger>
          <TabsTrigger value="projects">Project IDs</TabsTrigger>
          <TabsTrigger value="categories">Expense Categories</TabsTrigger>
          <TabsTrigger value="roles">Travel Roles</TabsTrigger>
        </TabsList>

        {/* PER DIEM */}
        <TabsContent value="per-diem">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Per Diem Rates ({rates.length})</CardTitle>
              <div>
                <input type="file" accept=".csv" ref={rateFileRef} hidden onChange={e => e.target.files?.[0] && uploadRateCsv(e.target.files[0])} />
                <Button size="sm" variant="outline" onClick={() => rateFileRef.current?.click()}><Upload className="h-3 w-3 mr-1" /> CSV Upload</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">CSV columns: region, meal_type, amount, currency</p>
              <div className="grid md:grid-cols-5 gap-2 items-end">
                <div><Label className="text-xs">Region</Label><Input placeholder="SA / Africa / Europe …" value={newRate.region} onChange={e => setNewRate({ ...newRate, region: e.target.value })} /></div>
                <div>
                  <Label className="text-xs">Meal Type</Label>
                  <Select value={newRate.meal_type} onValueChange={(v: any) => setNewRate({ ...newRate, meal_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Full Day">Full Day</SelectItem><SelectItem value="Half Day">Half Day</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Amount</Label><Input type="number" value={newRate.amount} onChange={e => setNewRate({ ...newRate, amount: e.target.value })} /></div>
                <div><Label className="text-xs">Currency</Label><Input value={newRate.currency} onChange={e => setNewRate({ ...newRate, currency: e.target.value.toUpperCase() })} /></div>
                <Button onClick={addRate}><Plus className="h-3 w-3 mr-1" /> Save</Button>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Region</TableHead><TableHead>Meal Type</TableHead><TableHead>Amount</TableHead><TableHead>Currency</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {rates.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.region}</TableCell>
                      <TableCell>{r.meal_type}</TableCell>
                      <TableCell>{Number(r.amount).toFixed(2)}</TableCell>
                      <TableCell><Badge variant="outline">{r.currency}</Badge></TableCell>
                      <TableCell className="text-right"><Button size="sm" variant="ghost" className="text-red-600" onClick={() => delRate(r.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROJECTS */}
        <TabsContent value="projects">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Project IDs ({projects.length})</CardTitle>
              <div>
                <input type="file" accept=".csv" ref={projectFileRef} hidden onChange={e => e.target.files?.[0] && uploadProjectsCsv(e.target.files[0])} />
                <Button size="sm" variant="outline" onClick={() => projectFileRef.current?.click()}><Upload className="h-3 w-3 mr-1" /> CSV Upload</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">CSV columns: project_code, description</p>
              <div className="grid md:grid-cols-3 gap-2 items-end">
                <div><Label className="text-xs">Project Code</Label><Input value={newProject.project_code} onChange={e => setNewProject({ ...newProject, project_code: e.target.value })} /></div>
                <div><Label className="text-xs">Description</Label><Input value={newProject.description} onChange={e => setNewProject({ ...newProject, description: e.target.value })} /></div>
                <Button onClick={addProject}><Plus className="h-3 w-3 mr-1" /> Save</Button>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Description</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {projects.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.project_code}</TableCell>
                      <TableCell>{p.description}</TableCell>
                      <TableCell className="text-right"><Button size="sm" variant="ghost" className="text-red-600" onClick={() => delProject(p.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CATEGORIES */}
        <TabsContent value="categories">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Expense Categories ({categories.length})</CardTitle>
              <div>
                <input type="file" accept=".csv" ref={catFileRef} hidden onChange={e => e.target.files?.[0] && uploadCategoriesCsv(e.target.files[0])} />
                <Button size="sm" variant="outline" onClick={() => catFileRef.current?.click()}><Upload className="h-3 w-3 mr-1" /> CSV Upload</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">CSV columns: name, description</p>
              <div className="grid md:grid-cols-3 gap-2 items-end">
                <div><Label className="text-xs">Name</Label><Input value={newCategory.name} onChange={e => setNewCategory({ ...newCategory, name: e.target.value })} /></div>
                <div><Label className="text-xs">Description</Label><Input value={newCategory.description} onChange={e => setNewCategory({ ...newCategory, description: e.target.value })} /></div>
                <Button onClick={addCategory}><Plus className="h-3 w-3 mr-1" /> Save</Button>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Description</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {categories.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.description}</TableCell>
                      <TableCell className="text-right"><Button size="sm" variant="ghost" className="text-red-600" onClick={() => delCategory(c.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ROLES */}
        <TabsContent value="roles">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Travel Roles ({users.length})</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Department</TableHead><TableHead>Travel Role</TableHead></TableRow></TableHeader>
                <TableBody>
                  {users.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{u.email}</TableCell>
                      <TableCell>{u.department}</TableCell>
                      <TableCell>
                        <Select value={u.travel_role} onValueChange={(v: TravelRole) => setUserRole(u.id, v)}>
                          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TRAVEL_ROLES.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
