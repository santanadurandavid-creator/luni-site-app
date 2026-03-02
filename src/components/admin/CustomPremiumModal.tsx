
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { User } from '@/lib/types';


interface CustomPremiumModalProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    user: User | null;
}

export function CustomPremiumModal({ isOpen, setIsOpen, user }: CustomPremiumModalProps) {
    const { toast } = useToast();
    const { setPremiumForDays } = useAuth();
    const [days, setDays] = useState<number>(30);
    const [numTokens, setNumTokens] = useState<number>(3);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(false);
    }, []);

    const handleSave = async () => {
        if (!user || !user.id) return;
        if (days <= 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'La duración debe ser mayor a 0 días.' });
            return;
        }
        if (numTokens <= 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'El número de tokens debe ser mayor a 0.' });
            return;
        }

        try {
            await setPremiumForDays(user.id, days, numTokens);
            toast({
                title: 'Plan Personalizado Guardado',
                description: `Se ha otorgado acceso premium por ${days} días con ${numTokens} tokens.`,
            });
            setIsOpen(false);
        } catch (error) {
            console.error('Error saving custom premium plan:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el plan personalizado.' });
        }
    };

    // No longer needed

    if (!user) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Personalizar Plan Premium</DialogTitle>
                    <DialogDescription>
                        Define la duración y los exámenes para {user.name}.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="days" className="text-right">
                            Días
                        </Label>
                        <Input
                            id="days"
                            type="number"
                            value={days}
                            onChange={(e) => setDays(parseInt(e.target.value, 10))}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="numTokens" className="text-right">
                            Número de Tokens
                        </Label>
                        <Input
                            id="numTokens"
                            type="number"
                            value={numTokens}
                            onChange={(e) => setNumTokens(parseInt(e.target.value, 10))}
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" onClick={handleSave}>Guardar Cambios</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
