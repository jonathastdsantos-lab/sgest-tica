import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTenant } from '@/hooks/use-tenant';
import { Building2, Sparkles, MapPin, UserPlus, CheckCircle2, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export const Route = createFileRoute('/_auth/onboarding')({
  component: Onboarding,
});

function Onboarding() {
  const [step, setStep] = useState(1);
  
  // Step 1
  const [clinicName, setClinicName] = useState('');
  const [responsibleName, setResponsibleName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Step 2
  const [unitName, setUnitName] = useState('Matriz');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  // Step 3
  const [profName, setProfName] = useState('');
  const [specialty, setSpecialty] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { createOrganization } = useTenant();
  const navigate = useNavigate();

  const handleNext = () => {
    setError(null);
    if (step === 1 && (!clinicName || !phone)) {
      setError('Nome da clínica e telefone são obrigatórios.');
      return;
    }
    if (step === 2 && (!unitName || !city || !state)) {
      setError('Preencha os campos da unidade.');
      return;
    }
    if (step === 3 && (!profName)) {
      setError('Preencha o nome do profissional.');
      return;
    }
    setStep(step + 1);
  };

  const handleFinish = async () => {
    setSaving(true);
    setError(null);
    try {
      // 1. Cria a clínica base via RPC (que burla o RLS inicial)
      const orgId = await createOrganization(clinicName, phone);

      // 2. Com a clínica criada, o usuário já tem permissão RLS
      // Vamos atualizar a unidade "Sede" que foi criada pelo RPC
      const { data: units } = await supabase
        .from('units')
        .select('id')
        .eq('organization_id', orgId)
        .limit(1);

      if (units && units.length > 0) {
        await supabase.from('units').update({
          name: unitName,
          email: email,
          city: city,
          state: state
        }).eq('id', units[0].id);
      }

      // 3. Cadastra o 1º Profissional
      await supabase.from('professionals').insert({
        organization_id: orgId,
        full_name: profName,
        professional_name: profName,
        specialty: specialty,
        active: true
      });

      // 4. Conclui
      setStep(4);
    } catch (err: any) {
      setError(err.message || 'Erro ao finalizar configuração.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-xl rounded-2xl bg-surface p-8 shadow-xl ring-1 ring-border sm:p-12 relative overflow-hidden">
        
        {/* Progress Bar Top */}
        <div className="absolute top-0 left-0 h-1 bg-muted w-full">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-in-out" 
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="mb-6 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="size-6" />
            </div>
            <h1 className="text-3xl font-display font-medium tracking-tight">Sobre a clínica</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Para começar, como os seus pacientes conhecem vocês?
            </p>

            <div className="mt-8 space-y-4">
              {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome da Clínica</label>
                  <input
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Ex: Bella Estética"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome do Responsável</label>
                  <input
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Nome completo"
                    value={responsibleName}
                    onChange={(e) => setResponsibleName(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Telefone Principal</label>
                  <input
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">E-mail Comercial</label>
                  <input
                    type="email"
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="contato@clinica.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="mt-6 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-foreground px-4 text-sm font-medium text-background shadow transition-colors hover:bg-foreground/90"
              >
                Próximo passo <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="mb-6 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MapPin className="size-6" />
            </div>
            <h1 className="text-3xl font-display font-medium tracking-tight">Endereço da sede</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Onde sua unidade principal está localizada?
            </p>

            <div className="mt-8 space-y-4">
              {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome da Unidade</label>
                <input
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Ex: Matriz, Unidade Centro..."
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cidade</label>
                  <input
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="São Paulo"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Estado (UF)</label>
                  <input
                    required
                    maxLength={2}
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring uppercase"
                    placeholder="SP"
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-foreground px-4 text-sm font-medium text-background shadow transition-colors hover:bg-foreground/90"
                >
                  Próximo passo <ArrowRight className="size-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="mb-6 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UserPlus className="size-6" />
            </div>
            <h1 className="text-3xl font-display font-medium tracking-tight">Primeiro profissional</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Quem irá realizar os atendimentos nesta unidade?
            </p>

            <div className="mt-8 space-y-4">
              {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome do Profissional</label>
                <input
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Ex: Dra. Juliana"
                  value={profName}
                  onChange={(e) => setProfName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Especialidade (opcional)</label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Ex: Harmonização Facial"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                />
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={saving}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? 'Preparando clínica...' : 'Finalizar configuração'}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animate-in zoom-in duration-500 text-center py-8">
            <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="size-10" />
            </div>
            <h1 className="text-3xl font-display font-medium tracking-tight">Sua clínica está pronta.</h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-[280px] mx-auto">
              O SGEstética já estruturou seu painel, funil de vendas e tags exclusivas.
            </p>
            
            <button
              onClick={() => navigate({ to: '/' })}
              className="mt-8 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-foreground px-8 text-sm font-medium text-background shadow transition-colors hover:bg-foreground/90"
            >
              <Sparkles className="size-4" />
              Acessar meu painel
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
