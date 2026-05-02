/**
 * ContactImportDialogV2.tsx
 * CSV bulk import dialog — Edge Function contacts-import.
 * Up to 50k contacts per file.
 */
import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, CheckCircle2, XCircle, AlertTriangle, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeText } from '@/lib/sanitize';

interface ImportResult { inserted: number; updated: number; skipped: number; errors: Array<{row:number;error:string}>; total_processed: number; }

async function parseCsvToRows(file: File): Promise<Array<Record<string, string>>> {
  const text = await file.text();
  const clean = text.startsWith('\uFEFF') ? text.slice(1) : text;
  const lines = clean.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const parseRow = (row: string): string[] => {
    const cells: string[] = []; let cur = ''; let inQ = false;
    for (let i = 0; i < row.length; i++) {
      if (row[i] === '"') { if (inQ && row[i+1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
      else if (row[i] === ',' && !inQ) { cells.push(cur); cur = ''; } else cur += row[i];
    }
    cells.push(cur); return cells;
  };
  const headers = parseRow(lines[0]);
  return lines.slice(1).map((line) => Object.fromEntries(headers.map((h, i) => [h.trim(), (parseRow(line)[i] ?? '').trim()])));
}

const MAP: Record<string, string> = {
  nome: 'name', name: 'name', full_name: 'name',
  telefone: 'phone', phone: 'phone', phone_number: 'phone', celular: 'phone',
  email: 'email', empresa: 'company', company: 'company',
  tags: 'tags', notas: 'notes', notes: 'notes', canal: 'channel', channel: 'channel',
};

interface Props { open: boolean; onOpenChange: (v: boolean) => void; instanceName: string; onImported?: () => void; }

export const ContactImportDialogV2: React.FC<Props> = ({ open, onOpenChange, instanceName, onImported }) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.endsWith('.csv')) { setErr('Apenas arquivos CSV.'); return; }
    if (f.size > 20_000_000) { setErr('Arquivo muito grande (máx 20 MB).'); return; }
    setFile(f); setErr(''); setResult(null); setParsing(true);
    try {
      const raw = await parseCsvToRows(f);
      const mapped = raw.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [MAP[k.toLowerCase().replace(/\s+/g, '_')] ?? k, sanitizeText(v)]))).filter((r) => r.name || r.phone);
      if (!mapped.length) { setErr('Nenhum contato válido encontrado.'); setFile(null); } else setRows(mapped);
    } catch { setErr('Erro ao processar arquivo.'); }
    finally { setParsing(false); }
  };

  const handleImport = async () => {
    if (!rows.length) return;
    setImporting(true); setProgress(0);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado.');
      const iv = setInterval(() => setProgress((p) => Math.min(p + 3, 90)), 300);
      const resp = await fetch(`${(supabase as Record<string, unknown>).supabaseUrl ?? ''}/functions/v1/contacts-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ rows: rows.map((r) => ({ ...r, channel: r.channel ?? 'import' })), workspace_id: instanceName }),
      });
      clearInterval(iv); setProgress(100);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const res: ImportResult = await resp.json();
      setResult(res);
      toast({ title: '✅ Importação concluída!', description: `${res.inserted} criados, ${res.updated} atualizados.`, duration: 5000 });
      onImported?.();
    } catch (e) { setProgress(0); toast({ title: 'Erro', description: String(e), variant: 'destructive' }); }
    finally { setImporting(false); }
  };

  const reset = () => { setFile(null); setRows([]); setResult(null); setErr(''); setProgress(0); if (fileRef.current) fileRef.current.value = ''; };

  const dlTemplate = () => {
    const csv = '\uFEFFNome,Telefone,Email,Empresa,Tags,Notas\n"João Silva","(11) 98765-4321","joao@example.com","ACME","cliente,vip","Contato VIP"\n';
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })); a.download = 'modelo-contatos.csv'; a.click();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-primary" />Importar Contatos</DialogTitle>
          <DialogDescription>Importe até 50.000 contatos de um arquivo CSV.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Button variant="outline" size="sm" onClick={dlTemplate} className="w-full gap-2"><Download className="h-4 w-4" />Baixar modelo CSV</Button>
          {!result && (
            <div className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/30 ${file ? 'border-primary bg-primary/5' : 'border-border'}`} onClick={() => fileRef.current?.click()} role="button">
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
              {parsing ? <p className="text-sm text-muted-foreground">Processando...</p>
                : file ? (<div className="space-y-1"><FileText className="h-8 w-8 mx-auto text-primary" /><p className="font-medium text-sm">{file.name}</p><p className="text-xs text-muted-foreground">{rows.length.toLocaleString('pt-BR')} contatos encontrados</p></div>)
                : (<div className="space-y-2"><Upload className="h-8 w-8 mx-auto opacity-30" /><p className="text-sm">Clique para selecionar CSV</p><p className="text-xs text-muted-foreground">Colunas: Nome, Telefone, Email, Empresa, Tags, Notas</p></div>)}
            </div>
          )}
          {err && <Alert variant="destructive"><XCircle className="h-4 w-4" /><AlertDescription>{err}</AlertDescription></Alert>}
          {importing && <div className="space-y-2"><Progress value={progress} /><p className="text-xs text-center text-muted-foreground">Importando {rows.length.toLocaleString('pt-BR')} contatos...</p></div>}
          {result && (
            <Alert className="border-green-200 bg-green-50"><CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-sm text-green-800 space-y-2">
                <p className="font-medium">Importação concluída!</p>
                <div className="grid grid-cols-3 gap-2 text-xs text-center">
                  <div><p className="text-xl font-bold text-green-700">{result.inserted}</p><p>Criados</p></div>
                  <div><p className="text-xl font-bold text-blue-700">{result.updated}</p><p>Atualizados</p></div>
                  <div><p className="text-xl font-bold text-gray-500">{result.skipped}</p><p>Ignorados</p></div>
                </div>
                {result.errors.length > 0 && <p className="text-xs text-amber-700"><AlertTriangle className="h-3 w-3 inline mr-1" />{result.errors.length} linha{result.errors.length !== 1 ? 's' : ''} com erro</p>}
              </AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>{result ? 'Fechar' : 'Cancelar'}</Button>
          {!result && <Button onClick={handleImport} disabled={!rows.length || importing} className="gap-2">{importing ? 'Importando...' : `Importar ${rows.length > 0 ? rows.length.toLocaleString('pt-BR') + ' contatos' : ''}`}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
export default ContactImportDialogV2;
