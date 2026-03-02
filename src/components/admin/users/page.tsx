'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { User, UserRole } from '@/lib/types';
import { collection, onSnapshot, doc, updateDoc, increment, deleteDoc } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Plus, Minus, Shield, Trash2, Ticket, Check, X, UserCheck, Ban } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/use-auth';
import { AlertDialog, AlertDialogTrigger, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader as AlertDialogHeaderComponent, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogDescription as AlertDialogDescriptionComponent, AlertDialogFooter as AlertDialogFooterComponent } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DynamicBanUserModal } from '@/components/shared/dynamic';


const UserRow = ({ user: userData, onBanClick }: { user: User; onBanClick: (user: User) => void }) => {
    const { toast } = useToast();
    const { user: currentUser, unbanUser } = useAuth();
    const [examTokenAmount, setExamTokenAmount] = useState(1);
    const [miniTokenAmount, setMiniTokenAmount] = useState(1);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
    const [isRoleConfirmOpen, setIsRoleConfirmOpen] = useState(false);
    const [roleToChange, setRoleToChange] = useState<UserRole | null>(null);
    const [roleConfirmInput, setRoleConfirmInput] = useState('');


    const user = userData;

    const handleUpdateTokens = async (change: number, type: 'exam' | 'mini') => {
        if (!user.id) return;
        const amount = type === 'exam' ? examTokenAmount : miniTokenAmount;
        if (!amount) return;

        const tokenField = type === 'exam' ? 'examTokens' : 'miniTokens';

        try {
            const { db } = getFirebaseServices();
            const userRef = doc(db, 'users', user.id);
            await updateDoc(userRef, {
                [tokenField]: increment(change * amount)
            });
            toast({
                title: 'Tokens Actualizados',
                description: `Se han actualizado los tokens de ${user.name}.`,
            });
        } catch (error) {
            console.error("Error updating tokens:", error);
            toast({ variant: 'destructive', title: "Error", description: "No se pudieron actualizar los tokens." });
        }
    };

    const handleDeleteUser = async () => {
        if (!user.id) return;
        try {
            // Get current user's ID token for authentication
            const { auth } = getFirebaseServices();
            const currentUser = auth.currentUser;
            if (!currentUser) {
                throw new Error('No authenticated user');
            }

            const idToken = await currentUser.getIdToken();

            // Call cloud function to delete user completely
            const response = await fetch('https://us-central1-luni-unam.cloudfunctions.net/deleteUser', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                },
                body: JSON.stringify({ userId: user.id }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete user');
            }

            toast({
                title: 'Usuario Eliminado',
                description: `El usuario ${user.name} ha sido eliminado completamente.`,
            });
        } catch (error) {
            console.error("Error deleting user:", error);
            toast({ variant: 'destructive', title: "Error", description: "No se pudo eliminar el usuario." });
        } finally {
            setIsDeleteAlertOpen(false);
            setDeleteConfirmInput('');
        }
    }

    const confirmRoleChange = async (newRole: UserRole) => {
        if (!newRole || !user) return;
        try {
            const { db } = getFirebaseServices();
            const userRef = doc(db, 'users', user.id);
            await updateDoc(userRef, { role: newRole });
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
        if (newRole === 'admin' || newRole === 'support') {
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

    return (
        <>
        <div className={`flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 p-4 border rounded-lg ${user.banDetails?.isBanned ? 'bg-destructive/10' : ''}`}>
            <Avatar className="h-12 w-12">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <p className="font-semibold">{user.name}</p>
                     {user.isAdmin && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Shield className="h-4 w-4 text-red-500 fill-red-400" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Administrador</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                    {user.banDetails?.isBanned && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                     <Ban className="h-4 w-4 text-destructive" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Bloqueado hasta: {user.banDetails.bannedUntil ? new Date(user.banDetails.bannedUntil.seconds * 1000).toLocaleDateString() : 'Permanente'}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                {user.examType && <p className="text-xs text-muted-foreground mt-1">Área: <strong>{user.examType}</strong></p>}
            </div>
             {currentUser?.isAdmin && (
                <div className="flex items-center gap-2">
                    <Select value={user.role || undefined} onValueChange={(role: UserRole) => handleRoleSelection(role)}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Rol" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="teacher">Profesor</SelectItem>
                            <SelectItem value="support">Soporte</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                    </Select>
                     {user.banDetails?.isBanned ? (
                        <Button variant="outline" size="sm" onClick={handleUnbanUser}>Desbloquear</Button>
                    ) : (
                        <Button variant="destructive" size="icon" className="h-9 w-9" onClick={() => onBanClick(user)}><Ban className="h-4 w-4"/></Button>
                    )}
                    <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon" className="h-9 w-9"><Trash2 className="h-4 w-4"/></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeaderComponent>
                                <AlertDialogTitleComponent>¿Eliminar a {user.name}?</AlertDialogTitleComponent>
                                <AlertDialogDescriptionComponent>
                                    Esta acción es permanente y no se puede deshacer. Escribe 'eliminar' para confirmar.
                                </AlertDialogDescriptionComponent>
                            </AlertDialogHeaderComponent>
                            <Input value={deleteConfirmInput} onChange={(e) => setDeleteConfirmInput(e.target.value)} placeholder="eliminar"/>
                            <AlertDialogFooterComponent>
                                <AlertDialogCancel onClick={() => setDeleteConfirmInput('')}>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteUser} disabled={deleteConfirmInput !== 'eliminar'}>Eliminar</AlertDialogAction>
                            </AlertDialogFooterComponent>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            )}
            <div className="flex items-center gap-4">
                <div className="text-center">
                    <p className="font-semibold">{user.examTokens || 0}</p>
                    <p className="text-sm text-muted-foreground">Tokens Examen</p>
                    <div className="flex items-center gap-1 mt-1">
                        <Input
                            type="number"
                            value={examTokenAmount}
                            onChange={(e) => setExamTokenAmount(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-16 h-8"
                            aria-label="Cantidad de tokens de examen"
                        />
                        <Button size="icon" variant="outline" onClick={() => handleUpdateTokens(1, 'exam')} className="h-8 w-8"><Plus className="h-4 w-4" /></Button>
                        <Button size="icon" variant="destructive" onClick={() => handleUpdateTokens(-1, 'exam')} className="h-8 w-8"><Minus className="h-4 w-4" /></Button>
                    </div>
                </div>
                <div className="text-center">
                    <p className="font-semibold">{user.miniTokens || 0}</p>
                    <p className="text-sm text-muted-foreground">MiniTokens</p>
                    <div className="flex items-center gap-1 mt-1">
                        <Input
                            type="number"
                            value={miniTokenAmount}
                            onChange={(e) => setMiniTokenAmount(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-16 h-8"
                            aria-label="Cantidad de mini tokens"
                        />
                        <Button size="icon" variant="outline" onClick={() => handleUpdateTokens(1, 'mini')} className="h-8 w-8"><Plus className="h-4 w-4" /></Button>
                        <Button size="icon" variant="destructive" onClick={() => handleUpdateTokens(-1, 'mini')} className="h-8 w-8"><Minus className="h-4 w-4" /></Button>
                    </div>
                </div>
            </div>
        </div>
         <AlertDialog open={isRoleConfirmOpen} onOpenChange={setIsRoleConfirmOpen}>
            <AlertDialogContent>
                <AlertDialogHeaderComponent>
                    <AlertDialogTitleComponent>¿Confirmar cambio de rol?</AlertDialogTitleComponent>
                    <AlertDialogDescriptionComponent>
                        Estás a punto de asignar el rol de <strong>{roleToChange}</strong> a {user.name}.
                        Esta es una acción sensible. Para confirmar, escribe "agregarrol" a continuación.
                    </AlertDialogDescriptionComponent>
                </AlertDialogHeaderComponent>
                <Input value={roleConfirmInput} onChange={(e) => setRoleConfirmInput(e.target.value)} placeholder="agregarrol"/>
                <AlertDialogFooterComponent>
                    <AlertDialogCancel onClick={() => setRoleConfirmInput('')}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => roleToChange && confirmRoleChange(roleToChange)} disabled={roleConfirmInput !== 'agregarrol'}>Confirmar</AlertDialogAction>
                </AlertDialogFooterComponent>
            </AlertDialogContent>
        </AlertDialog>
        </>
    );
};

const TeacherRequestRow = ({ user }: { user: User }) => {
    const { toast } = useToast();

    const handleTeacherStatusChange = async (newStatus: 'active' | 'rejected') => {
        try {
            const { db } = getFirebaseServices();
            const userRef = doc(db, 'users', user.id);
            const updates: any = { teacherStatus: newStatus };
            if (newStatus === 'active') {
                updates.role = 'teacher';
            }
            
            await updateDoc(userRef, updates);

            toast({
                title: `Solicitud ${newStatus === 'active' ? 'Aprobada' : 'Rechazada'}`,
                description: `El estado de ${user.name} ha sido actualizado.`,
            });
        } catch (error) {
             toast({ variant: 'destructive', title: "Error", description: "No se pudo actualizar el estado del profesor." });
        }
    }

    return (
         <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 p-4 border rounded-lg">
             <Avatar className="h-12 w-12">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
             <div className="flex-1 text-center sm:text-left">
                <p className="font-semibold">{user.name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                 <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <p className="text-xs text-muted-foreground mt-1 cursor-help">
                                Cédula: <strong>{user.teacherDetails?.professionalId || 'N/A'}</strong>
                            </p>
                        </TooltipTrigger>
                        <TooltipContent>
                            <div className="max-w-xs space-y-1">
                                <p><strong>Experiencia:</strong> {user.teacherDetails?.experience}</p>
                                <p><strong>Materias:</strong> {user.teacherDetails?.expertSubjects?.join(', ')}</p>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                 </TooltipProvider>
            </div>
             <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleTeacherStatusChange('rejected')}><X className="mr-2 h-4 w-4"/>Rechazar</Button>
                <Button size="sm" onClick={() => handleTeacherStatusChange('active')}><Check className="mr-2 h-4 w-4"/>Aprobar</Button>
             </div>
        </div>
    )
}

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


export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isBanModalOpen, setIsBanModalOpen] = useState(false);
    const [userToBan, setUserToBan] = useState<User | null>(null);

    useEffect(() => {
        const { db } = getFirebaseServices();
        const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));
            setUsers(usersData);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);
    
    const { userList, teacherRequests } = useMemo(() => {
        const filtered = users.filter(user => 
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        return {
            userList: filtered,
            teacherRequests: filtered.filter(u => u.teacherStatus === 'pending')
        };
    }, [users, searchTerm]);

    const handleBanClick = (user: User) => {
        setUserToBan(user);
        setIsBanModalOpen(true);
    };

    return (
        <>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Gestión de Usuarios</h1>
                    <p className="text-muted-foreground">Administra los tokens, roles y acceso de los usuarios.</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users />
                            Usuarios de la Plataforma
                        </CardTitle>
                        <CardDescription>
                            Busca usuarios, ajusta sus tokens y gestiona sus roles.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Input 
                            placeholder="Buscar usuario por nombre o email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                        <Tabs defaultValue="list">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="list">Lista de Usuarios</TabsTrigger>
                                <TabsTrigger value="requests">
                                    Solicitudes de Profesores
                                    {teacherRequests.length > 0 && <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-primary rounded-full">{teacherRequests.length}</span>}
                                </TabsTrigger>
                            </TabsList>
                            <TabsContent value="list" className="mt-4 space-y-4">
                                {isLoading ? (
                                    Array.from({ length: 3 }).map((_, i) => <UserRowSkeleton key={i} />)
                                ) : userList.length > 0 ? (
                                    userList.map(user => <UserRow key={user.id} user={user} onBanClick={handleBanClick} />)
                                ) : (
                                    <p className="text-center text-muted-foreground py-8">No se encontraron usuarios.</p>
                                )}
                            </TabsContent>
                            <TabsContent value="requests" className="mt-4 space-y-4">
                                {isLoading ? (
                                    Array.from({ length: 1 }).map((_, i) => <UserRowSkeleton key={i} />)
                                ) : teacherRequests.length > 0 ? (
                                    teacherRequests.map(user => <TeacherRequestRow key={user.id} user={user} />)
                                ) : (
                                    <p className="text-center text-muted-foreground py-8">No hay solicitudes pendientes.</p>
                                )}
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
            <DynamicBanUserModal 
                isOpen={isBanModalOpen}
                setIsOpen={setIsBanModalOpen}
                userToBan={userToBan}
            />
        </>
    );
}
