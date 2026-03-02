
'use client';

import React, { useState } from 'react';
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
import { ShieldAlert, Lock, Trash2, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { useEffect } from 'react';

interface DeletePasswordModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    title?: string;
}

export function DeletePasswordModal({
    isOpen,
    onOpenChange,
    onConfirm,
    title = "Confirmar Eliminación"
}: DeletePasswordModalProps) {
    const [password, setPassword] = useState('');
    const [expectedPassword, setExpectedPassword] = useState('Borrarcontenido');
    const { toast } = useToast();

    useEffect(() => {
        if (!isOpen) return;

        const fetchPassword = async () => {
            try {
                const { db } = getFirebaseServices();
                const docSnap = await getDoc(doc(db, 'settings', 'security'));
                if (docSnap.exists() && docSnap.data().deletePassword) {
                    setExpectedPassword(docSnap.data().deletePassword);
                }
            } catch (error) {
                console.error("Error fetching deletion password:", error);
            }
        };

        fetchPassword();
    }, [isOpen]);

    const handleConfirm = () => {
        if (password === expectedPassword) {
            onConfirm();
            onOpenChange(false);
            setPassword('');
        } else {
            toast({
                title: "Contraseña Incorrecta",
                description: "La contraseña ingresada no es válida. Acceso denegado.",
                variant: 'destructive',
            });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[440px] rounded-[32px] p-8 border-none bg-white shadow-2xl overflow-hidden">
                <DialogHeader className="space-y-3 text-left">
                    <DialogTitle className="text-2xl font-bold font-headline text-slate-900 leading-tight">
                        {title}
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 text-sm font-medium leading-relaxed">
                        Esta acción es irreversible y eliminará el registro permanentemente del sistema principal.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-4">
                    <div className="space-y-2">
                        <p className="text-sm text-slate-600 leading-relaxed font-medium">
                            <span className="text-amber-600 font-bold">Seguridad Requerida:</span> Ingrese la clave de seguridad para continuar.
                            <br />
                            <span className="text-xs text-slate-400 italic">Si no tienes la contraseña, pídela al administrador.</span>
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password-check" className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">
                            Contraseña de Seguridad
                        </Label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-accent transition-colors" />
                            <Input
                                id="password-check"
                                type="password"
                                placeholder="••••••••"
                                className="pl-11 h-14 bg-slate-50/50 border-slate-100 rounded-2xl text-base focus-visible:ring-accent transition-all font-medium"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                                autoFocus
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex-row justify-end gap-3 mt-2">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="h-12 px-6 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={handleConfirm}
                        className="h-12 px-6 rounded-2xl bg-red-400 hover:bg-red-500 text-white font-bold shadow-lg shadow-red-100 transition-all active:scale-95 flex items-center gap-2"
                    >
                        <Trash2 className="h-4 w-4" />
                        Eliminar Contenido
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
