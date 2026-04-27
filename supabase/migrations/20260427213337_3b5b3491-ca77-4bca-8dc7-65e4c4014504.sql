-- Remover a tabela antiga que possui estrutura divergente
DROP TABLE IF EXISTS public.file_scan_logs CASCADE;

-- Criar tipo enum se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scan_verdict') THEN
        CREATE TYPE public.scan_verdict AS ENUM ('clean', 'infected', 'suspicious', 'pending', 'error');
    END IF;
END $$;

-- Criar tabela com a estrutura solicitada
CREATE TABLE public.file_scan_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    bucket TEXT NOT NULL,
    path TEXT NOT NULL,
    hash TEXT,
    scan_result public.scan_verdict DEFAULT 'pending',
    raw_scan_data JSONB,
    status_code INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.file_scan_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Users can view their own scan logs"
ON public.file_scan_logs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage scan logs"
ON public.file_scan_logs FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Índices recomendados
CREATE INDEX idx_file_scan_logs_user_id ON public.file_scan_logs(user_id);
CREATE INDEX idx_file_scan_logs_created_at ON public.file_scan_logs(created_at DESC);
CREATE INDEX idx_file_scan_logs_hash ON public.file_scan_logs(hash);
