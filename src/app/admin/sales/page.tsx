
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { User as UserType, UserRole } from '@/lib/types';
import { collection, onSnapshot, doc, updateDoc, addDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, History, Coins, Phone, Mail, Plus, Send, MessageCircle, Crown, Settings, Clock, ShoppingBag, CheckCircle, DollarSign } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { format, isFuture, differenceInDays, differenceInHours } from 'date-fns';
import { es } from 'date-fns/locale';
import { User as UserIcon } from 'lucide-react';

// Function to calculate and format remaining premium time
const getPremiumTimeRemaining = (premiumUntil: any) => {
    if (!premiumUntil) return null;
    const now = new Date();
    const endDate = premiumUntil.toDate();
    if (!isFuture(endDate)) return null;
    const daysLeft = differenceInDays(endDate, now);
    const hoursLeft = differenceInHours(endDate, now);
    if (daysLeft > 0) return `${daysLeft} día${daysLeft !== 1 ? 's' : ''} restante${daysLeft !== 1 ? 's' : ''}`;
    if (hoursLeft > 0) return `${hoursLeft} hora${hoursLeft !== 1 ? 's' : ''} restante${hoursLeft !== 1 ? 's' : ''}`;
    return 'Menos de 1 hora restante';
};

const InteractionHistoryModal = ({ isOpen, setIsOpen, user }: { isOpen: boolean; setIsOpen: (open: boolean) => void; user: UserType }) => {
    const { toast } = useToast();
    const { user: currentUser } = useAuth();
    const [interactions, setInteractions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newInteraction, setNewInteraction] = useState({
        type: 'call',
        status: 'interested',
        notes: ''
    });

    useEffect(() => {
        if (!isOpen || !user.id) return;
        const { db } = getFirebaseServices();
        const q = query(
            collection(db, 'users', user.id, 'interactions'),
            orderBy('createdAt', 'desc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setInteractions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [isOpen, user.id]);

    const handleSave = async () => {
        if (!user.id || !currentUser) return;
        try {
            const { db } = getFirebaseServices();
            await addDoc(collection(db, 'users', user.id, 'interactions'), {
                ...newInteraction,
                createdBy: currentUser.id,
                createdByName: currentUser.name,
                createdAt: serverTimestamp()
            });

            // Update user document with last interaction status for quick filtering/badges
            await updateDoc(doc(db, 'users', user.id), {
                lastInteractionStatus: newInteraction.status,
                lastInteractionAt: serverTimestamp()
            });

            toast({ title: 'Interacción registrada' });
            setNewInteraction({ type: 'call', status: 'interested', notes: '' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo registrar la interacción.' });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-none bg-background rounded-3xl shadow-2xl">
                <div className="h-1.5 w-full bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600" />
                <DialogHeader className="p-8 pb-0">
                    <DialogTitle className="text-2xl font-bold font-headline">Historial de Seguimiento - {user.name}</DialogTitle>
                    <DialogDescription>Registra y consulta las interacciones con este usuario.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-hidden flex flex-col p-8 space-y-6">
                    <div className="space-y-4 bg-muted/30 p-6 rounded-2xl border border-border/50">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground ml-1">Tipo de Contacto</Label>
                                <Select value={newInteraction.type} onValueChange={(v: any) => setNewInteraction({ ...newInteraction, type: v })}>
                                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="call">Llamada</SelectItem>
                                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                        <SelectItem value="email">Correo</SelectItem>
                                        <SelectItem value="other">Otro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground ml-1">Resultado/Estado</Label>
                                <Select value={newInteraction.status} onValueChange={(v: any) => setNewInteraction({ ...newInteraction, status: v })}>
                                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="answered">Contestó</SelectItem>
                                        <SelectItem value="no_answer">No contestó</SelectItem>
                                        <SelectItem value="interested">Interesado</SelectItem>
                                        <SelectItem value="not_interested">No interesado</SelectItem>
                                        <SelectItem value="premium_purchased">Compra Premium</SelectItem>
                                        <SelectItem value="follow_up_needed">Requiere Seguimiento</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground ml-1">Notas / Comentarios</Label>
                            <Textarea
                                placeholder="Escribe detalles de la interacción..."
                                value={newInteraction.notes}
                                onChange={(e) => setNewInteraction({ ...newInteraction, notes: e.target.value })}
                                className="min-h-[80px] rounded-xl border-border/50 focus:ring-primary"
                            />
                        </div>
                        <Button className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20" onClick={handleSave}>
                            <Plus className="h-4 w-4 mr-2" />
                            Registrar Interacción
                        </Button>
                    </div>
                    <ScrollArea className="flex-1 pr-4">
                        <div className="space-y-4">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                                    <span className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                                    <p className="text-sm text-muted-foreground">Cargando historial...</p>
                                </div>
                            ) : interactions.length > 0 ? (
                                interactions.map((item) => (
                                    <div key={item.id} className="p-5 border rounded-2xl space-y-3 bg-card hover:border-primary/30 transition-colors shadow-sm">
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge variant="outline" className="capitalize rounded-lg h-7 border-border/60 bg-muted/30">
                                                    {item.type === 'call' ? <Phone className="h-3 w-3 mr-1.5" /> :
                                                        item.type === 'whatsapp' ? <MessageCircle className="h-3 w-3 mr-1.5" /> :
                                                            item.type === 'email' ? <Mail className="h-3 w-3 mr-1.5" /> : <Settings className="h-3 w-3 mr-1.5" />}
                                                    {item.type}
                                                </Badge>
                                                <Badge className={cn(
                                                    "rounded-lg h-7 font-bold",
                                                    item.status === 'premium_purchased' ? 'bg-emerald-500 text-white hover:bg-emerald-600' :
                                                        item.status === 'not_interested' ? 'bg-rose-500 text-white hover:bg-rose-600' :
                                                            item.status === 'no_answer' ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-blue-500 text-white hover:bg-blue-600'
                                                )}>
                                                    {item.status.replace('_', ' ')}
                                                </Badge>
                                            </div>
                                            <span className="text-[11px] font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                                                {item.createdAt?.toDate ? format(item.createdAt.toDate(), 'd MMM, HH:mm', { locale: es }) : ''}
                                            </span>
                                        </div>
                                        <p className="text-sm leading-relaxed text-foreground/80">{item.notes}</p>
                                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1 border-t border-border/30">
                                            <UserIcon className="h-2.5 w-2.5" />
                                            <span>Registrado por: <span className="font-semibold">{item.createdByName}</span></span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-16 space-y-4">
                                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto opacity-50">
                                        <History className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <p className="text-muted-foreground">No hay interacciones registradas aún.</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
};

const ManageSalesAccessModal = ({ isOpen, setIsOpen, user }: { isOpen: boolean; setIsOpen: (open: boolean) => void; user: UserType }) => {
    const { toast } = useToast();
    const { updateUser, setPremiumForDays } = useAuth();
    const [tokens, setTokens] = useState(user.examTokens || 0);
    const [isLoading, setIsLoading] = useState(false);

    // Custom duration state
    const [days, setDays] = useState(0);
    const [hours, setHours] = useState(0);
    const [minutes, setMinutes] = useState(0);

    const handleSaveTokens = async () => {
        setIsLoading(true);
        try {
            const { db } = getFirebaseServices();
            const { user: currentUser } = useAuth();

            await updateUser({ examTokens: tokens }, user.id);

            // Log action for admin tracking
            await addDoc(collection(db, 'staff_actions'), {
                staffId: currentUser?.id,
                staffName: currentUser?.name || 'Vendedor',
                targetUserId: user.id,
                targetUserName: user.name,
                type: 'tokens',
                value: tokens,
                description: `Asignó ${tokens} tokens`,
                createdAt: serverTimestamp()
            });

            toast({ title: 'Tokens actualizados', description: `Se asignaron ${tokens} tokens.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSetPremium = async (quickDays: number | null) => {
        setIsLoading(true);
        try {
            const { db } = getFirebaseServices();
            const { user: currentUser } = useAuth();

            await setPremiumForDays(user.id, quickDays);

            // Log action for admin tracking
            if (quickDays !== null) {
                await addDoc(collection(db, 'staff_actions'), {
                    staffId: currentUser?.id,
                    staffName: currentUser?.name || 'Vendedor',
                    targetUserId: user.id,
                    targetUserName: user.name,
                    type: 'premium',
                    value: quickDays,
                    description: quickDays === -1 ? 'Otorgó Premium Permanente' : `Otorgó Premium por ${quickDays} días`,
                    createdAt: serverTimestamp()
                });
            }

            const description = quickDays === null ? 'Se removió el acceso premium.' :
                quickDays === -1 ? 'Se otorgó acceso premium permanente.' :
                    `Se otorgó acceso premium por ${quickDays} días.`;
            toast({ title: 'Premium actualizado', description });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSetCustomPremium = async () => {
        setIsLoading(true);
        try {
            const { db } = getFirebaseServices();
            const { user: currentUser } = useAuth();

            // Convert to total days (fractional)
            const totalDays = days + (hours / 24) + (minutes / 1440);

            if (totalDays <= 0) {
                toast({ variant: 'destructive', title: 'Error', description: 'Debes especificar al menos 1 minuto.' });
                setIsLoading(false);
                return;
            }

            await setPremiumForDays(user.id, totalDays);

            // Log action for admin tracking
            await addDoc(collection(db, 'staff_actions'), {
                staffId: currentUser?.id,
                staffName: currentUser?.name || 'Vendedor',
                targetUserId: user.id,
                targetUserName: user.name,
                type: 'premium',
                value: totalDays,
                description: `Otorgó Premium Personalizado (${days}d ${hours}h ${minutes}m)`,
                createdAt: serverTimestamp()
            });

            toast({
                title: 'Premium Actualizado',
                description: `Se otorgó acceso premium por ${days}d ${hours}h ${minutes}m.`
            });
            setDays(0);
            setHours(0);
            setMinutes(0);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar el acceso premium.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-lg p-0 overflow-hidden border-none bg-background rounded-3xl shadow-2xl">
                <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" />
                <DialogHeader className="p-8 pb-0">
                    <DialogTitle className="text-2xl font-bold font-headline">Gestionar Acceso - {user.name}</DialogTitle>
                    <DialogDescription>Modifica el estado premium y tokens del usuario.</DialogDescription>
                </DialogHeader>
                <div className="p-8 space-y-6">
                    {/* Quick Premium Access */}
                    <div className="space-y-4">
                        <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Accesos Rápidos</Label>
                        <div className="grid grid-cols-2 gap-3">
                            <Button variant="outline" className="h-12 rounded-xl border-border/60 hover:bg-amber-50 hover:border-amber-200" onClick={() => handleSetPremium(30)} disabled={isLoading}>30 Días</Button>
                            <Button variant="outline" className="h-12 rounded-xl border-border/60 hover:bg-amber-50 hover:border-amber-200" onClick={() => handleSetPremium(60)} disabled={isLoading}>60 Días</Button>
                            <Button variant="outline" className="h-12 rounded-xl border-border/60 hover:bg-emerald-50 hover:border-emerald-200 text-emerald-700" onClick={() => handleSetPremium(-1)} disabled={isLoading}>Permanente</Button>
                            <Button variant="outline" className="h-12 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300" onClick={() => handleSetPremium(0)} disabled={isLoading}>Quitar Premium</Button>
                        </div>
                    </div>

                    {/* Custom Duration */}
                    <div className="space-y-4 border-t pt-6 border-border/50">
                        <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Duración Personalizada</Label>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Días</Label>
                                <Input
                                    type="number"
                                    value={days}
                                    onChange={(e) => setDays(Math.max(0, parseInt(e.target.value) || 0))}
                                    min={0}
                                    className="h-12 rounded-xl border-border/60 text-center font-bold text-lg"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Horas</Label>
                                <Input
                                    type="number"
                                    value={hours}
                                    onChange={(e) => setHours(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                                    min={0}
                                    max={23}
                                    className="h-12 rounded-xl border-border/60 text-center font-bold text-lg"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Minutos</Label>
                                <Input
                                    type="number"
                                    value={minutes}
                                    onChange={(e) => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                                    min={0}
                                    max={59}
                                    className="h-12 rounded-xl border-border/60 text-center font-bold text-lg"
                                />
                            </div>
                        </div>
                        <Button
                            className="w-full h-12 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-lg shadow-amber-600/20"
                            onClick={handleSetCustomPremium}
                            disabled={isLoading || (days === 0 && hours === 0 && minutes === 0)}
                        >
                            <Clock className="h-4 w-4 mr-2" />
                            Aplicar Duración Personalizada
                        </Button>
                    </div>

                    {/* Tokens Section */}
                    <div className="space-y-4 border-t pt-6 border-border/50">
                        <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Tokens de Exámenes</Label>
                        <div className="flex items-center gap-3">
                            <div className="relative flex-1">
                                <Coins className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="number"
                                    value={tokens}
                                    onChange={(e) => setTokens(parseInt(e.target.value))}
                                    min={0}
                                    className="h-12 pl-10 rounded-xl border-border/60 focus:ring-amber-500"
                                />
                            </div>
                            <Button className="h-12 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold" onClick={handleSaveTokens} disabled={isLoading}>
                                Guardar
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

const SendOfferModal = ({ isOpen, setIsOpen, user }: { isOpen: boolean; setIsOpen: (open: boolean) => void; user: UserType }) => {
    const { toast } = useToast();
    const [title, setTitle] = useState('¡Oferta Especial Premium!');
    const [message, setMessage] = useState('Tenemos un descuento exclusivo para que obtengas tu acceso completo. ¡Haz clic para ver!');
    const [isLoading, setIsLoading] = useState(false);

    const handleSend = async () => {
        setIsLoading(true);
        try {
            const { db } = getFirebaseServices();
            const notificationData = {
                title,
                message,
                type: 'info',
                description: message,
                createdAt: serverTimestamp(),
                recipientIds: [user.id],
                source: 'ventas_panel',
                isScheduled: false
            };
            await addDoc(collection(db, 'notifications'), notificationData);
            await fetch('/api/notifications/send-push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    description: message,
                    recipientIds: [user.id],
                    isScheduled: false,
                }),
            });
            toast({ title: 'Oferta enviada' });
            setIsOpen(false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-md p-0 overflow-hidden border-none bg-background rounded-3xl shadow-2xl">
                <div className="h-1.5 w-full bg-gradient-to-r from-primary/80 via-primary to-primary/90" />
                <DialogHeader className="p-8 pb-0">
                    <DialogTitle className="text-2xl font-bold font-headline">Enviar Oferta - {user.name}</DialogTitle>
                    <DialogDescription>Se enviará una notificación push directamente a este usuario.</DialogDescription>
                </DialogHeader>
                <div className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">Título de la Notificación</Label>
                            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-12 rounded-xl border-border/60 focus:ring-primary" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">Mensaje de la Oferta</Label>
                            <Textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="min-h-[120px] rounded-xl border-border/60 focus:ring-primary leading-relaxed"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="ghost" className="flex-1 h-12 rounded-xl text-muted-foreground" onClick={() => setIsOpen(false)}>
                            Cancelar
                        </Button>
                        <Button className="flex-2 h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20" onClick={handleSend} disabled={isLoading}>
                            <Send className="h-4 w-4 mr-2" />
                            Enviar Ahora
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};


// Modal to register a new sale for a specific user
const RegisterSaleModal = ({ isOpen, setIsOpen, user }: { isOpen: boolean; setIsOpen: (open: boolean) => void; user: UserType }) => {
    const { toast } = useToast();
    const { user: currentUser } = useAuth();
    const [amount, setAmount] = useState<string>('');
    const [item, setItem] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    const handleRegisterSale = async () => {
        if (!amount || !item) {
            toast({ variant: 'destructive', title: 'Error', description: 'Por favor completa todos los campos.' });
            return;
        }

        setIsLoading(true);
        try {
            const { db } = getFirebaseServices();
            await addDoc(collection(db, 'sales'), {
                sellerId: currentUser?.id,
                sellerName: currentUser?.name || 'Vendedor',
                buyerId: user.id,
                buyerName: user.name,
                amount: parseFloat(amount),
                item: item,
                createdAt: serverTimestamp(),
            });

            toast({
                title: 'Venta Registrada',
                description: `Se registró una venta de $${amount} a ${user.name}.`,
            });
            setIsOpen(false);
            setAmount('');
            setItem('');
        } catch (error) {
            console.error("Error registering sale:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo registrar la venta.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-md p-0 overflow-hidden border-none bg-background rounded-3xl shadow-2xl">
                <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600" />
                <DialogHeader className="p-8 pb-0">
                    <DialogTitle className="text-2xl font-bold font-headline flex items-center gap-2">
                        <ShoppingBag className="h-6 w-6 text-emerald-600" />
                        Registrar Venta
                    </DialogTitle>
                    <DialogDescription>Registra los detalles de la venta para {user.name}.</DialogDescription>
                </DialogHeader>
                <div className="p-8 space-y-5">
                    <div className="space-y-2">
                        <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground ml-1">Producto / Servicio</Label>
                        <Input
                            placeholder="Ej: Plan Premium 30 días"
                            value={item}
                            onChange={(e) => setItem(e.target.value)}
                            className="h-12 rounded-xl border-border/60 focus:ring-emerald-500"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground ml-1">Costo (MXN)</Label>
                        <div className="relative">
                            <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="number"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="h-12 pl-10 rounded-xl border-border/60 focus:ring-emerald-500"
                            />
                        </div>
                    </div>
                    <div className="pt-2">
                        <Button
                            className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-600/20"
                            onClick={handleRegisterSale}
                            disabled={isLoading}
                        >
                            {isLoading ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                            Confirmar Venta
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

const SalesUserRow = ({ user }: { user: UserType }) => {
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isSalesAccessModalOpen, setIsSalesAccessModalOpen] = useState(false);
    const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
    const [isRegisterSaleModalOpen, setIsRegisterSaleModalOpen] = useState(false);

    const isPremium = user.premiumUntil && isFuture(user.premiumUntil.toDate());
    const premiumTimeRemaining = getPremiumTimeRemaining(user.premiumUntil);

    return (
        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 p-5 border rounded-2xl transition-all hover:border-primary/50 bg-card shadow-sm">
            <Avatar className="h-14 w-14 border-2 border-background shadow-md">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">{user.name.charAt(0)}</AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center sm:text-left min-w-0">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <p className="font-bold text-lg truncate">{user.name}</p>
                    {isPremium && (
                        <div className="p-1 bg-amber-100 rounded-full">
                            <Crown className="h-3.5 w-3.5 text-amber-600 fill-amber-400" />
                        </div>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1 mt-1">
                    <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-1.5 truncate">
                        <Mail className="h-3.5 w-3.5" />
                        {user.email}
                    </p>
                    {user.phone && (
                        <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-1.5">
                            <Phone className="h-3.5 w-3.5" />
                            {user.phone}
                        </p>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start mt-2">
                    {((!isPremium && (user.examTokens || 0) === 0) ||
                        (user as any).lastInteractionStatus === 'interested' ||
                        (user as any).lastInteractionStatus === 'follow_up_needed') && (
                            <Badge className="h-6 px-2 text-[10px] font-black bg-rose-500 text-white animate-pulse">
                                🔥 POSIBLE VENTA
                            </Badge>
                        )}
                    {user.examType && (
                        <Badge variant="secondary" className="h-6 px-2 text-[10px] font-bold bg-slate-100 text-slate-700">
                            {user.examType.split(':')[0]}
                        </Badge>
                    )}
                    <Badge variant="outline" className="h-6 px-2 text-[10px] font-bold flex items-center gap-1">
                        <Coins className="h-3 w-3 text-amber-500" />
                        {user.examTokens || 0} Tokens
                    </Badge>
                    {isPremium && premiumTimeRemaining && (
                        <Badge variant="outline" className="h-6 px-2 text-[10px] font-bold text-emerald-600 border-emerald-200 bg-emerald-50">
                            Premium: {premiumTimeRemaining}
                        </Badge>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="h-10 rounded-xl px-3 border-primary/30 text-primary hover:bg-primary/5 font-bold"
                    onClick={() => setIsHistoryModalOpen(true)}
                >
                    <History className="h-4 w-4 mr-2" />
                    Historial
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-10 rounded-xl px-3 border-amber-300 text-amber-700 hover:bg-amber-50 font-bold"
                    onClick={() => setIsSalesAccessModalOpen(true)}
                >
                    <Coins className="h-4 w-4 mr-2" />
                    Acceso
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-10 rounded-xl px-3 border-emerald-400 text-emerald-700 hover:bg-emerald-50 font-bold"
                    onClick={() => setIsOfferModalOpen(true)}
                >
                    <Send className="h-4 w-4 mr-2" />
                    Oferta
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-10 rounded-xl px-3 border-emerald-400 text-emerald-700 hover:bg-emerald-50 font-bold"
                    onClick={() => setIsRegisterSaleModalOpen(true)}
                >
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Venta
                </Button>
            </div>

            <InteractionHistoryModal isOpen={isHistoryModalOpen} setIsOpen={setIsHistoryModalOpen} user={user} />
            <ManageSalesAccessModal isOpen={isSalesAccessModalOpen} setIsOpen={setIsSalesAccessModalOpen} user={user} />
            <SendOfferModal isOpen={isOfferModalOpen} setIsOpen={setIsOfferModalOpen} user={user} />
            <RegisterSaleModal isOpen={isRegisterSaleModalOpen} setIsOpen={setIsRegisterSaleModalOpen} user={user} />
        </div>
    );
};

export default function AdminSalesPage() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<UserType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [premiumFilter, setPremiumFilter] = useState('all'); // all, premium, no_premium
    const [tokenFilter, setTokenFilter] = useState('all'); // all, with_tokens, no_tokens

    useEffect(() => {
        const { db } = getFirebaseServices();
        const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as UserType));
            setUsers(usersData);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const userList = useMemo(() => {
        return users.filter(user => {
            const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase());

            const isPremium = user.premiumUntil && isFuture(user.premiumUntil.toDate());
            const matchesPremium = premiumFilter === 'all' ||
                (premiumFilter === 'premium' && isPremium) ||
                (premiumFilter === 'no_premium' && !isPremium);

            const hasTokens = (user.examTokens || 0) > 0;
            const matchesTokens = tokenFilter === 'all' ||
                (tokenFilter === 'with_tokens' && hasTokens) ||
                (tokenFilter === 'no_tokens' && !hasTokens);

            return matchesSearch && matchesPremium && matchesTokens;
        });
    }, [users, searchTerm, premiumFilter, tokenFilter]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-headline text-slate-900">CRM - Seguimiento de Usuarios</h1>
                    <p className="text-muted-foreground">Registra llamadas, gestiona el interés de los usuarios y otorga accesos premium.</p>
                </div>
            </div>

            <Card className="border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-8 py-6">
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
                                    <Users className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-bold font-headline">Panel de Ventas</CardTitle>
                                    <CardDescription>Busca usuarios y gestiona sus seguimientos.</CardDescription>
                                </div>
                            </div>
                            <div className="relative w-full sm:w-80">
                                <Input
                                    placeholder="Buscar por nombre o email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="h-11 rounded-2xl border-slate-200 focus:ring-primary pl-10 bg-white shadow-sm"
                                />
                                <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-2">
                            <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Estado Premium</Label>
                                <Select value={premiumFilter} onValueChange={setPremiumFilter}>
                                    <SelectTrigger className="h-10 rounded-xl bg-white border-slate-200 shadow-sm">
                                        <SelectValue placeholder="Filtrar Premium" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="all">Todos los usuarios</SelectItem>
                                        <SelectItem value="premium" className="text-emerald-600 font-medium">Solo Premium 👑</SelectItem>
                                        <SelectItem value="no_premium" className="text-slate-600">Sin Premium</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Tokens de Examen</Label>
                                <Select value={tokenFilter} onValueChange={setTokenFilter}>
                                    <SelectTrigger className="h-10 rounded-xl bg-white border-slate-200 shadow-sm">
                                        <SelectValue placeholder="Filtrar Tokens" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="all">Ver todos</SelectItem>
                                        <SelectItem value="with_tokens" className="text-amber-600 font-medium">Con Tokens 🪙</SelectItem>
                                        <SelectItem value="no_tokens" className="text-slate-600">Sin Tokens</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-end flex-1 min-w-[140px]">
                                <Button
                                    variant="outline"
                                    onClick={() => { setPremiumFilter('no_premium'); setTokenFilter('no_tokens'); }}
                                    className="w-full h-10 rounded-xl border-dashed border-primary/50 text-primary hover:bg-primary/5 text-xs font-bold"
                                >
                                    Filtro Alta Prioridad
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-8">
                    <ScrollArea className="h-[calc(100vh-480px)] pr-4">
                        <div className="space-y-4">
                            {isLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="flex items-center space-x-4 p-5 border rounded-2xl">
                                        <Skeleton className="h-14 w-14 rounded-full" />
                                        <div className="space-y-2 flex-1">
                                            <Skeleton className="h-5 w-3/4" />
                                            <Skeleton className="h-4 w-1/2" />
                                        </div>
                                    </div>
                                ))
                            ) : userList.length > 0 ? (
                                userList.map(user => <SalesUserRow key={user.id} user={user} />)
                            ) : (
                                <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                                    <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                    <p className="text-slate-500 font-medium italic">No se encontraron usuarios que coincidan con la búsqueda.</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}


