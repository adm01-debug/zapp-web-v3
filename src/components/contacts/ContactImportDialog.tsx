/**
 * ContactImportDialog.tsx — v3.0
 * CSV import using contacts-import Edge Function.
 * Supports up to 50,000 contacts with progress reporting.
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Upload, FileText, CheckCircle2, XCircle, AlertTriangle, Loader2, Download,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { parseCsvFile, downloadCsv } from '@/lib/csvUtils';

// ── Types ──────────────────────────────────────────────────────────────────

interface ImportResult {
  total:       number;
  inserted:    number;
  updated:     number;
  skipped:     number;
  errors:      Array<{ row: number; reason: string }>;
  duration_ms: number;
}

interface ContactImportDialogProps {
  open:             boolean;
  onOpenChange:     (v: boolean) => void;
  workspaceId:      string;
  onImportComplete: () => void;
}

// ── Column mapping ─────────────────────────────────────────────────────────

const EXPECTED_COLUMNS = ['name', 'phone', 'email', 'company', 'tags', 'notes'];
const COLUMN_ALIASES: Record<string, string> = {
  nome: 'name', telefone: 'phone', celular: 'phone', 'e-mail': 'email',
  empresa: 'company', etiquetas: 'tags', notas: 'notes', observacoes: 'notes',
};

function mapHeader(header: string): string {
  const lower = header.toLowerCase().trim();
  return COLUMN_ALIASES[lower] ?? lower;
}

function parseRows(rawRows: string[][]): Array<Record<string, string>> {
  if (rawRows.length < 2) return [];
  const headers = rawRows[0].map(mapHeader);
  return rawRows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { if (h) obj[h] = row[i] ?? ''; });
    return obj;
  });
}

// ── Component ──────────────────────────────────────────────────────────────

export const ContactImportDialog: React.FC<ContactImportDialogProps> = ({
  open, onOpenChange, workspaceId, onImportComplete,
}) => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file,      setFile]      = useState<File | null>(null);
  const [preview,   setPreview]   = useState<Array<Record<string, string>>>([]);
  const [loading,   setLoading]   = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [result,    setResult]    = useState<ImportResult | null>(null);
  const [error,     setError]     = useState<string | null>(null);

  const handleFileSelect = useCallback(async (f: File) => {
    setFile(f); setResult(null); setError(null);
    try {
      const rawRows = await parseCsvFile(f);
      const rows = parseRows(rawRows);
      setPreview(rows.slice(0, 3));
    } catch (err) {
      setError(`Erro ao ler CSV: ${String(err)}`);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.endsWith('.csv') || dropped?.type === 'text/csv') {
      handleFileSelect(dropped);
    }
  }, [handleFileSelect]);

  const handleImport = async () => {
    if (!file) return;
    setLoading(true); setProgress(10); setResult(null); setError(null);

    try {
      const rawRows = await parseCsvFile(file);
      const rows    = parseRows(rawRows);

      if (rows.length === 0) {
        setError('Nenhuma linha válida encontrada no CSV.');
        return;
      }
      if (rows.length > 50_000) {
        setError(`Máximo 50.000 contatos por importação. Este arquivo tem ${rows.length.toLocaleString('pt-BR')}.`);
        return;
      }

      setProgress(30);

      const { data, error: fnError } = await supabase.functions.invoke('contacts-import', {
        body: { rows },
      });

      setProgress(90);

      if (fnError) throw fnError;

      const res = data as ImportResult;
      setResult(res);
      setProgress(100);

      toast({
        title: '✅ Importação concluída!',
        description: `${res.inserted} criados · ${res.updated} atualizados · ${res.skipped} ignorados`,
        duration: 5_000,
      });

      if (res.inserted > 0 || res.updated > 0) {
        setTimeout(() => { onImportComplete(); onOpenChange(false); }, 2_000);
      }
    } catch (err) {
      setError(`Erro na importação: ${String(err)}`);
      setProgress(0);
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const csv = `nome,telefone,email,empresa,tags,notas
João Silva,(11) 98765-4321,joao@exemplo.com,Empresa ABC,"cliente,vip",Cliente desde 2024
Maria Santos,(21) 99876-5432,maria@exemplo.com,XYZ Ltda,fornecedor,
`;
    downloadCsv('template_importacao_contatos.csv', csv);
  };

  const reset = () => {
    setFile(null); setPreview([]); setResult(null); setError(null); setProgress(0);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Importar Contatos
          </DialogTitle>
          <DialogDescription>
            Suporte a CSV com até 50.000 contatos. Duplicatas (mesmo telefone ou e-mail) são
            atualizadas automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop zone */}
          {!file && !result && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-muted rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium text-sm">Arraste um arquivo CSV ou clique para selecionar</p>
              <p className="text-xs text-muted-foreground mt-1">
                Colunas: nome, telefone, email, empresa, tags, notas
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
            </div>
          )}

          {/* File selected */}
          {file && !result && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/20">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                {!loading && (
                  <button type="button" onClick={reset} className="text-muted-foreground hover:text-foreground text-xs">
                    Trocar
                  </button>
                )}
              </div>

              {/* Preview */}
              {preview.length > 0 && (
                <div className="rounded-md border overflow-hidden">
                  <div className="text-xs font-medium p-2 bg-muted/30 border-b">
                    Prévia (primeiras {preview.length} linhas)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="text-xs w-full">
                      <thead>
                        <tr className="border-b">
                          {EXPECTED_COLUMNS.map((c) => (
                            <th key={c} className="px-2 py-1 text-left text-muted-foreground font-medium">{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row, i) => (
                          <tr key={i} className="border-b last:border-0">
                            {EXPECTED_COLUMNS.map((c) => (
                              <td key={c} className="px-2 py-1 truncate max-w-[120px]">{row[c] ?? ''}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Progress */}
              {loading && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Importando...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          {/* Result */}
          {result && (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-sm">Importação concluída!</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Criados', value: result.inserted, color: 'text-green-600' },
                  { label: 'Atualizados', value: result.updated, color: 'text-blue-600' },
                  { label: 'Ignorados', value: result.skipped, color: 'text-amber-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-md border p-2">
                    <p className={`text-xl font-bold ${color}`}>{value.toLocaleString('pt-BR')}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
              {result.errors.length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer flex items-center gap-1 text-amber-700">
                    <AlertTriangle className="h-3 w-3" />
                    {result.errors.length} erro{result.errors.length !== 1 ? 's' : ''} (clique para ver)
                  </summary>
                  <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                    {result.errors.slice(0, 20).map((e) => (
                      <div key={e.row} className="text-muted-foreground">
                        Linha {e.row}: {e.reason}
                      </div>
                    ))}
                  </div>
                </details>
              )}
              <p className="text-xs text-muted-foreground">
                Duração: {(result.duration_ms / 1000).toFixed(1)}s
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={downloadTemplate} className="gap-1 mr-auto">
            <Download className="h-3.5 w-3.5" />
            Baixar template
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {result ? 'Fechar' : 'Cancelar'}
          </Button>
          {!result && (
            <Button onClick={handleImport} disabled={!file || loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {loading ? 'Importando...' : 'Importar'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContactImportDialog;
