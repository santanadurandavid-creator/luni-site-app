
'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Eye, EyeOff, Save, ShieldCheck, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';

interface AdminSecuritySettingsModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AdminSecuritySettingsModal({
    isOpen,
    onOpenChange
}: AdminSecuritySettingsModalProps) {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (!isOpen) return;

        const { db } = getFirebaseServices();
        const docRef = doc(db, 'settings', 'security');

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setPassword(docSnap.data().deletePassword || 'Borrarcontenido');
            } else {
                setPassword('Borrarcontenido');
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [isOpen]);

    const handleSave = async () => {
        if (!password.trim()) {
            toast({
                title: "Error",
                description: "La contraseña no puede estar vacía.",
                variant: 'destructive',
            });
            return;
        }

        setIsSaving(true);
        try {
            const { db } = getFirebaseServices();
            await setDoc(doc(db, 'settings', 'security'), {
                deletePassword: password,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            toast({
                title: "Configuración Actualizada",
                description: "La contraseña de eliminación ha sido guardada correctamente.",
            });
            onOpenChange(false);
        } catch (error) {
            console.error("Error saving security settings:", error);
            toast({
                title: "Error",
                description: "No se pudo guardar la configuración.",
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        setPassword('Borrarcontenido');
        toast({
            description: "Se ha restablecido la contraseña predeterminada.",
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md border-none bg-white shadow-2xl overflow-hidden p-0">
                <div className="h-1.5 w-full bg-gradient-to-r from-accent to-yellow-500" />

                <div className="p-6 space-y-6">
                    <DialogHeader>
                        <div className="mx-auto w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center mb-4 border border-accent/30 shadow-sm">
                            <ShieldCheck className="h-6 w-6 text-amber-600" />
                        </div>
                        <DialogTitle className="text-2xl font-bold text-center font-headline text-slate-800">
                            Seguridad del Panel
                        </DialogTitle>
                        <p className="text-center text-slate-500 text-sm">
                            Gestiona la clave requerida para eliminar contenido de la plataforma.
                        </p>
                    </DialogHeader>

                    {isLoading ? (
                        <div className="py-10 flex flex-col items-center justify-center gap-3">
                            <RefreshCw className="h-8 w-8 text-accent animate-spin" />
                            <p className="text-sm text-slate-400">Cargando configuración...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-3">
                                <Label htmlFor="current-pw" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Contraseña de Eliminación Atual
                                </Label>
                                <div className="relative group">
                                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="current-pw"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10 pr-10 h-12 bg-white border-slate-200 focus:ring-accent rounded-lg shadow-sm"
                                        placeholder="Ingrese nueva contraseña"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="bg-amber-50/50 border border-amber-100 p-3 rounded-lg">
                                <p className="text-[11px] text-amber-700 leading-tight">
                                    <strong>Nota:</strong> Esta clave es compartida por todos los administradores autorizados para borrar contenido.
                                </p>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-2">
                        <Button
                            variant="ghost"
                            onClick={handleReset}
                            className="flex-1 h-11 text-slate-500 hover:bg-slate-100 gap-2"
                            disabled={isSaving}
                        >
                            <RefreshCw className="h-4 w-4" />
                            Restablecer
                        </Button>
                        <Button
                            onClick={handleSave}
                            className="flex-1 h-11 bg-accent hover:bg-accent/90 text-slate-900 font-bold shadow-lg shadow-yellow-100 gap-2"
                            disabled={isSaving || isLoading}
                        >
                            {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Guardar Cambios
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
