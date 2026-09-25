import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type ComplaintStatus = Database['public']['Enums']['complaint_status'];

export default function OwnerComplaintsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: complaints } = useQuery({
    queryKey: ['owner-complaints', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('complaints')
        .select('*, tenants(full_name), units(name)')
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ComplaintStatus }) => {
      const { error } = await supabase.from('complaints').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-complaints'] });
      toast({ title: '✓' });
    },
  });

  const statusColors: Record<ComplaintStatus, 'secondary' | 'default' | 'destructive'> = {
    pending: 'destructive',
    in_progress: 'default',
    resolved: 'secondary',
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">{t('complaints.title')}</h1>

      {complaints && complaints.length > 0 ? (
        <div className="space-y-3">
          {complaints.map(complaint => (
            <Card key={complaint.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-medium">{complaint.type}</p>
                      <p className="text-sm text-muted-foreground">{complaint.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {(complaint as any).tenants?.full_name} · {(complaint as any).units?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{new Date(complaint.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={statusColors[complaint.status]}>
                      {t(`complaints.${complaint.status === 'in_progress' ? 'inProgress' : complaint.status}` as any)}
                    </Badge>
                    <Select
                      value={complaint.status}
                      onValueChange={(v: ComplaintStatus) => updateStatus.mutate({ id: complaint.id, status: v })}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">{t('complaints.pending')}</SelectItem>
                        <SelectItem value="in_progress">{t('complaints.inProgress')}</SelectItem>
                        <SelectItem value="resolved">{t('complaints.resolved')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
