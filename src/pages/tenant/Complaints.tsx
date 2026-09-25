import { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, MessageSquare } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type ComplaintStatus = Database['public']['Enums']['complaint_status'];

export default function TenantComplaints() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: '', description: '' });

  const { data: tenantRecord } = useQuery({
    queryKey: ['my-tenant-record', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('tenants').select('*, units(id)').eq('user_id', user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: complaints } = useQuery({
    queryKey: ['my-complaints', tenantRecord?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('complaints')
        .select('*')
        .eq('tenant_id', tenantRecord!.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!tenantRecord,
  });

  const addComplaint = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('complaints').insert({
        tenant_id: tenantRecord!.id,
        owner_id: tenantRecord!.owner_id,
        unit_id: tenantRecord?.unit_id || null,
        type: form.type,
        description: form.description,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-complaints'] });
      setOpen(false);
      setForm({ type: '', description: '' });
      toast({ title: '✓' });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  const statusColors: Record<ComplaintStatus, 'secondary' | 'default' | 'destructive'> = {
    pending: 'destructive',
    in_progress: 'default',
    resolved: 'secondary',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('nav.myComplaints')}</h1>
        {tenantRecord && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />{t('complaints.add')}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t('complaints.add')}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>{t('common.type')}</Label><Input placeholder="Fuite d'eau, panne électrique..." value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} /></div>
                <div><Label>{t('common.description')}</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
                <Button onClick={() => addComplaint.mutate()} disabled={!form.type || !form.description} className="w-full">{t('common.save')}</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {complaints && complaints.length > 0 ? (
        <div className="space-y-3">
          {complaints.map(complaint => (
            <Card key={complaint.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">{complaint.type}</p>
                      <p className="text-sm text-muted-foreground">{complaint.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(complaint.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                  <Badge variant={statusColors[complaint.status]}>
                    {t(`complaints.${complaint.status === 'in_progress' ? 'inProgress' : complaint.status}` as any)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-2"><CardContent className="py-12 text-center text-muted-foreground">{t('common.noData')}</CardContent></Card>
      )}
    </div>
  );
}
