import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/use-tenant';
import { 
  Upload, Image as ImageIcon, Sparkles, AlertTriangle, 
  Columns, Calendar, Tag, Plus, X 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type ClinicalPhoto = {
  id: string;
  photo_url: string;
  photo_type: 'before' | 'after' | 'follow_up';
  body_part: string;
  notes: string;
  date_taken: string;
};

interface ClinicalPhotosGalleryProps {
  clientId: string;
  recordId?: string | null;
}

export function ClinicalPhotosGallery({ clientId, recordId }: ClinicalPhotosGalleryProps) {
  const { tenant } = useTenant();
  const [photos, setPhotos] = useState<ClinicalPhoto[]>([]);
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal Upload State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoType, setPhotoType] = useState<'before' | 'after' | 'follow_up'>('before');
  const [bodyPart, setBodyPart] = useState('Rosto');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  // Compare Modal State
  const [compareBodyPart, setCompareBodyPart] = useState<string | null>(null);

  const fetchConsentAndPhotos = async () => {
    if (!tenant || !clientId) return;
    setLoading(true);

    // 1. Fetch consent
    const { data: clientData } = await supabase
      .from('clients')
      .select('photo_consent')
      .eq('id', clientId)
      .single();

    if (clientData) {
      setHasConsent(Boolean(clientData.photo_consent));
    }

    // 2. Fetch photos
    const { data: photosData } = await supabase
      .from('clinical_photos')
      .select('*')
      .eq('client_id', clientId)
      .order('date_taken', { ascending: false });

    if (photosData) {
      setPhotos(photosData as ClinicalPhoto[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchConsentAndPhotos();
  }, [tenant, clientId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !clientId || (!file && !previewUrl)) return;
    setUploading(true);

    try {
      let finalPhotoUrl = '';

      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${tenant.id}/${clientId}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('clinical-photos')
          .upload(fileName, file, { upsert: true });

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('clinical-photos')
            .getPublicUrl(fileName);
          finalPhotoUrl = publicUrlData.publicUrl;
        }
      }

      // Fallback base64 / data URL if storage upload failed or not configured
      if (!finalPhotoUrl && file) {
        const reader = new FileReader();
        finalPhotoUrl = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      if (!finalPhotoUrl) {
        toast.error('Selecione um arquivo de imagem válido.');
        setUploading(false);
        return;
      }

      const { error } = await supabase.from('clinical_photos').insert({
        organization_id: tenant.id,
        client_id: clientId,
        record_id: recordId || null,
        photo_url: finalPhotoUrl,
        photo_type: photoType,
        body_part: bodyPart.trim() || 'Geral',
        notes: notes.trim() || null,
        date_taken: new Date().toISOString(),
      });

      if (!error) {
        toast.success('Foto clínica salva com sucesso!');
        setIsUploadOpen(false);
        setFile(null);
        setPreviewUrl(null);
        setNotes('');
        fetchConsentAndPhotos();
      } else {
        toast.error('Erro ao registrar foto clínica.');
      }
    } catch (err: any) {
      toast.error('Erro no upload da imagem.');
    } finally {
      setUploading(false);
    }
  };

  // Group photos by body_part
  const groupedPhotos = photos.reduce((acc, photo) => {
    const part = photo.body_part || 'Geral';
    if (!acc[part]) acc[part] = [];
    acc[part].push(photo);
    return acc;
  }, {} as Record<string, ClinicalPhoto[]>);

  return (
    <div className="space-y-6">
      {/* Header & Consent Notice */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <ImageIcon className="size-5 text-primary" />
            Galeria de Fotos Clínicas
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Acompanhamento visual de evolução, antes e depois.
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          <Plus className="size-4" />
          Nova Foto
        </button>
      </div>

      {/* Consent Warning Banner */}
      {hasConsent === false && (
        <div className="panel p-4 bg-accent/40 border-amber-500/30 flex items-center gap-3 text-amber-800 dark:text-amber-300">
          <AlertTriangle className="size-5 shrink-0 text-amber-600" />
          <div className="text-xs leading-relaxed">
            <strong className="font-semibold block">Aviso de Uso de Imagem (LGPD):</strong>
            Este cliente <u>não autorizou</u> a divulgação pública das suas fotos de tratamento. As imagens devem ser mantidas estritamente sigilosas.
          </div>
        </div>
      )}

      {/* Gallery Groups */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground animate-pulse">Carregando fotos clínicas...</div>
      ) : Object.keys(groupedPhotos).length === 0 ? (
        <div className="panel p-12 text-center flex flex-col items-center justify-center">
          <div className="size-14 rounded-full bg-accent flex items-center justify-center mb-3 text-muted-foreground">
            <ImageIcon className="size-7" />
          </div>
          <h3 className="text-base font-semibold text-foreground">Nenhuma foto registrada</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Anexe fotos de antes, depois ou acompanhamento para comparar a evolução do tratamento.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedPhotos).map(([part, items]) => {
            const hasBefore = items.some(p => p.photo_type === 'before');
            const hasAfter = items.some(p => p.photo_type === 'after');

            return (
              <div key={part} className="panel p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Tag className="size-4 text-primary" />
                    <h3 className="font-semibold text-foreground text-sm uppercase tracking-wider">{part}</h3>
                    <span className="text-xs font-semibold bg-accent text-primary px-2.5 py-0.5 rounded-full">
                      {items.length} fotos
                    </span>
                  </div>

                  {hasBefore && hasAfter && (
                    <button
                      onClick={() => setCompareBodyPart(part)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline bg-accent/60 px-3 py-1 rounded-full transition-colors"
                    >
                      <Columns className="size-3.5" />
                      Comparar Antes x Depois
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {items.map(photo => (
                    <div key={photo.id} className="group relative rounded-lg border border-border overflow-hidden bg-background shadow-xs">
                      <div className="aspect-square relative">
                        <img 
                          src={photo.photo_url} 
                          alt={photo.notes || part} 
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        <span className={cn(
                          "absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold uppercase rounded-md shadow-xs text-white",
                          photo.photo_type === 'before' ? "bg-amber-600" :
                          photo.photo_type === 'after' ? "bg-emerald-600" : "bg-blue-600"
                        )}>
                          {photo.photo_type === 'before' ? 'Antes' : photo.photo_type === 'after' ? 'Depois' : 'Evolução'}
                        </span>
                      </div>
                      <div className="p-2 text-[11px] text-muted-foreground flex items-center justify-between bg-surface">
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          {new Date(photo.date_taken).toLocaleDateString('pt-BR')}
                        </span>
                        {photo.notes && <span className="truncate max-w-[80px]" title={photo.notes}>{photo.notes}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Upload */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl ring-1 ring-border animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold tracking-tight">Nova Foto Clínica</h2>
              <button onClick={() => setIsUploadOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Selecione a Imagem</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="flex w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-accent file:text-primary hover:file:bg-accent/80 cursor-pointer"
                />
              </div>

              {previewUrl && (
                <div className="w-full h-48 rounded-lg overflow-hidden border border-border relative">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-contain bg-black/5" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Estágio</label>
                  <select
                    value={photoType}
                    onChange={(e) => setPhotoType(e.target.value as any)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:ring-1 focus:ring-primary"
                  >
                    <option value="before">Antes</option>
                    <option value="after">Depois</option>
                    <option value="follow_up">Acompanhamento</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Área do Corpo</label>
                  <input
                    placeholder="Ex: Rosto, Abdômen"
                    value={bodyPart}
                    onChange={(e) => setBodyPart(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Observações</label>
                <textarea
                  placeholder="Ex: 1ª sessão de preenchimento labial"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="flex min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="flex h-10 flex-1 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading || !file}
                  className="flex h-10 flex-1 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {uploading ? 'Enviando...' : 'Salvar Foto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Comparação Lado a Lado */}
      {compareBodyPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-surface p-6 shadow-2xl ring-1 ring-border animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                  <Columns className="size-5 text-primary" />
                  Comparação Lado a Lado — {compareBodyPart}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Evolução visual entre o "Antes" e o "Depois".</p>
              </div>
              <button onClick={() => setCompareBodyPart(null)} className="text-muted-foreground hover:text-foreground">
                <X className="size-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Coluna Antes */}
              <div className="space-y-3">
                <span className="inline-block px-3 py-1 bg-amber-600 text-white font-bold text-xs rounded-md uppercase tracking-wider">
                  Antes
                </span>
                <div className="grid gap-4">
                  {(groupedPhotos[compareBodyPart] ?? [])
                    .filter(p => p.photo_type === 'before')
                    .map(p => (
                      <div key={p.id} className="rounded-xl border border-border overflow-hidden bg-background">
                        <img src={p.photo_url} alt="Antes" className="w-full h-72 object-cover" />
                        <div className="p-3 text-xs text-muted-foreground flex justify-between bg-surface">
                          <span>{new Date(p.date_taken).toLocaleDateString('pt-BR')}</span>
                          <span>{p.notes}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Coluna Depois */}
              <div className="space-y-3">
                <span className="inline-block px-3 py-1 bg-emerald-600 text-white font-bold text-xs rounded-md uppercase tracking-wider">
                  Depois
                </span>
                <div className="grid gap-4">
                  {(groupedPhotos[compareBodyPart] ?? [])
                    .filter(p => p.photo_type === 'after')
                    .map(p => (
                      <div key={p.id} className="rounded-xl border border-border overflow-hidden bg-background">
                        <img src={p.photo_url} alt="Depois" className="w-full h-72 object-cover" />
                        <div className="p-3 text-xs text-muted-foreground flex justify-between bg-surface">
                          <span>{new Date(p.date_taken).toLocaleDateString('pt-BR')}</span>
                          <span>{p.notes}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
