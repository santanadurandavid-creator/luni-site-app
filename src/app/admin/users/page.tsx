
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { User as UserType, UserRole } from '@/lib/types';
import { collection, onSnapshot, doc, updateDoc, increment, deleteDoc, addDoc, serverTimestamp, query, where, orderBy, getDocs } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Shield, Trash2, Ban, Star, Crown, Coins, MessageSquare, Phone, Mail, Eye, Clock, Activity, TrendingUp, ShoppingBag, DollarSign, LineChart, CheckCircle, ShieldCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogTrigger, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader as AlertDialogHeaderComponent, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogDescription as AlertDialogDescriptionComponent, AlertDialogFooter as AlertDialogFooterComponent } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { DynamicBanUserModal } from '@/components/shared/dynamic';
import { CustomPremiumModal } from '@/components/admin/CustomPremiumModal';
import { UserExamInfoModal } from '@/components/admin/UserExamInfoModal';
import { UserDetailsModal } from '@/components/admin/UserDetailsModal';
import { addDays, format, isFuture, differenceInDays, differenceInHours } from 'date-fns';
import { es } from 'date-fns/locale';
import { Download, User as UserIcon } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as XLSX from 'xlsx';

// Function to calculate and format remaining premium time
const getPremiumTimeRemaining = (premiumUntil: any) => {
    if (!premiumUntil) return null;

    const now = new Date();
    const endDate = premiumUntil.toDate();

    if (!isFuture(endDate)) return null;

    const daysLeft = differenceInDays(endDate, now);
    const hoursLeft = differenceInHours(endDate, now);

    if (daysLeft > 0) {
        return `${daysLeft} día${daysLeft !== 1 ? 's' : ''} restante${daysLeft !== 1 ? 's' : ''}`;
    } else if (hoursLeft > 0) {
        return `${hoursLeft} hora${hoursLeft !== 1 ? 's' : ''} restante${hoursLeft !== 1 ? 's' : ''}`;
    } else {
        return 'Menos de 1 hora restante';
    }
};



const UserRow = ({ user: userData, onBanClick, allUsers }: { user: UserType; onBanClick: (user: UserType) => void; allUsers: UserType[] }) => {
    const { toast } = useToast();
    const { user: currentUser, unbanUser, updateUser, setPremiumForDays } = useAuth();
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
    const [isRoleConfirmOpen, setIsRoleConfirmOpen] = useState(false);
    const [roleToChange, setRoleToChange] = useState<UserRole | null>(null);
    const [roleConfirmInput, setRoleConfirmInput] = useState('');
    const [customModalOpen, setCustomModalOpen] = useState(false);
    const [isReferralsModalOpen, setIsReferralsModalOpen] = useState(false);
    const [isExamInfoModalOpen, setIsExamInfoModalOpen] = useState(false);
    const [isUserDetailsModalOpen, setIsUserDetailsModalOpen] = useState(false);

    // Admin Management Modals
    const [isPremiumAccessModalOpen, setIsPremiumAccessModalOpen] = useState(false);
    const [isSubjectAccessModalOpen, setIsSubjectAccessModalOpen] = useState(false);
    const [isTokensModalOpen, setIsTokensModalOpen] = useState(false);
    const [isFullUserDetailsModalOpen, setIsFullUserDetailsModalOpen] = useState(false);
    const [isContentTrackingModalOpen, setIsContentTrackingModalOpen] = useState(false);
    const [isSalesTrackingModalOpen, setIsSalesTrackingModalOpen] = useState(false);
    const [isRegisterSaleModalOpen, setIsRegisterSaleModalOpen] = useState(false);




    const user = userData;
    const isPremium = user.premiumUntil && isFuture(user.premiumUntil.toDate());
    const premiumTimeRemaining = getPremiumTimeRemaining(user.premiumUntil);
    const isAdmin = currentUser?.role === 'admin';

    const handleDeleteUser = async () => {
        if (!user.id) return;
        try {
            const { db } = getFirebaseServices();
            await deleteDoc(doc(db, 'users', user.id));
            toast({
                title: 'Usuario Eliminado',
                description: `El usuario ${user.name} ha sido eliminado de Firestore.`,
            });
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "No se pudo eliminar el usuario." });
        } finally {
            setIsDeleteAlertOpen(false);
            setDeleteConfirmInput('');
        }
    }

    const confirmRoleChange = async (newRole: UserRole) => {
        if (!newRole || !user) return;
        try {
            await updateUser({ role: newRole }, user.id);
            toast({
                title: 'Rol Actualizado',
                description: `El rol de ${user.name} ha sido actualizado a ${newRole}.`,
            });
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "No se pudo actualizar el rol." });
        } finally {
            setIsRoleConfirmOpen(false);
            setRoleToChange(null);
            setRoleConfirmInput('');
        }
    }

    const handleRoleSelection = (newRole: UserRole) => {
        setRoleToChange(newRole);
        if (newRole === 'admin' || newRole === 'support' || newRole === 'supervisor_support' || newRole === 'content_creator' || newRole === 'ventas') {
            setIsRoleConfirmOpen(true);
        } else {
            confirmRoleChange(newRole);
        }
    }

    const handleUnbanUser = async () => {
        if (!user.id) return;
        await unbanUser(user.id);
        toast({ title: 'Usuario Desbloqueado', description: `${user.name} ha sido desbloqueado.` });
    };

    const handleSetPremium = async (days: number | null) => {
        if (!user.id) return;
        try {
            await setPremiumForDays(user.id, days);
            const planDescription = days === 10 ? '10 días (1 examen)' :
                days === 30 ? '30 días (3 exámenes)' :
                    days === 60 ? '60 días (6 exámenes)' :
                        days === -1 ? 'permanente' : 'removido';
            toast({
                title: 'Acceso Premium Actualizado',
                description: days ? `Se ha otorgado acceso premium a ${user.name} por ${planDescription}.` : `Se ha removido el acceso premium de ${user.name}.`,
            });
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "No se pudo actualizar el estado premium." });
        }
    }

    return (
        <>
            <div className={`flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 p-5 border rounded-2xl transition-all hover:border-primary/50 bg-card shadow-sm ${user.banDetails?.isBanned ? 'bg-destructive/5' : ''}`}>
                <Avatar className="h-14 w-14 border-2 border-background shadow-md">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">{user.name.charAt(0)}</AvatarFallback>
                </Avatar>

                <div className="flex-1 text-center sm:text-left min-w-0">
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                        <p className="font-bold text-lg truncate">{user.name}</p>
                        {user.role === 'admin' && (
                            <Badge variant="destructive" className="h-5 px-1.5 text-[10px] uppercase font-black tracking-tighter">Admin</Badge>
                        )}
                        {user.role === 'ventas' && (
                            <Badge className="h-5 px-1.5 text-[10px] uppercase font-black tracking-tighter bg-amber-500 hover:bg-amber-600">Ventas</Badge>
                        )}
                        {isPremium && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <div className="p-1 bg-amber-100 rounded-full">
                                            <Crown className="h-3.5 w-3.5 text-amber-600 fill-amber-400" />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="p-3 rounded-xl border-none shadow-xl">
                                        <div className="text-center space-y-1">
                                            <p className="font-bold text-amber-600">Usuario Premium</p>
                                            <p className="text-xs text-muted-foreground font-medium">
                                                {user.premiumUntil ?
                                                    `Expira: ${format(user.premiumUntil.toDate(), 'd MMM, yyyy', { locale: es })}` :
                                                    'Acceso Permanente'
                                                }
                                            </p>
                                            {premiumTimeRemaining && (
                                                <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 bg-amber-50">
                                                    {premiumTimeRemaining}
                                                </Badge>
                                            )}
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
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

                <div className="flex flex-wrap items-center gap-2 justify-center">

                    {/* Tracking Buttons for Specific Roles */}
                    {isAdmin && user.role === 'content_creator' && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-10 rounded-xl px-3 border-purple-300 text-purple-700 hover:bg-purple-50 font-bold"
                            onClick={() => setIsContentTrackingModalOpen(true)}
                        >
                            <Activity className="h-4 w-4 mr-2" />
                            Seguimiento
                        </Button>
                    )}

                    {isAdmin && user.role === 'ventas' && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-10 rounded-xl px-3 border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-bold"
                            onClick={() => setIsSalesTrackingModalOpen(true)}
                        >
                            <TrendingUp className="h-4 w-4 mr-2" />
                            Seguimiento
                        </Button>
                    )}

                    {/* Botones de Admin Originales */}
                    {(isAdmin || currentUser?.role === 'ventas') && (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-10 w-10 rounded-xl border-purple-300 text-purple-700 hover:bg-purple-50"
                                onClick={() => setIsSubjectAccessModalOpen(true)}
                                title="Gestionar Materias Premium"
                            >
                                <ShieldCheck className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-10 w-10 rounded-xl border-amber-300 text-amber-700 hover:bg-amber-50"
                                onClick={() => setIsPremiumAccessModalOpen(true)}
                                title="Gestionar Premium Global"
                            >
                                <Crown className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-10 w-10 rounded-xl border-blue-300 text-blue-700 hover:bg-blue-50"
                                onClick={() => setIsTokensModalOpen(true)}
                                title="Gestionar Tokens"
                            >
                                <Coins className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-10 w-10 rounded-xl border-primary/30 text-primary hover:bg-primary/5"
                                onClick={() => setIsFullUserDetailsModalOpen(true)}
                                title="Ver Detalles"
                            >
                                <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-10 w-10 rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                onClick={() => setIsRegisterSaleModalOpen(true)}
                                title="Registrar Venta"
                            >
                                <ShoppingBag className="h-4 w-4" />
                            </Button>

                            {isAdmin && (
                                <>
                                    <Select value={user.role || undefined} onValueChange={(role: UserRole) => handleRoleSelection(role)}>
                                        <SelectTrigger className="w-[130px] h-10 rounded-xl">
                                            <SelectValue placeholder="Rol" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="normal">Normal</SelectItem>
                                            <SelectItem value="support">Soporte</SelectItem>
                                            <SelectItem value="supervisor_support">Supervisor Soporte</SelectItem>
                                            <SelectItem value="content_creator">Contenido</SelectItem>
                                            <SelectItem value="ventas">Ventas</SelectItem>
                                            <SelectItem value="admin">Admin</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {user.banDetails?.isBanned ? (
                                        <Button variant="outline" size="sm" className="h-10 rounded-xl" onClick={handleUnbanUser}>Desbloquear</Button>
                                    ) : (
                                        <Button variant="destructive" size="icon" className="h-10 w-10 rounded-xl shadow-lg shadow-destructive/10" onClick={() => onBanClick(user)} title="Bloquear"><Ban className="h-4 w-4" /></Button>
                                    )}

                                    <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="icon" className="h-10 w-10 rounded-xl shadow-lg shadow-destructive/10" title="Eliminar"><Trash2 className="h-4 w-4" /></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="rounded-3xl p-8">
                                            <AlertDialogHeaderComponent>
                                                <AlertDialogTitleComponent className="text-2xl font-bold font-headline">¿Eliminar a {user.name}?</AlertDialogTitleComponent>
                                                <AlertDialogDescriptionComponent className="text-base py-2">
                                                    Esta acción es permanente. Se borrarán todos sus datos e historial.
                                                    <br /><br />
                                                    Escribe <span className="font-bold text-foreground inline-block bg-muted px-2 py-0.5 rounded">'eliminar'</span> para confirmar.
                                                </AlertDialogDescriptionComponent>
                                            </AlertDialogHeaderComponent>
                                            <Input value={deleteConfirmInput} onChange={(e) => setDeleteConfirmInput(e.target.value)} placeholder="eliminar" className="h-12 rounded-xl" />
                                            <AlertDialogFooterComponent className="pt-4">
                                                <AlertDialogCancel onClick={() => setDeleteConfirmInput('')} className="h-12 rounded-xl">Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleDeleteUser} disabled={deleteConfirmInput !== 'eliminar'} className="h-12 rounded-xl bg-destructive hover:bg-destructive/90">Eliminar Definitivamente</AlertDialogAction>
                                            </AlertDialogFooterComponent>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>



            {/* Modals Originales */}
            <AlertDialog open={isRoleConfirmOpen} onOpenChange={setIsRoleConfirmOpen}>
                <AlertDialogContent className="rounded-3xl p-8">
                    <AlertDialogHeaderComponent>
                        <AlertDialogTitleComponent className="text-2xl font-bold font-headline">¿Confirmar cambio de rol?</AlertDialogTitleComponent>
                        <AlertDialogDescriptionComponent className="text-base py-2">
                            Estás a punto de asignar el rol de <Badge className="mx-1">{roleToChange}</Badge> a {user.name}.
                            <br /><br />
                            Escribe <span className="font-bold text-foreground inline-block bg-muted px-2 py-0.5 rounded">'agregarrol'</span> para confirmar.
                        </AlertDialogDescriptionComponent>
                    </AlertDialogHeaderComponent>
                    <Input value={roleConfirmInput} onChange={(e) => setRoleConfirmInput(e.target.value)} placeholder="agregarrol" className="h-12 rounded-xl" />
                    <AlertDialogFooterComponent className="pt-4">
                        <AlertDialogCancel onClick={() => setRoleConfirmInput('')} className="h-12 rounded-xl">Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => roleToChange && confirmRoleChange(roleToChange)} disabled={roleConfirmInput !== 'agregarrol'} className="h-12 rounded-xl">Confirmar</AlertDialogAction>
                    </AlertDialogFooterComponent>
                </AlertDialogContent>
            </AlertDialog>
            <CustomPremiumModal isOpen={customModalOpen} setIsOpen={setCustomModalOpen} user={user} />
            <ReferralsModal isOpen={isReferralsModalOpen} setIsOpen={setIsReferralsModalOpen} user={user} allUsers={allUsers} />
            <UserExamInfoModal isOpen={isExamInfoModalOpen} setIsOpen={setIsExamInfoModalOpen} user={user} />
            <UserDetailsModal isOpen={isUserDetailsModalOpen} setIsOpen={setIsUserDetailsModalOpen} user={user} />

            {/* New Admin Modals */}
            <PremiumAccessModal isOpen={isPremiumAccessModalOpen} setIsOpen={setIsPremiumAccessModalOpen} user={user} />
            <SubjectAccessModal isOpen={isSubjectAccessModalOpen} setIsOpen={setIsSubjectAccessModalOpen} user={user} />
            <TokensManagementModal isOpen={isTokensModalOpen} setIsOpen={setIsTokensModalOpen} user={user} />
            <FullUserDetailsModal isOpen={isFullUserDetailsModalOpen} setIsOpen={setIsFullUserDetailsModalOpen} user={user} />

            {/* Tracking Modals */}
            <ContentCreatorTrackingModal isOpen={isContentTrackingModalOpen} setIsOpen={setIsContentTrackingModalOpen} user={user} />
            <SalesTrackingModal isOpen={isSalesTrackingModalOpen} setIsOpen={setIsSalesTrackingModalOpen} user={user} />
            <RegisterSaleModal isOpen={isRegisterSaleModalOpen} setIsOpen={setIsRegisterSaleModalOpen} user={user} />
        </>
    );
};

// Subject Specific Access Modal
const SubjectAccessModal = ({ isOpen, setIsOpen, user }: { isOpen: boolean; setIsOpen: (open: boolean) => void; user: UserType }) => {
    const { toast } = useToast();
    const [unlockedSubjects, setUnlockedSubjects] = useState<string[]>(user.unlockedSubjects || []);
    const [isLoading, setIsLoading] = useState(false);

    const subjects = [
        'Matemáticas',
        'Física',
        'Historia',
        'Química',
        'Biología',
        'Literatura',
        'Razonamiento Matemático',
        'Razonamiento Verbal',
        'Geografía',
        'Español',
        'Filosofía'
    ];

    useEffect(() => {
        setUnlockedSubjects(user.unlockedSubjects || []);
    }, [user.unlockedSubjects, isOpen]);

    const handleToggleSubject = (subject: string) => {
        if (unlockedSubjects.includes(subject)) {
            setUnlockedSubjects(unlockedSubjects.filter(s => s !== subject));
        } else {
            setUnlockedSubjects([...unlockedSubjects, subject]);
        }
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const { db } = getFirebaseServices();
            await updateDoc(doc(db, 'users', user.id), {
                unlockedSubjects: unlockedSubjects
            });
            toast({
                title: 'Materias Actualizadas',
                description: `Se han actualizado los accesos de ${user.name}.`
            });
            setIsOpen(false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar el acceso.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-lg p-0 overflow-hidden border-none bg-background rounded-3xl shadow-2xl">
                <div className="h-1.5 w-full bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600" />

                <DialogHeader className="p-8 pb-0">
                    <DialogTitle className="text-2xl font-bold font-headline flex items-center gap-2">
                        <ShieldCheck className="h-6 w-6 text-purple-600" />
                        Acceso por Materia - {user.name}
                    </DialogTitle>
                    <DialogDescription>Selecciona las materias a las que el usuario tendrá acceso premium individual.</DialogDescription>
                </DialogHeader>

                <div className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-3">
                        {subjects.map((subject) => (
                            <div
                                key={subject}
                                onClick={() => handleToggleSubject(subject)}
                                className={cn(
                                    "flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer",
                                    unlockedSubjects.includes(subject)
                                        ? "border-purple-500 bg-purple-50 text-purple-700 shadow-md scale-[1.02]"
                                        : "border-slate-100 bg-slate-50 text-slate-500 hover:border-purple-200"
                                )}
                            >
                                <span className="font-bold text-sm">{subject}</span>
                                {unlockedSubjects.includes(subject) && <CheckCircle className="h-5 w-5 text-purple-500" />}
                            </div>
                        ))}
                    </div>

                    <Button
                        className="w-full h-14 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-lg shadow-xl shadow-purple-600/20 transition-all hover:scale-[1.02]"
                        onClick={handleSave}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// Premium Access Management Modal
const PremiumAccessModal = ({ isOpen, setIsOpen, user }: { isOpen: boolean; setIsOpen: (open: boolean) => void; user: UserType }) => {
    const { toast } = useToast();
    const { setPremiumForDays } = useAuth();
    const [days, setDays] = useState(0);
    const [hours, setHours] = useState(0);
    const [minutes, setMinutes] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const handleSetCustomPremium = async () => {
        setIsLoading(true);
        try {
            // Convert to total days (fractional)
            const totalDays = days + (hours / 24) + (minutes / 1440);

            if (totalDays <= 0) {
                toast({ variant: 'destructive', title: 'Error', description: 'Debes especificar al menos 1 minuto.' });
                setIsLoading(false);
                return;
            }

            await setPremiumForDays(user.id, totalDays);
            toast({
                title: 'Premium Actualizado',
                description: `Se otorgó acceso premium por ${days}d ${hours}h ${minutes}m a ${user.name}.`
            });
            setIsOpen(false);
            setDays(0);
            setHours(0);
            setMinutes(0);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar el acceso premium.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickAccess = async (quickDays: number | null) => {
        setIsLoading(true);
        try {
            await setPremiumForDays(user.id, quickDays);
            const description = quickDays === null ? 'Se removió el acceso premium.' :
                quickDays === -1 ? 'Se otorgó acceso premium permanente.' :
                    `Se otorgó acceso premium por ${quickDays} días.`;
            toast({ title: 'Premium Actualizado', description });
            setIsOpen(false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-lg p-0 overflow-hidden border-none bg-background rounded-3xl shadow-2xl">
                <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" />

                <DialogHeader className="p-8 pb-0">
                    <DialogTitle className="text-2xl font-bold font-headline flex items-center gap-2">
                        <Crown className="h-6 w-6 text-amber-600" />
                        Gestionar Acceso Premium - {user.name}
                    </DialogTitle>
                    <DialogDescription>Personaliza la duración del acceso premium con precisión.</DialogDescription>
                </DialogHeader>

                <div className="p-8 space-y-6">
                    {/* Quick Access Buttons */}
                    <div className="space-y-3">
                        <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Accesos Rápidos</Label>
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                variant="outline"
                                className="h-12 rounded-xl border-border/60 hover:bg-amber-50 hover:border-amber-200"
                                onClick={() => handleQuickAccess(30)}
                                disabled={isLoading}
                            >
                                30 Días
                            </Button>
                            <Button
                                variant="outline"
                                className="h-12 rounded-xl border-border/60 hover:bg-amber-50 hover:border-amber-200"
                                onClick={() => handleQuickAccess(60)}
                                disabled={isLoading}
                            >
                                60 Días
                            </Button>
                            <Button
                                variant="outline"
                                className="h-12 rounded-xl border-border/60 hover:bg-amber-50 hover:border-amber-200"
                                onClick={() => handleQuickAccess(90)}
                                disabled={isLoading}
                            >
                                90 Días
                            </Button>
                            <Button
                                variant="outline"
                                className="h-12 rounded-xl border-border/60 hover:bg-emerald-50 hover:border-emerald-200 text-emerald-700"
                                onClick={() => handleQuickAccess(-1)}
                                disabled={isLoading}
                            >
                                Permanente
                            </Button>
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

                    {/* Remove Premium */}
                    <div className="border-t pt-6 border-border/50">
                        <Button
                            variant="outline"
                            className="w-full h-12 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 font-bold"
                            onClick={() => handleQuickAccess(0)}
                            disabled={isLoading}
                        >
                            Quitar Acceso Premium
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// Tokens Management Modal
const TokensManagementModal = ({ isOpen, setIsOpen, user }: { isOpen: boolean; setIsOpen: (open: boolean) => void; user: UserType }) => {
    const { toast } = useToast();
    const { updateUser } = useAuth();
    const [tokens, setTokens] = useState(user.examTokens || 0);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTokens(user.examTokens || 0);
        }
    }, [isOpen, user.examTokens]);

    const handleSaveTokens = async () => {
        setIsLoading(true);
        try {
            await updateUser({ examTokens: tokens }, user.id);
            toast({ title: 'Tokens Actualizados', description: `Se asignaron ${tokens} tokens a ${user.name}.` });
            setIsOpen(false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron actualizar los tokens.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickTokens = (amount: number) => {
        setTokens(Math.max(0, tokens + amount));
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-md p-0 overflow-hidden border-none bg-background rounded-3xl shadow-2xl">
                <div className="h-1.5 w-full bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600" />

                <DialogHeader className="p-8 pb-0">
                    <DialogTitle className="text-2xl font-bold font-headline flex items-center gap-2">
                        <Coins className="h-6 w-6 text-blue-600" />
                        Gestionar Tokens - {user.name}
                    </DialogTitle>
                    <DialogDescription>Asigna o modifica los tokens de examen del usuario.</DialogDescription>
                </DialogHeader>

                <div className="p-8 space-y-6">
                    {/* Current Tokens Display */}
                    <div className="bg-muted/30 p-6 rounded-2xl border border-border/50 text-center">
                        <p className="text-sm text-muted-foreground mb-2">Tokens Actuales</p>
                        <p className="text-4xl font-bold text-blue-600">{tokens}</p>
                    </div>

                    {/* Quick Add/Remove */}
                    <div className="space-y-3">
                        <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Ajustes Rápidos</Label>
                        <div className="grid grid-cols-4 gap-2">
                            <Button
                                variant="outline"
                                className="h-10 rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50"
                                onClick={() => handleQuickTokens(-10)}
                            >
                                -10
                            </Button>
                            <Button
                                variant="outline"
                                className="h-10 rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50"
                                onClick={() => handleQuickTokens(-1)}
                            >
                                -1
                            </Button>
                            <Button
                                variant="outline"
                                className="h-10 rounded-xl text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                onClick={() => handleQuickTokens(1)}
                            >
                                +1
                            </Button>
                            <Button
                                variant="outline"
                                className="h-10 rounded-xl text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                onClick={() => handleQuickTokens(10)}
                            >
                                +10
                            </Button>
                        </div>
                    </div>

                    {/* Manual Input */}
                    <div className="space-y-3">
                        <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Cantidad Exacta</Label>
                        <div className="relative">
                            <Coins className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                type="number"
                                value={tokens}
                                onChange={(e) => setTokens(Math.max(0, parseInt(e.target.value) || 0))}
                                min={0}
                                className="h-14 pl-12 rounded-xl border-border/60 text-center font-bold text-xl"
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <Button
                            variant="outline"
                            className="flex-1 h-12 rounded-xl"
                            onClick={() => setIsOpen(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-600/20"
                            onClick={handleSaveTokens}
                            disabled={isLoading}
                        >
                            Guardar Tokens
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// Full User Details Modal
const FullUserDetailsModal = ({ isOpen, setIsOpen, user }: { isOpen: boolean; setIsOpen: (open: boolean) => void; user: UserType }) => {
    const isPremium = user.premiumUntil && isFuture(user.premiumUntil.toDate());
    const premiumTimeRemaining = getPremiumTimeRemaining(user.premiumUntil);

    // Calculate total study time
    const totalStudyMinutes = user.studyTime ? Object.values(user.studyTime).reduce((sum: number, val: any) => sum + (val || 0), 0) / 60 : 0;
    const studyHours = Math.floor(totalStudyMinutes / 60);
    const studyMinutes = Math.floor(totalStudyMinutes % 60);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden border-none bg-background rounded-3xl shadow-2xl">
                <div className="h-1.5 w-full bg-gradient-to-r from-primary/80 via-primary to-primary/90" />

                <DialogHeader className="p-8 pb-0">
                    <DialogTitle className="text-2xl font-bold font-headline flex items-center gap-2">
                        <Eye className="h-6 w-6 text-primary" />
                        Detalles Completos del Usuario
                    </DialogTitle>
                    <DialogDescription>Información completa de {user.name}</DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[calc(90vh-180px)]">
                    <div className="p-8 space-y-6">
                        {/* Basic Info */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Users className="h-5 w-5 text-primary" />
                                Información Básica
                            </h3>
                            <div className="grid grid-cols-2 gap-4 bg-muted/30 p-6 rounded-2xl border border-border/50">
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Nombre</p>
                                    <p className="font-bold">{user.name}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Email</p>
                                    <p className="font-bold truncate">{user.email}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Teléfono</p>
                                    <p className="font-bold">{user.phone || 'No registrado'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Rol</p>
                                    <Badge>{user.role || 'normal'}</Badge>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Tipo de Examen</p>
                                    <p className="font-bold">{user.examType?.split(':')[0] || 'No seleccionado'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">ID de Usuario</p>
                                    <p className="font-mono text-xs">{user.id}</p>
                                </div>
                            </div>
                        </div>

                        {/* Premium Status */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Crown className="h-5 w-5 text-amber-600" />
                                Estado Premium
                            </h3>
                            <div className="bg-muted/30 p-6 rounded-2xl border border-border/50 space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">Estado</p>
                                    <Badge variant={isPremium ? "default" : "outline"} className={isPremium ? "bg-amber-500" : ""}>
                                        {isPremium ? 'Premium Activo' : 'No Premium'}
                                    </Badge>
                                </div>
                                {isPremium && user.premiumUntil && (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-muted-foreground">Expira</p>
                                            <p className="font-bold">{format(user.premiumUntil.toDate(), 'd MMM, yyyy HH:mm', { locale: es })}</p>
                                        </div>
                                        {premiumTimeRemaining && (
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm text-muted-foreground">Tiempo Restante</p>
                                                <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                                                    {premiumTimeRemaining}
                                                </Badge>
                                            </div>
                                        )}
                                    </>
                                )}
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">Plan</p>
                                    <p className="font-bold">{user.premiumPlan || 'Ninguno'}</p>
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">Tokens de Examen</p>
                                    <Badge variant="outline" className="flex items-center gap-1">
                                        <Coins className="h-3 w-3 text-amber-500" />
                                        {user.examTokens || 0}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">Exámenes Tomados (Periodo Actual)</p>
                                    <p className="font-bold">{user.examsTakenThisPeriod || 0}</p>
                                </div>
                            </div>
                        </div>

                        {/* Study Progress */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Star className="h-5 w-5 text-primary" />
                                Progreso de Estudio
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-muted/30 p-6 rounded-2xl border border-border/50 text-center">
                                    <p className="text-xs text-muted-foreground mb-2">Tiempo de Estudio</p>
                                    <p className="text-2xl font-bold text-primary">{studyHours}h {studyMinutes}m</p>
                                </div>
                                <div className="bg-muted/30 p-6 rounded-2xl border border-border/50 text-center">
                                    <p className="text-xs text-muted-foreground mb-2">Quizzes Completados</p>
                                    <p className="text-2xl font-bold text-primary">{user.quizzesCompleted || 0}</p>
                                </div>
                                <div className="bg-muted/30 p-6 rounded-2xl border border-border/50 text-center">
                                    <p className="text-xs text-muted-foreground mb-2">Lecturas Completadas</p>
                                    <p className="text-2xl font-bold text-primary">{user.readingsCompleted || 0}</p>
                                </div>
                                <div className="bg-muted/30 p-6 rounded-2xl border border-border/50 text-center">
                                    <p className="text-xs text-muted-foreground mb-2">Multimedia Visto</p>
                                    <p className="text-2xl font-bold text-primary">{user.multimediaWatched || 0}</p>
                                </div>
                            </div>
                        </div>

                        {/* Exam Results */}
                        {user.examResults && user.examResults.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-primary" />
                                    Resultados de Exámenes ({user.examResults.length})
                                </h3>
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {user.examResults.slice(0, 5).map((result, idx) => (
                                        <div key={idx} className="bg-muted/30 p-4 rounded-xl border border-border/50 flex items-center justify-between">
                                            <div>
                                                <p className="font-bold">{result.examName || 'Examen'}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {result.completedAt ? format(result.completedAt.toDate(), 'd MMM, yyyy', { locale: es }) : 'Fecha desconocida'}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-primary">{result.score}%</p>
                                                <p className="text-xs text-muted-foreground">{result.correctAnswers}/{result.totalQuestions}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {user.examResults.length > 5 && (
                                        <p className="text-xs text-center text-muted-foreground pt-2">
                                            Y {user.examResults.length - 5} exámenes más...
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Additional Info */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-lg">Información Adicional</h3>
                            <div className="bg-muted/30 p-6 rounded-2xl border border-border/50 space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">Clases Registradas</p>
                                    <p className="font-bold">{user.registeredClasses?.length || 0}</p>
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">Contenido Gratuito Visto</p>
                                    <p className="font-bold">{user.viewedFreeContentIds?.length || 0}</p>
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">Examen Diagnóstico</p>
                                    <Badge variant={user.hasTakenDiagnosticExam ? "default" : "outline"}>
                                        {user.hasTakenDiagnosticExam ? 'Completado' : 'Pendiente'}
                                    </Badge>
                                </div>
                                {user.banDetails?.isBanned && (
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-muted-foreground">Estado de Cuenta</p>
                                        <Badge variant="destructive">Baneado</Badge>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                <div className="p-6 border-t">
                    <Button className="w-full h-12 rounded-xl" onClick={() => setIsOpen(false)}>
                        Cerrar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// Content Creator Tracking Modal
const ContentCreatorTrackingModal = ({ isOpen, setIsOpen, user }: { isOpen: boolean; setIsOpen: (open: boolean) => void; user: UserType }) => {
    const [content, setContent] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!isOpen || !user.id) return;
        const { db } = getFirebaseServices();
        const q = query(
            collection(db, 'content'),
            where('createdBy', '==', user.id),
            orderBy('createdAt', 'desc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setContent(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [isOpen, user.id]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden border-none bg-background rounded-3xl shadow-2xl">
                <div className="h-1.5 w-full bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600" />

                <DialogHeader className="p-8 pb-0">
                    <DialogTitle className="text-2xl font-bold font-headline flex items-center gap-2">
                        <Activity className="h-6 w-6 text-purple-600" />
                        Seguimiento de Contenido - {user.name}
                    </DialogTitle>
                    <DialogDescription>Todo el contenido creado por este usuario.</DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[calc(90vh-180px)] p-8">
                    <div className="space-y-4">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 space-y-3">
                                <span className="animate-spin h-6 w-6 border-2 border-purple-600 border-t-transparent rounded-full" />
                                <p className="text-sm text-muted-foreground">Cargando contenido...</p>
                            </div>
                        ) : content.length > 0 ? (
                            <div className="space-y-3">
                                {content.map((item) => (
                                    <div key={item.id} className="p-5 border rounded-2xl space-y-3 bg-card hover:border-purple-300 transition-colors shadow-sm">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <h4 className="font-bold text-lg">{item.title || 'Sin título'}</h4>
                                                <p className="text-sm text-muted-foreground mt-1">{item.description || 'Sin descripción'}</p>
                                            </div>
                                            <Badge variant="outline" className="ml-4">
                                                {item.type || 'Desconocido'}
                                            </Badge>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-2 border-t">
                                            <div className="flex items-center gap-1">
                                                <Star className="h-3 w-3" />
                                                <span>Área: {item.area || 'N/A'}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                <span>
                                                    {item.createdAt?.toDate ? format(item.createdAt.toDate(), 'd MMM, yyyy HH:mm', { locale: es }) : 'Fecha desconocida'}
                                                </span>
                                            </div>
                                            {item.isPremium && (
                                                <Badge variant="default" className="h-5 text-[10px] bg-amber-500">
                                                    Premium
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16 space-y-4">
                                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto opacity-50">
                                    <Activity className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <p className="text-muted-foreground">No ha creado contenido aún.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <div className="p-6 border-t flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        Total: <span className="font-bold text-foreground">{content.length}</span> contenidos creados
                    </p>
                    <Button className="h-10 rounded-xl" onClick={() => setIsOpen(false)}>
                        Cerrar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// Sales Tracking Modal
const SalesTrackingModal = ({ isOpen, setIsOpen, user }: { isOpen: boolean; setIsOpen: (open: boolean) => void; user: UserType }) => {
    const [salesData, setSalesData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({ totalSales: 0, totalDays: 0, totalTokens: 0, totalAmount: 0 });

    useEffect(() => {
        if (!isOpen || !user.id) return;
        const { db } = getFirebaseServices();

        // Query all users to find those with interactions from this sales user
        const unsubscribe = onSnapshot(collection(db, 'users'), async (snapshot) => {
            const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserType));
            const sales: any[] = [];
            let totalDays = 0;
            let totalTokens = 0;
            let totalAmount = 0;

            for (const targetUser of allUsers) {
                if (!targetUser.id) continue;

                // Get interactions for this user created by the sales person
                const interactionsQuery = query(
                    collection(db, 'users', targetUser.id, 'interactions'),
                    where('createdBy', '==', user.id),
                    orderBy('createdAt', 'desc')
                );

                const interactionsSnapshot = await getDocs(interactionsQuery);
                const interactions = interactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

                // Check if this user has premium (granted by this sales person potentially)
                const hasPremium = targetUser.premiumUntil && isFuture(targetUser.premiumUntil.toDate());

                if (interactions.length > 0 || hasPremium) {
                    const premiumDays = hasPremium && targetUser.premiumUntil
                        ? differenceInDays(targetUser.premiumUntil.toDate(), new Date())
                        : 0;

                    sales.push({
                        userId: targetUser.id,
                        userName: targetUser.name,
                        userEmail: targetUser.email,
                        interactions: interactions.length,
                        hasPremium,
                        premiumDays,
                        tokens: targetUser.examTokens || 0,
                        lastInteraction: interactions[0]?.createdAt,
                        premiumPlan: targetUser.premiumPlan || 'N/A'
                    });

                    if (hasPremium) {
                        totalDays += premiumDays;
                        totalTokens += targetUser.examTokens || 0;
                        // Estimate amount (you can adjust this calculation)
                        totalAmount += premiumDays * 10; // Example: $10 per day
                    }
                }
            }

            setSalesData(sales);
            setStats({
                totalSales: sales.filter(s => s.hasPremium).length,
                totalDays,
                totalTokens,
                totalAmount
            });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [isOpen, user.id]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden border-none bg-background rounded-3xl shadow-2xl">
                <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600" />

                <DialogHeader className="p-8 pb-0">
                    <DialogTitle className="text-2xl font-bold font-headline flex items-center gap-2">
                        <TrendingUp className="h-6 w-6 text-emerald-600" />
                        Seguimiento de Ventas - {user.name}
                    </DialogTitle>
                    <DialogDescription>Estadísticas y seguimiento de todas las ventas realizadas.</DialogDescription>
                </DialogHeader>

                {/* Stats Cards */}
                <div className="px-8 grid grid-cols-4 gap-4">
                    <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200">
                        <p className="text-xs text-emerald-700 font-bold uppercase tracking-wider mb-1">Total Ventas</p>
                        <p className="text-3xl font-bold text-emerald-600">{stats.totalSales}</p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200">
                        <p className="text-xs text-blue-700 font-bold uppercase tracking-wider mb-1">Días Premium</p>
                        <p className="text-3xl font-bold text-blue-600">{stats.totalDays}</p>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200">
                        <p className="text-xs text-amber-700 font-bold uppercase tracking-wider mb-1">Tokens</p>
                        <p className="text-3xl font-bold text-amber-600">{stats.totalTokens}</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200">
                        <p className="text-xs text-purple-700 font-bold uppercase tracking-wider mb-1">Monto Est.</p>
                        <p className="text-3xl font-bold text-purple-600">${stats.totalAmount}</p>
                    </div>
                </div>

                <ScrollArea className="max-h-[calc(90vh-350px)] px-8 pb-8">
                    <div className="space-y-3">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 space-y-3">
                                <span className="animate-spin h-6 w-6 border-2 border-emerald-600 border-t-transparent rounded-full" />
                                <p className="text-sm text-muted-foreground">Cargando ventas...</p>
                            </div>
                        ) : salesData.length > 0 ? (
                            salesData.map((sale) => (
                                <div key={sale.userId} className="p-5 border rounded-2xl space-y-3 bg-card hover:border-emerald-300 transition-colors shadow-sm">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h4 className="font-bold text-lg">{sale.userName}</h4>
                                            <p className="text-sm text-muted-foreground">{sale.userEmail}</p>
                                        </div>
                                        {sale.hasPremium && (
                                            <Badge className="bg-emerald-500">Premium Activo</Badge>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-4 gap-3 pt-3 border-t">
                                        <div className="text-center">
                                            <p className="text-xs text-muted-foreground mb-1">Interacciones</p>
                                            <p className="text-lg font-bold">{sale.interactions}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-muted-foreground mb-1">Días Premium</p>
                                            <p className="text-lg font-bold text-blue-600">{sale.premiumDays}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-muted-foreground mb-1">Tokens</p>
                                            <p className="text-lg font-bold text-amber-600">{sale.tokens}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-muted-foreground mb-1">Plan</p>
                                            <p className="text-sm font-bold">{sale.premiumPlan}</p>
                                        </div>
                                    </div>
                                    {sale.lastInteraction?.toDate && (
                                        <p className="text-xs text-muted-foreground pt-2 border-t">
                                            Última interacción: {format(sale.lastInteraction.toDate(), 'd MMM, yyyy HH:mm', { locale: es })}
                                        </p>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-16 space-y-4">
                                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto opacity-50">
                                    <TrendingUp className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <p className="text-muted-foreground">No hay ventas registradas aún.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <div className="p-6 border-t">
                    <Button className="w-full h-12 rounded-xl" onClick={() => setIsOpen(false)}>
                        Cerrar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

const UserRowSkeleton = () => (
    <div className="flex items-center space-x-4 p-4 border rounded-lg">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
        </div>
    </div>
);

const ReferralsModal = ({ isOpen, setIsOpen, user, allUsers }: { isOpen: boolean; setIsOpen: (open: boolean) => void; user: UserType; allUsers: UserType[] }) => {
    const { toast } = useToast();
    const [referredBy, setReferredBy] = useState(user.referredBy || '');
    const [referrals, setReferrals] = useState<string[]>(user.referrals || []);
    const [isEditing, setIsEditing] = useState(false);

    const handleSave = async () => {
        try {
            const { db } = getFirebaseServices();
            await updateDoc(doc(db, 'users', user.id), {
                referredBy: referredBy || null,
                referrals: referrals
            });
            toast({ title: 'Información actualizada', description: 'Los datos de referidos han sido guardados.' });
            setIsEditing(false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la información.' });
        }
    };

    const addReferral = (userId: string) => {
        if (!referrals.includes(userId)) {
            setReferrals([...referrals, userId]);
        }
    };

    const removeReferral = (userId: string) => {
        setReferrals(referrals.filter(id => id !== userId));
    };

    const referredByUser = allUsers.find(u => u.id === referredBy);
    const referredUsers = allUsers.filter(u => referrals.includes(u.id));

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Información de Referidos - {user.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                    <div>
                        <h3 className="font-semibold mb-2">Referido por:</h3>
                        {isEditing ? (
                            <Input
                                placeholder="ID del usuario que lo refirió"
                                value={referredBy}
                                onChange={(e) => setReferredBy(e.target.value)}
                            />
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                {referredByUser ? `${referredByUser.name} (${referredByUser.email})` : referredBy || 'No especificado'}
                            </p>
                        )}
                    </div>

                    <div>
                        <h3 className="font-semibold mb-2">Usuarios referidos:</h3>
                        {isEditing ? (
                            <div className="space-y-2">
                                <Select onValueChange={addReferral}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Agregar usuario referido" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allUsers.filter(u => u.id !== user.id && !referrals.includes(u.id)).map(u => (
                                            <SelectItem key={u.id} value={u.id}>
                                                {u.name} ({u.email})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <div className="space-y-1">
                                    {referrals.map(refId => {
                                        const refUser = allUsers.find(u => u.id === refId);
                                        return (
                                            <div key={refId} className="flex items-center justify-between p-2 border rounded">
                                                <span className="text-sm">
                                                    {refUser ? `${refUser.name} (${refUser.email})` : refId}
                                                </span>
                                                <Button variant="ghost" size="sm" onClick={() => removeReferral(refId)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {referredUsers.length > 0 ? (
                                    referredUsers.map(refUser => (
                                        <p key={refUser.id} className="text-sm text-muted-foreground">
                                            {refUser.name} ({refUser.email})
                                        </p>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground">No hay usuarios referidos</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    {isEditing ? (
                        <>
                            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancelar</Button>
                            <Button onClick={handleSave}>Guardar</Button>
                        </>
                    ) : (
                        <Button onClick={() => setIsEditing(true)}>Editar</Button>
                    )}
                </DialogFooter>
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


export default function AdminUsersPage() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<UserType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [isBanModalOpen, setIsBanModalOpen] = useState(false);
    const [userToBan, setUserToBan] = useState<UserType | null>(null);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

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
            const matchesRole = roleFilter === 'all' || user.role === roleFilter;
            return matchesSearch && matchesRole;
        });
    }, [users, searchTerm, roleFilter]);

    const handleBanClick = (user: UserType) => {
        setUserToBan(user);
        setIsBanModalOpen(true);
    };

    const handleExportUsers = async () => {
        setIsExporting(true);
        try {
            const exportData = users.map(user => ({
                'Nombre': user.name,
                'Correo': user.email,
                'ID Referido': user.userId || '',
                'Teléfono': user.phone || '',
                'Área': user.examType || '',
                'Premium Activo': user.premiumUntil && isFuture(user.premiumUntil.toDate()) ? 'Sí' : 'No',
                'Plan Premium': user.premiumPlan === '10-day' ? '10 Días (1 Examen)' :
                    user.premiumPlan === '30-day' ? '30 Días (3 Exámenes)' :
                        user.premiumPlan === '60-day' ? '60 Días (6 Exámenes)' :
                            user.premiumPlan === 'permanent' ? 'Permanente' :
                                user.premiumPlan === 'trial' ? 'Prueba' :
                                    user.premiumPlan === 'custom' ? 'Personalizado' : 'Sin Plan',
                'Exámenes Tomados': user.examsTakenThisPeriod || 0,
                'Quizzes Completados': user.quizzesCompleted || 0,
                'Rol': user.role === 'admin' ? 'Administrador' :
                    user.role === 'supervisor_support' ? 'Supervisor Soporte' :
                        user.role === 'content_creator' ? 'Creador de Contenido' :
                            user.role === 'support' ? 'Soporte' : 'Normal',
                'Bloqueado': user.banDetails?.isBanned ? 'Sí' : 'No',
                'Fecha Registro': '',
                'Seguimiento Llamada': '',
                'Seguimiento Mensaje': '',
                'Comentarios': '',
                'Resultado': ''
            }));

            // Export to Excel
            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Usuarios');

            // Auto-size columns
            const colWidths = [
                { wch: 20 }, // Nombre
                { wch: 30 }, // Correo
                { wch: 15 }, // Teléfono
                { wch: 25 }, // Área
                { wch: 15 }, // Premium Activo
                { wch: 20 }, // Plan Premium
                { wch: 15 }, // Exámenes Tomados
                { wch: 20 }, // Quizzes Completados
                { wch: 15 }, // Rol
                { wch: 10 }, // Bloqueado
                { wch: 20 }, // Fecha Registro
                { wch: 25 }, // Seguimiento Llamada
                { wch: 25 }, // Seguimiento Mensaje
                { wch: 30 }, // Comentarios
                { wch: 20 }  // Resultado
            ];
            ws['!cols'] = colWidths;

            XLSX.writeFile(wb, `usuarios_${format(new Date(), 'yyyy-MM-dd_HH-mm', { locale: es })}.xlsx`);

            // Export to JSON
            const jsonData = users.map(user => ({
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone || '',
                examType: user.examType || '',
                premiumActive: user.premiumUntil && isFuture(user.premiumUntil.toDate()),
                premiumPlan: user.premiumPlan,
                examsTakenThisPeriod: user.examsTakenThisPeriod || 0,
                quizzesCompleted: user.quizzesCompleted || 0,
                role: user.role,
                isBanned: user.banDetails?.isBanned || false,
                banReason: user.banDetails?.reason || '',
                premiumUntil: user.premiumUntil ? user.premiumUntil.toDate().toISOString() : null,
                registeredAt: '', // Placeholder, as it's not in the type
                followUpCall: '',
                followUpMessage: '',
                comments: '',
                result: ''
            }));

            const jsonBlob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
            const jsonUrl = URL.createObjectURL(jsonBlob);
            const jsonLink = document.createElement('a');
            jsonLink.href = jsonUrl;
            jsonLink.download = `usuarios_${format(new Date(), 'yyyy-MM-dd_HH-mm', { locale: es })}.json`;
            document.body.appendChild(jsonLink);
            jsonLink.click();
            document.body.removeChild(jsonLink);
            URL.revokeObjectURL(jsonUrl);
        } catch (error) {
            console.error('Error exporting users:', error);
        } finally {
            setIsExporting(false);
            setIsExportModalOpen(false);
        }
    };

    return (
        <>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold font-headline">Gestión de Usuarios</h1>
                        <p className="text-muted-foreground">
                            {currentUser?.role === 'ventas' ? 'Administra y gestiona el acceso premium de tus clientes.' : 'Administra los roles, acceso y estado premium de los usuarios.'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {currentUser?.role === 'admin' && (
                            <Button variant="outline" size="sm" onClick={() => setIsExportModalOpen(true)}>
                                <Download className="h-4 w-4 mr-2" />
                                Exportar Base de Datos
                            </Button>
                        )}
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users />
                            Usuarios de la Plataforma
                        </CardTitle>
                        <CardDescription>
                            Busca usuarios, gestiona sus roles y su acceso premium.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Input
                                placeholder="Buscar usuario por nombre o email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="flex-1"
                            />
                            <Select value={roleFilter} onValueChange={setRoleFilter}>
                                <SelectTrigger className="w-full sm:w-[200px]">
                                    <SelectValue placeholder="Filtrar por rol" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los roles</SelectItem>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="ventas">Ventas</SelectItem>
                                    <SelectItem value="content_creator">Creador de Contenido</SelectItem>
                                    <SelectItem value="support">Soporte</SelectItem>
                                    <SelectItem value="supervisor_support">Supervisor Soporte</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <ScrollArea className="h-[calc(100vh-420px)] mt-4 pr-4">
                            <div className="space-y-4">
                                {isLoading ? (
                                    Array.from({ length: 3 }).map((_, i) => <UserRowSkeleton key={i} />)
                                ) : userList.length > 0 ? (
                                    userList.map(user => <UserRow key={user.id} user={user} onBanClick={handleBanClick} allUsers={users} />)
                                ) : (
                                    <p className="text-center text-muted-foreground py-8">No se encontraron usuarios.</p>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
            <DynamicBanUserModal
                isOpen={isBanModalOpen}
                setIsOpen={setIsBanModalOpen}
                userToBan={userToBan}
            />

            <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Exportar Base de Datos de Usuarios</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Se exportarán {users.length} usuarios con la siguiente información:
                        </p>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Campo</TableHead>
                                    <TableHead>Descripción</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell>Nombre</TableCell>
                                    <TableCell>Nombre completo del usuario</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Correo</TableCell>
                                    <TableCell>Dirección de email</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Teléfono</TableCell>
                                    <TableCell>Número de celular</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Área</TableCell>
                                    <TableCell>Área de estudio seleccionada</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Premium Activo</TableCell>
                                    <TableCell>Si tiene acceso premium activo</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Plan Premium</TableCell>
                                    <TableCell>Tipo de plan premium</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Exámenes Tomados</TableCell>
                                    <TableCell>Número de exámenes realizados</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Quizzes Completados</TableCell>
                                    <TableCell>Número de quizzes completados</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Rol</TableCell>
                                    <TableCell>Rol del usuario en la plataforma</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Bloqueado</TableCell>
                                    <TableCell>Si el usuario está bloqueado</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Fecha Registro</TableCell>
                                    <TableCell>Fecha y hora de registro</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Seguimiento Llamada</TableCell>
                                    <TableCell>Notas sobre seguimiento por llamada</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Seguimiento Mensaje</TableCell>
                                    <TableCell>Notas sobre seguimiento por mensaje</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Comentarios</TableCell>
                                    <TableCell>Comentarios adicionales</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Resultado</TableCell>
                                    <TableCell>Resultado del seguimiento (ej: compró premium, no respondió, etc.)</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsExportModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleExportUsers} disabled={isExporting}>
                            {isExporting ? 'Exportando...' : 'Descargar Excel'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
