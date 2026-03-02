

'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';
import { add } from 'date-fns/add';
import { useAuth } from '@/hooks/use-auth';

interface BanUserModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  userToBan: User | null;
}

export function BanUserModal({ isOpen, setIsOpen, userToBan }: BanUserModalProps) {
  const { banUser } = useAuth();
  const { toast } = useToast();
  const [duration, setDuration] = useState(1);
  const [unit, setUnit] = useState<'hours' | 'days' | 'years'>('days');
  const [reason, setReason] = useState('');
  const [isPermanent, setIsPermanent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!userToBan) return null;
  
  const handleBan = async () => {
    setIsSubmitting(true);
    let bannedUntil: Date | null = null;
    if (!isPermanent) {
        bannedUntil = add(new Date(), { [unit]: duration });
    }
    
    await banUser(userToBan.id, reason, bannedUntil);
    toast({ title: 'Usuario Bloqueado', description: `${userToBan.name} ha sido bloqueado.` });
    setIsSubmitting(false);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-[95vw] max-w-md rounded-lg">
        <DialogHeader>
          <DialogTitle>Bloquear a {userToBan.name}</DialogTitle>
          <DialogDescription>
            El usuario no podrá iniciar sesión durante el tiempo especificado.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="reason">Motivo del bloqueo</Label>
                <Textarea 
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ej: Violación de los términos de servicio..."
                />
            </div>
            <div className="flex items-center space-x-2">
                <Input 
                    id="permanent" 
                    type="checkbox" 
                    className="h-4 w-4"
                    checked={isPermanent} 
                    onChange={(e) => setIsPermanent(e.target.checked)}
                />
                <Label htmlFor="permanent">Bloqueo permanente</Label>
            </div>
            {!isPermanent && (
                <div className="grid grid-cols-3 gap-2">
                    <Input 
                        type="number" 
                        value={duration}
                        onChange={(e) => setDuration(parseInt(e.target.value))}
                        min="1"
                    />
                    <select
                        value={unit}
                        onChange={(e) => setUnit(e.target.value as any)}
                        className="col-span-2 flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                        <option value="hours">Hora(s)</option>
                        <option value="days">Día(s)</option>
                        <option value="years">Año(s)</option>
                    </select>
                </div>
            )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
          <Button type="button" onClick={handleBan} disabled={isSubmitting || !reason.trim()}>
            {isSubmitting ? 'Bloqueando...' : 'Confirmar Bloqueo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
