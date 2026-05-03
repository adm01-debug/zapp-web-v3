import { useEffect, useMemo, useState } from 'react';
import { TeamConversation } from '@/hooks/useTeamChat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowDown, Pencil, Trash2, X, Check, Reply, Image as ImageIcon, Music, FileText, Video, Copy, Volume2, VolumeX, Loader2, Search, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu';
import { MarkdownPreview } from '@/features/inbox';
import { AnimatePresence, motion } from 'framer-motion';
import { AddMembersDialog } from './AddMembersDialog';
import { TeamChatHeader } from './TeamChatHeader';
import { TeamChatInputArea } from './TeamChatInputArea';
import { useTeamChatPanel } from './useTeamChatPanel';
import { memo } from 'react';
import { TeamMessage } from '@/hooks/useTeamChat';
import { isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function formatTime(dateStr: string) { return format(new Date(dateStr), 'HH:mm'); }
function formatDateSep(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return 'Hoje';
  if (isYesterday(d)) return 'Ontem';
  return format(d, "d 'de' MMMM", { locale: ptBR });
}

const MediaContent = memo(function MediaContent({ msg }: { msg: TeamMessage }) {
  if (!msg.media_url) return null;
  switch (msg.media_type) {
    case 'image': case 'sticker': case 'emoji':
      return <img src={msg.media_url} alt="media" className={cn("rounded-lg max-h-48 object-contain cursor-pointer", msg.media_type === 'sticker' || msg.media_type === 'emoji' ? 'w-24 h-24' : 'max-w-full')} onClick={() => window.open(msg.media_url!, '_blank')} />;
    case 'video': return <video src={msg.media_url} controls className="rounded-lg max-h-48 max-w-full" />;
    case 'audio': case 'audio_meme': return <audio src={msg.media_url} controls className="max-w-full" />;
    case 'document': return <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"><FileText className="w-5 h-5 text-muted-foreground shrink-0" /><span className="text-sm text-foreground underline truncate">{msg.content || 'Documento'}</span></a>;
    default: return null;
  }
});

const MediaTypeIcon = memo(function MediaTypeIcon({ type }: { type: string | null }) {
  switch (type) {
    case 'image': return <ImageIcon className="w-3 h-3" />;
    case 'video': return <Video className="w-3 h-3" />;
    case 'audio': case 'audio_meme': return <Music className="w-3 h-3" />;
    case 'document': return <FileText className="w-3 h-3" />;
    default: return null;
  }
});

interface Props { conversation: TeamConversation; onBack: () => void; onToggleDetails?: () => void; showDetails?: boolean; }

export function TeamChatPanel({ conversation, onBack, onToggleDetails, showDetails }: Props) {
  const s = useTeamChatPanel(conversation);
  const isDeptMember = useMemo(() => {
    if (conversation.type !== 'department') return true;
    if (s.profile?.role === 'admin') return true;
    return s.profile?.department_id === conversation.department_id;
  }, [conversation, s.profile]);

  useEffect(() => {
    if (s.isNearBottomRef.current && s.scrollRef.current) s.scrollRef.current.scrollTop = s.scrollRef.current.scrollHeight;
  }, [s.filteredMessages.length]);

  useEffect(() => { if (s.scrollRef.current) s.scrollRef.current.scrollTop = s.scrollRef.current.scrollHeight; }, [conversation.id]);
  useEffect(() => { if (s.showSearch) s.searchInputRef.current?.focus(); }, [s.showSearch]);

  const dateFirstIndexes = useMemo(() => {
    const seen = new Set<string>(); const result = new Set<number>();
    s.filteredMessages.forEach((msg, idx) => { const k = format(new Date(msg.created_at), 'yyyy-MM-dd'); if (!seen.has(k)) { seen.add(k); result.add(idx); } });
    return result;
  }, [s.filteredMessages]);

  return (
    <div className="flex flex-col h-full w-full relative">
      <TeamChatHeader conversation={conversation} showDetails={showDetails} voiceId={s.tts.voiceId} speed={s.tts.speed}
        showSearch={s.showSearch} isMuted={s.isMuted} onBack={onBack} onToggleDetails={onToggleDetails}
        onToggleSearch={() => { s.setShowSearch(!s.showSearch); if (s.showSearch) s.setSearchQuery(''); }}
        onAddMembers={() => s.setShowAddMembers(true)} onVoiceChange={s.tts.setVoiceId} onSpeedChange={s.tts.setSpeed}
        onToggleMute={() => s.muteMutation.mutate({ conversationId: conversation.id, muted: !s.isMuted })} />

      <AnimatePresence>
        {s.showSearch && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="px-3 py-2 border-b border-border bg-card">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <Input ref={s.searchInputRef} value={s.searchQuery} onChange={e => s.setSearchQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') { s.setShowSearch(false); s.setSearchQuery(''); } }}
                placeholder="Buscar nas mensagens..." className="h-8 text-sm" />
              {s.searchQuery && <span className="text-xs text-muted-foreground whitespace-nowrap">{s.filteredMessages.length} resultado{s.filteredMessages.length !== 1 ? 's' : ''}</span>}
              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => { s.setShowSearch(false); s.setSearchQuery(''); }}><X className="w-3.5 h-3.5" /></Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={s.scrollRef} className="flex-1 overflow-auto p-4 space-y-1 bg-muted/5" onScroll={s.checkNearBottom} role="log" aria-label="Mensagens da conversa" aria-live="polite">
        {s.isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}><Skeleton className="h-10 rounded-2xl" style={{ width: 120 + (i % 3) * 60 }} /></div>)}</div>
        ) : s.filteredMessages.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-12">{s.searchQuery ? 'Nenhuma mensagem encontrada' : 'Envie a primeira mensagem!'}</div>
        ) : (
          s.filteredMessages.map((msg, idx) => {
            const showDate = dateFirstIndexes.has(idx);
            const isMine = msg.sender_id === s.profile?.id;
            const isEditing = s.editingId === msg.id;
            const hasMedia = !!msg.media_url;
            const repliedMsg = msg.reply_to_id ? s.messages.find(m => m.id === msg.reply_to_id) : null;
            const isThisTtsPlaying = s.tts.isPlaying && s.tts.currentMessageId === msg.id;
            const isThisTtsLoading = s.tts.isLoading && s.tts.currentMessageId === msg.id;
            const cleanText = msg.content?.replace(/\[.*?\]/g, '').replace(/https?:\/\/\S+/g, '').trim();

            return (
              <ContextMenu key={msg.id}>
                <ContextMenuTrigger asChild>
                  <div>
                    {showDate && <div className="flex justify-center py-2"><span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full border border-border/20">{formatDateSep(msg.created_at)}</span></div>}
                    <div className={cn("flex gap-2 py-0.5 group", isMine ? "justify-end" : "justify-start")}>
                      {!isMine && <Avatar className="w-7 h-7 mt-1 shrink-0"><AvatarImage src={msg.sender?.avatar_url || undefined} /><AvatarFallback className="text-[10px] bg-muted">{msg.sender?.name?.charAt(0) || '?'}</AvatarFallback></Avatar>}
                      <div className={cn("max-w-[70%] rounded-2xl px-3.5 py-2 shadow-sm relative", isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-card border border-border/30 text-foreground rounded-bl-md")}>
                        {!isMine && conversation.type === 'group' && <p className="text-[10px] font-medium mb-0.5 opacity-70">{msg.sender?.name}</p>}
                        {repliedMsg && <div className={cn("text-[10px] mb-1.5 px-2 py-1 rounded border-l-2", isMine ? "bg-primary-foreground/10 border-primary-foreground/30" : "bg-muted/50 border-muted-foreground/30")}><span className="font-medium">{repliedMsg.sender?.name}</span><p className="truncate opacity-80 flex items-center gap-1">{repliedMsg.media_type && <MediaTypeIcon type={repliedMsg.media_type} />}{repliedMsg.content || 'Mídia'}</p></div>}
                        {isEditing ? (
                          <div className="space-y-1.5">
                            <Input value={s.editText} onChange={e => s.setEditText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') s.handleSaveEdit(); if (e.key === 'Escape') s.handleCancelEdit(); }} className="h-7 text-sm bg-background text-foreground" autoFocus />
                            <div className="flex gap-1 justify-end"><Button size="icon" variant="ghost" className="h-5 w-5" onClick={s.handleCancelEdit}><X className="w-3 h-3" /></Button><Button size="icon" variant="ghost" className="h-5 w-5" onClick={s.handleSaveEdit}><Check className="w-3 h-3" /></Button></div>
                          </div>
                        ) : (
                          <>
                            {hasMedia && <MediaContent msg={msg} />}
                            {msg.content && (!hasMedia || msg.media_type === 'document') && <p className="text-sm leading-relaxed whitespace-pre-wrap break-words"><MarkdownPreview text={msg.content} className="inline" /></p>}
                            {msg.content && hasMedia && msg.media_type !== 'document' && !['🎨 Figurinha', '🎵 Áudio meme', '😀 Emoji', '🎤 Mensagem de áudio'].includes(msg.content) && <p className="text-sm leading-relaxed whitespace-pre-wrap break-words mt-1">{msg.content}</p>}
                            <div className={cn("flex items-center gap-1 mt-0.5", isMine ? "justify-end" : "justify-between")}>
                              {cleanText && <button onClick={() => isThisTtsPlaying ? s.tts.stop() : s.tts.speak(msg.content, msg.id)} className={cn("opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-full", isMine ? "text-primary-foreground/60 hover:text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{isThisTtsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : isThisTtsPlaying ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}</button>}
                              <span className={cn("text-[10px]", isMine ? "text-primary-foreground/60" : "text-muted-foreground")}>{formatTime(msg.created_at)}{msg.is_edited && ' · editado'}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onClick={() => s.setReplyTo(msg)} className="gap-2"><Reply className="w-3.5 h-3.5" /> Responder</ContextMenuItem>
                  {msg.content && <ContextMenuItem onClick={() => s.handleCopyMessage(msg.content)} className="gap-2"><Copy className="w-3.5 h-3.5" /> Copiar</ContextMenuItem>}
                  {cleanText && <ContextMenuItem onClick={() => isThisTtsPlaying ? s.tts.stop() : s.tts.speak(msg.content, msg.id)} className="gap-2"><Volume2 className="w-3.5 h-3.5" /> {isThisTtsPlaying ? 'Parar' : 'Ouvir'}</ContextMenuItem>}
                  {isMine && !isEditing && (<><ContextMenuSeparator />{!hasMedia && <ContextMenuItem onClick={() => s.handleStartEdit(msg)} className="gap-2"><Pencil className="w-3.5 h-3.5" /> Editar</ContextMenuItem>}<ContextMenuItem onClick={() => s.handleDelete(msg.id)} className="gap-2 text-destructive focus:text-destructive"><Trash2 className="w-3.5 h-3.5" /> Excluir</ContextMenuItem></>)}
                </ContextMenuContent>
              </ContextMenu>
            );
          })
        )}
      </div>

      {s.showScrollDown && <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10"><Button size="icon" variant="secondary" className="rounded-full shadow-lg h-8 w-8" onClick={s.scrollToBottom}><ArrowDown className="w-4 h-4" /></Button></div>}

      {isDeptMember ? (
        <TeamChatInputArea conversationId={conversation.id} text={s.text} setText={s.setText} replyTo={s.replyTo}
          isRecordingAudio={s.isRecordingAudio} isPending={s.sendMutation.isPending} onSend={s.handleSend}
          onCancelReply={() => s.setReplyTo(null)} onRecordToggle={() => s.setIsRecordingAudio(!s.isRecordingAudio)}
          onAudioSend={s.handleAudioSend} onSendSticker={s.handleSendSticker} onSendAudioMeme={s.handleSendAudioMeme}
          onSendCustomEmoji={s.handleSendCustomEmoji} onFileSent={s.handleFileSent} />
      ) : (
        <div className="p-6 bg-muted/30 border-t border-border flex flex-col items-center justify-center text-center gap-2">
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-destructive" />
          </div>
          <p className="text-sm font-semibold text-foreground">Acesso Restrito ao Departamento</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            Você não faz parte deste departamento e não tem permissão para visualizar ou enviar mensagens.
          </p>
        </div>
      )}

      <AddMembersDialog open={s.showAddMembers} onOpenChange={s.setShowAddMembers} conversation={conversation} />
    </div>
  );
}
