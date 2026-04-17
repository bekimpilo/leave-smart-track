import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, Trash2, FileText, Upload, Loader2 } from "lucide-react";
import { travelService, travelFileUrl } from "@/services/travelService";
import { useToast } from "@/hooks/use-toast";

interface Props {
  kind: "travel" | "expense";
  recordId: number;
  canEdit?: boolean;
}

interface Attachment {
  id: number;
  original_name: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
}

const formatBytes = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

export const AttachmentManager = ({ kind, recordId, canEdit = true }: Props) => {
  const { toast } = useToast();
  const [items, setItems] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = kind === "travel"
        ? await travelService.listTravelAttachments(recordId)
        : await travelService.listExpenseAttachments(recordId);
      setItems(r?.attachments || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { if (recordId) load(); /* eslint-disable-next-line */ }, [recordId, kind]);

  const onUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      return toast({ title: "File too large", description: "Max 10 MB", variant: "destructive" });
    }
    setUploading(true);
    try {
      const r = kind === "travel"
        ? await travelService.uploadTravelAttachment(recordId, file)
        : await travelService.uploadExpenseAttachment(recordId, file);
      if (!r?.success) throw new Error(r?.message || "Upload failed");
      toast({ title: "File uploaded" });
      load();
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onDelete = async (id: number) => {
    if (!confirm("Delete this attachment?")) return;
    try {
      const r = kind === "travel"
        ? await travelService.deleteTravelAttachment(id)
        : await travelService.deleteExpenseAttachment(id);
      if (!r?.success) throw new Error(r?.message);
      toast({ title: "Deleted" });
      load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Paperclip className="h-4 w-4" /> Attachments {items.length > 0 && <span className="text-muted-foreground">({items.length})</span>}
        </div>
        {canEdit && (
          <>
            <input
              ref={fileRef}
              type="file"
              hidden
              onChange={e => e.target.files?.[0] && onUpload(e.target.files[0])}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.txt"
            />
            <Button size="sm" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
              Upload
            </Button>
          </>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No files attached.</p>
      ) : (
        <div className="space-y-1.5">
          {items.map(a => (
            <div key={a.id} className="flex items-center justify-between p-2 bg-muted/40 rounded-md text-sm">
              <a
                href={travelFileUrl(kind, a.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary hover:underline truncate flex-1 min-w-0"
              >
                <FileText className="h-4 w-4 shrink-0" />
                <span className="truncate">{a.original_name}</span>
                <span className="text-xs text-muted-foreground ml-2 shrink-0">{formatBytes(a.file_size)}</span>
              </a>
              {canEdit && (
                <Button size="sm" variant="ghost" onClick={() => onDelete(a.id)} className="text-destructive h-7 w-7 p-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
