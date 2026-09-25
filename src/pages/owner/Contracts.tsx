import { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FileText, Download, Eye, Trash2, Globe } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { generateContractPdf } from '@/utils/generateContractPdf';
import type { Database } from '@/integrations/supabase/types';

type ContractType = Database['public']['Enums']['contract_type'];

export default function ContractsPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [deleteContract, setDeleteContract] = useState<any>(null);
  const [langDialog, setLangDialog] = useState<{ contract: any; action: 'preview' | 'download' } | null>(null);
  const [form, setForm] = useState({
    tenant_id: '', unit_id: '', start_date: '', end_date: '',
    monthly_rent: '', contract_type: 'residential' as ContractType,
  });

  const { data: contracts } = useQuery({
    queryKey: ['contracts', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('contracts')
        .select('*, tenants(full_name), units(name, buildings(name))')
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: tenants } = useQuery({
    queryKey: ['tenants-for-contracts', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('tenants').select('id, full_name, unit_id, units(id, name, monthly_rent, buildings(name))').eq('owner_id', user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('full_name').eq('user_id', user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const addContract = useMutation({
    mutationFn: async () => {
      const tenant = tenants?.find(t => t.id === form.tenant_id);
      const { error } = await supabase.from('contracts').insert({
        owner_id: user!.id,
        tenant_id: form.tenant_id,
        unit_id: tenant?.unit_id || null,
        start_date: form.start_date,
        end_date: form.end_date || null,
        monthly_rent: parseFloat(form.monthly_rent),
        contract_type: form.contract_type,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setOpen(false);
      toast({ title: '✓' });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('contracts').delete().eq('id', deleteContract.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setDeleteContract(null);
      toast({ title: '✓' });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  const buildContractData = (contract: any, lang: 'fr' | 'en') => ({
    tenantName: (contract as any).tenants?.full_name || '',
    unitName: (contract as any).units?.name || '',
    buildingName: (contract as any).units?.buildings?.name || '',
    monthlyRent: Number(contract.monthly_rent),
    startDate: contract.start_date,
    endDate: contract.end_date,
    contractType: contract.contract_type as 'residential' | 'commercial',
    language: lang,
    ownerName: profile?.full_name || '',
  });

  const handleLangChoice = (lang: 'fr' | 'en') => {
    if (!langDialog) return;
    const { contract, action } = langDialog;
    const data = buildContractData(contract, lang);
    if (action === 'preview') {
      const doc = generateContractPdf(data, true);
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewData(data);
    } else {
      generateContractPdf(data);
    }
    setLangDialog(null);
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewData(null);
  };

  const downloadFromPreview = () => {
    if (previewData) generateContractPdf(previewData);
  };

  const formatAmount = (amount: number) => new Intl.NumberFormat('fr-FR').format(amount) + ' ' + t('common.fcfa');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">{t('contracts.title')}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />{t('contracts.generate')}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t('contracts.generate')}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t('nav.tenants')}</Label>
                <Select value={form.tenant_id} onValueChange={v => {
                  const tenant = tenants?.find(t => t.id === v);
                  setForm(f => ({ ...f, tenant_id: v, monthly_rent: String((tenant as any)?.units?.monthly_rent || '') }));
                }}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{tenants?.map(t => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('common.type')}</Label>
                <Select value={form.contract_type} onValueChange={(v: ContractType) => setForm(f => ({ ...f, contract_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">{t('contracts.residential')}</SelectItem>
                    <SelectItem value="commercial">{t('contracts.commercial')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{t('buildings.monthlyRent')} ({t('common.fcfa')})</Label><Input type="number" value={form.monthly_rent} onChange={e => setForm(f => ({ ...f, monthly_rent: e.target.value }))} /></div>
              <div><Label>{t('contracts.startDate')}</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
              <div><Label>{t('contracts.endDate')}</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
              <Button onClick={() => addContract.mutate()} disabled={!form.tenant_id || !form.start_date || !form.monthly_rent} className="w-full">{t('common.save')}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {contracts && contracts.length > 0 ? (
        <div className="space-y-3">
          {contracts.map(contract => (
            <Card key={contract.id} className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{(contract as any).tenants?.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(contract as any).units?.buildings?.name && <span className="font-medium">{(contract as any).units.buildings.name} — </span>}
                      {t(`contracts.${contract.contract_type}` as any)} · {formatAmount(Number(contract.monthly_rent))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(contract.start_date).toLocaleDateString('fr-FR')}
                      {contract.end_date && ` → ${new Date(contract.end_date).toLocaleDateString('fr-FR')}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" onClick={() => setLangDialog({ contract, action: 'preview' })} title="Aperçu">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setLangDialog({ contract, action: 'download' })} title="Télécharger">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteContract(contract)} title="Supprimer">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-2"><CardContent className="py-12 text-center text-muted-foreground">{t('common.noData')}</CardContent></Card>
      )}

      {/* Language Selection Dialog */}
      <Dialog open={!!langDialog} onOpenChange={() => setLangDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {language === 'fr' ? "Langue du contrat" : "Contract language"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button variant="outline" className="h-16 text-base font-medium" onClick={() => handleLangChoice('fr')}>
              🇫🇷 Français
            </Button>
            <Button variant="outline" className="h-16 text-base font-medium" onClick={() => handleLangChoice('en')}>
              🇬🇧 English
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={closePreview}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center justify-between">
              <span>{t('contracts.title')}</span>
              <Button size="sm" onClick={downloadFromPreview}>
                <Download className="h-4 w-4 mr-2" />{t('contracts.download')}
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 px-4 pb-4">
            {previewUrl && (
              <iframe src={previewUrl} className="w-full h-full rounded-md border" title="Aperçu du contrat" />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteContract} onOpenChange={() => setDeleteContract(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('common.delete')}</DialogTitle></DialogHeader>
          <p className="text-muted-foreground">
            {(deleteContract as any)?.tenants?.full_name} — {language === 'fr' ? 'cette action est irréversible.' : 'this action is irreversible.'}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteContract(null)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate()}>{t('common.delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}