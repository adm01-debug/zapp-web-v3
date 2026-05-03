import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { File, Download, Trash2, Loader2, UploadCloud, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search as SearchIcon, Filter, Calendar } from 'lucide-react';

interface TeamFilesProps {
  contactId: string;
}

export function TeamFiles({ contactId }: TeamFilesProps) {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['team-files', contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whisper_files')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const filePath = `team-files/${contactId}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('whatsapp-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('whatsapp-media')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase.from('whisper_files').insert({
        contact_id: contactId,
        file_name: file.name,
        file_url: publicUrl,
        file_size: file.size,
        file_type: file.type,
        sender_id: (await supabase.auth.getUser()).data.user?.id,
      });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-files', contactId] });
      toast({ title: 'Arquivo enviado', description: 'O documento interno foi salvo com sucesso.' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' });
    },
    onSettled: () => setIsUploading(false),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('whisper_files').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-files', contactId] });
      toast({ title: 'Arquivo removido' });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.file_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || 
      (typeFilter === 'image' && file.file_type?.startsWith('image/')) ||
      (typeFilter === 'pdf' && file.file_type === 'application/pdf') ||
      (typeFilter === 'doc' && (file.file_type?.includes('word') || file.file_type?.includes('document'))) ||
      (typeFilter === 'other' && !file.file_type?.startsWith('image/') && file.file_type !== 'application/pdf' && !file.file_type?.includes('word'));
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-amber-700 uppercase tracking-widest flex items-center gap-2">
            <EyeOff className="w-3 h-3" />
            Documentos da Equipe
          </h4>
          <label className="cursor-pointer">
            <Input type="file" className="hidden" onChange={handleFileChange} disabled={isUploading} />
            <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1.5 border-amber-200 text-amber-700 hover:bg-amber-50" disabled={isUploading}>
              {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <UploadCloud className="w-3 h-3" />}
              Novo Arquivo
            </Button>
          </label>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-amber-400" />
            <Input 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar arquivos..." 
              className="pl-7 h-8 text-[11px] bg-amber-50/30 border-amber-100 focus-visible:ring-amber-200"
            />
          </div>
          <select 
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="h-8 text-[10px] bg-amber-50/30 border-amber-100 rounded-md px-2 text-amber-700 outline-none focus:ring-1 focus:ring-amber-200"
          >
            <option value="all">Todos</option>
            <option value="image">Imagens</option>
            <option value="pdf">PDFs</option>
            <option value="doc">Docs</option>
            <option value="other">Outros</option>
          </select>
        </div>
      </div>

      <div className="space-y-2 min-h-[100px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-amber-200" /></div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center opacity-40 grayscale">
            <File className="w-8 h-8 mb-2" />
            <p className="text-[10px]">
              {searchTerm || typeFilter !== 'all' ? 'Nenhum arquivo corresponde aos filtros.' : 'Nenhum arquivo interno compartilhado.'}
            </p>
          </div>
        ) : (
          filteredFiles.map((file) => (
            <div key={file.id} className="flex items-center gap-3 p-2 rounded-xl bg-amber-50/50 border border-amber-100 hover:bg-amber-100/50 transition-colors group">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <File className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-amber-900 truncate" title={file.file_name}>{file.file_name}</p>
                <p className="text-[9px] text-amber-600/60 font-mono uppercase">
                  {formatSize(file.file_size || 0)} • {format(new Date(file.created_at), 'dd MMM HH:mm', { locale: ptBR })}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600 hover:bg-amber-200" asChild>
                  <a href={file.file_url} download={file.file_name} target="_blank" rel="noreferrer">
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => deleteMutation.mutate(file.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
