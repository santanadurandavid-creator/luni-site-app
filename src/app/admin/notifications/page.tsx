'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { Notification, User } from '@/lib/types';
import { Send, Bell, User as UserIcon, Check, History, Trash2, Clock, UserX, Filter } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/use-auth';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface InactiveUser extends User {
    inactiveHours: number;
    lastActivityDate: Date | null;
}

const TIME_FILTERS = [
    { value: 'all', label: 'Todos', hours: 0 },
    { value: '1h', label: '1+ hora', hours: 1 },
    { value: '3h', label: '3+ horas', hours: 3 },
    { value: '6h', label: '6+ horas', hours: 6 },
    { value: '12h', label: '12+ horas', hours: 12 },
    { value: '24h', label: '1+ día', hours: 24 },
    { value: '48h', label: '2+ días', hours: 48 },
    { value: '72h', label: '3+ días', hours: 72 },
    { value: '7d', label: '7+ días', hours: 168 },
];

function formatInactiveTime(hours: number): string {
    if (!isFinite(hours)) return 'Sin datos';
    if (hours < 1) return 'Menos de 1 hora';
    if (hours < 24) return `${Math.floor(hours)} hora${Math.floor(hours) !== 1 ? 's' : ''}`;
    const days = Math.floor(hours / 24);
    const remainingHours = Math.floor(hours % 24);
    if (remainingHours === 0) return `${days} día${days !== 1 ? 's' : ''}`;
    return `${days}d ${remainingHours}h`;
}

export default function AdminNotificationsPage() {
    const { user: currentUser } = useAuth();
    const { toast } = useToast();
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [sentNotifications, setSentNotifications] = useState<Notification[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [selectedUserIds, setSelectedUserIds] = useState<Record<string, boolean>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [notificationToDelete, setNotificationToDelete] = useState<string | null>(null);

    const isAdmin = currentUser?.role === 'admin';

    // Inactive users state
    const [inactiveUsers, setInactiveUsers] = useState<InactiveUser[]>([]);
    const [timeFilter, setTimeFilter] = useState('24h');
    const [selectedInactiveUserIds, setSelectedInactiveUserIds] = useState<Record<string, boolean>>({});
    const [inactiveSearchTerm, setInactiveSearchTerm] = useState('');
    const [inactiveImagePreview, setInactiveImagePreview] = useState<string | null>(null);
    const [inactiveImageFile, setInactiveImageFile] = useState<File | null>(null);

    useEffect(() => {
        const { db } = getFirebaseServices();
        const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notificationsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification))
                .filter(n => n.source !== 'support'); // Exclude support ticket responses from admin history
            setSentNotifications(notificationsData);
        });

        const fetchUsers = async () => {
            const usersCollection = collection(db, 'users');
            const userSnapshot = await getDocs(usersCollection);
            const userList = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setUsers(userList.filter(u => !u.isAdmin));
            setIsLoadingUsers(false);
        };

        fetchUsers();

        return () => unsubscribe();
    }, []);

    // Calculate inactive users
    useEffect(() => {
        const now = new Date();
        const calculated = users
            .filter(u => !u.isAdmin) // Include all non-admin users
            .map(user => {
                const lastActivity = user.lastActivity?.toDate?.() || null;
                let inactiveMs: number;
                let inactiveHours: number;

                if (lastActivity) {
                    // User has logged in before, calculate time since last activity
                    inactiveMs = now.getTime() - lastActivity.getTime();
                    inactiveHours = inactiveMs / (1000 * 60 * 60);
                } else {
                    // User has never logged in or no lastActivity recorded
                    // Use createdAt if available, otherwise treat as very old
                    const createdAt = user.createdAt?.toDate?.() || null;
                    if (createdAt) {
                        inactiveMs = now.getTime() - createdAt.getTime();
                        inactiveHours = inactiveMs / (1000 * 60 * 60);
                    } else {
                        // No data at all, treat as infinitely inactive
                        inactiveHours = Infinity;
                    }
                }

                return {
                    ...user,
                    inactiveHours,
                    lastActivityDate: lastActivity,
                } as InactiveUser;
            })
            .sort((a, b) => b.inactiveHours - a.inactiveHours);

        setInactiveUsers(calculated);
    }, [users]);

    const filteredUsers = useMemo(() =>
        users.filter(user =>
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
        ), [users, searchTerm]);

    const handleSelectAll = (checked: boolean) => {
        const newSelection: Record<string, boolean> = {};
        if (checked) {
            filteredUsers.forEach(user => {
                newSelection[user.id] = true;
            });
        }
        setSelectedUserIds(newSelection);
    };

    const handleUserSelect = (userId: string, checked: boolean) => {
        setSelectedUserIds(prev => ({ ...prev, [userId]: checked }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSendNotification = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        console.log('handleSendNotification called');
        const form = e.currentTarget;
        const formData = new FormData(form);
        const title = formData.get('title') as string;
        const description = formData.get('description') as string;
        const url = formData.get('url') as string;
        const sendModeValue = 'now';
        const recipientIds = Object.keys(selectedUserIds).filter(id => selectedUserIds[id]);

        if (!title.trim() || !description.trim()) {
            toast({ variant: 'destructive', title: "Error", description: "El título y la descripción son requeridos." });
            return;
        }

        try {
            const { db, storage } = getFirebaseServices();
            let imageUrl: string | undefined = undefined;
            if (imageFile) {
                const storageRef = ref(storage, `notifications/${Date.now()}_${imageFile.name}`);
                const snapshot = await uploadBytes(storageRef, imageFile);
                imageUrl = await getDownloadURL(snapshot.ref);
            }

            const notificationData: Omit<Notification, 'id' | 'read'> & { [key: string]: any } = {
                title,
                message: description,
                type: 'info' as const,
                description,
                createdAt: serverTimestamp(),
                source: 'admin_panel',
            };

            if (url) {
                notificationData.url = url;
            }
            if (imageUrl) {
                notificationData.imageUrl = imageUrl;
            }
            if (recipientIds.length > 0) {
                notificationData.recipientIds = recipientIds;
            }

            notificationData.isScheduled = false;

            await addDoc(collection(db, 'notifications'), notificationData);

            const response = await fetch('/api/notifications/send-push', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title,
                    description,
                    imageUrl,
                    url,
                    recipientIds,
                    isScheduled: false,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('Failed to send push notification:', response.status, errorData);
                toast({
                    variant: 'destructive',
                    title: "Error al enviar notificación push",
                    description: errorData.message || errorData.error || 'Error desconocido'
                });
            }

            toast({
                title: 'Notificación Enviada',
                description: `La notificación ha sido enviada a ${recipientIds.length > 0 ? `${recipientIds.length} usuario(s)` : 'todos los usuarios'}.`,
            });
            form.reset();
            setImagePreview(null);
            setImageFile(null);
            setSelectedUserIds({});
        } catch (error) {
            console.error("Error sending notification:", error);
            toast({ variant: 'destructive', title: "Error", description: "No se pudo enviar la notificación." });
        }
    };

    const recipientsText = useMemo(() => {
        const count = Object.values(selectedUserIds).filter(Boolean).length;
        if (count === 0) return 'Enviar a todos los usuarios';
        if (count === 1) return 'Enviar a 1 usuario seleccionado';
        return `Enviar a ${count} usuarios seleccionados`;
    }, [selectedUserIds]);

    const openDeleteDialog = (id: string) => {
        setNotificationToDelete(id);
        setDeleteDialogOpen(true);
    };

    const [selectedNotifications, setSelectedNotifications] = useState<Record<string, boolean>>({});

    const handleSelectAllNotifications = (checked: boolean) => {
        const newSelection: Record<string, boolean> = {};
        if (checked) {
            sentNotifications.forEach(notification => {
                newSelection[notification.id] = true;
            });
        }
        setSelectedNotifications(newSelection);
    };

    const handleNotificationSelect = (notificationId: string, checked: boolean) => {
        setSelectedNotifications(prev => {
            const newPrev = { ...prev };
            if (checked) {
                newPrev[notificationId] = true;
            } else {
                delete newPrev[notificationId];
            }
            return newPrev;
        });
    };

    const confirmDelete = async () => {
        try {
            const { db } = getFirebaseServices();

            if (notificationToDelete) {
                // Delete single notification
                await deleteDoc(doc(db, 'notifications', notificationToDelete));
                toast({ title: 'Notificación Eliminada', description: 'La notificación ha sido eliminada del historial.' });
            } else {
                // Delete multiple notifications
                const idsToDelete = Object.keys(selectedNotifications);
                if (idsToDelete.length === 0) return;

                const deletePromises = idsToDelete.map(id => deleteDoc(doc(db, 'notifications', id)));
                await Promise.all(deletePromises);

                toast({
                    title: 'Notificaciones Eliminadas',
                    description: `Se han eliminado ${idsToDelete.length} notificaciones del historial.`
                });
                setSelectedNotifications({});
            }
        } catch (error) {
            console.error('Error deleting notification(s):', error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron eliminar las notificaciones.' });
        } finally {
            setDeleteDialogOpen(false);
            setNotificationToDelete(null);
        }
    };

    // Inactive users handlers
    const filteredInactiveUsers = useMemo(() => {
        const selectedFilter = TIME_FILTERS.find(f => f.value === timeFilter);
        const minHours = selectedFilter?.hours || 0;

        return inactiveUsers.filter(user => {
            const matchesTime = minHours === 0 || user.inactiveHours >= minHours;
            const matchesSearch = user.name.toLowerCase().includes(inactiveSearchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(inactiveSearchTerm.toLowerCase());
            return matchesTime && matchesSearch;
        });
    }, [inactiveUsers, timeFilter, inactiveSearchTerm]);

    const handleSelectAllInactive = (checked: boolean) => {
        const newSelection: Record<string, boolean> = {};
        if (checked) {
            filteredInactiveUsers.forEach(user => {
                newSelection[user.id] = true;
            });
        }
        setSelectedInactiveUserIds(newSelection);
    };

    const handleInactiveUserSelect = (userId: string, checked: boolean) => {
        setSelectedInactiveUserIds(prev => ({ ...prev, [userId]: checked }));
    };

    const handleInactiveImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setInactiveImageFile(file);
            setInactiveImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSendInactiveNotification = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);
        const title = formData.get('inactive-title') as string;
        const description = formData.get('inactive-description') as string;
        const url = formData.get('inactive-url') as string;
        const recipientIds = Object.keys(selectedInactiveUserIds).filter(id => selectedInactiveUserIds[id]);

        if (!title.trim() || !description.trim()) {
            toast({ variant: 'destructive', title: "Error", description: "El título y la descripción son requeridos." });
            return;
        }

        if (recipientIds.length === 0) {
            toast({ variant: 'destructive', title: "Error", description: "Debes seleccionar al menos un usuario." });
            return;
        }

        try {
            const { db, storage } = getFirebaseServices();
            let imageUrl: string | undefined = undefined;
            if (inactiveImageFile) {
                const storageRef = ref(storage, `notifications/${Date.now()}_${inactiveImageFile.name}`);
                const snapshot = await uploadBytes(storageRef, inactiveImageFile);
                imageUrl = await getDownloadURL(snapshot.ref);
            }

            const notificationData: Omit<Notification, 'id' | 'read'> & { [key: string]: any } = {
                title,
                message: description,
                type: 'info' as const,
                description,
                createdAt: serverTimestamp(),
                recipientIds,
                isScheduled: false,
                source: 'admin_panel',
            };

            if (url) {
                notificationData.url = url;
            }
            if (imageUrl) {
                notificationData.imageUrl = imageUrl;
            }

            await addDoc(collection(db, 'notifications'), notificationData);

            const response = await fetch('/api/notifications/send-push', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title,
                    description,
                    imageUrl,
                    url,
                    recipientIds,
                    isScheduled: false,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('Failed to send push notification:', response.status, errorData);
                toast({
                    variant: 'destructive',
                    title: "Error al enviar notificación push",
                    description: errorData.message || errorData.error || 'Error desconocido'
                });
            }

            toast({
                title: 'Notificación Enviada',
                description: `La notificación ha sido enviada a ${recipientIds.length} usuario(s) inactivo(s).`,
            });
            form.reset();
            setInactiveImagePreview(null);
            setInactiveImageFile(null);
            setSelectedInactiveUserIds({});
        } catch (error) {
            console.error("Error sending notification:", error);
            toast({ variant: 'destructive', title: "Error", description: "No se pudo enviar la notificación." });
        }
    };

    const inactiveRecipientsText = useMemo(() => {
        const count = Object.values(selectedInactiveUserIds).filter(Boolean).length;
        if (count === 0) return 'Selecciona usuarios';
        if (count === 1) return 'Enviar a 1 usuario';
        return `Enviar a ${count} usuarios`;
    }, [selectedInactiveUserIds]);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Gestión de Notificaciones</h1>
                <p className="text-muted-foreground">Crea y envía notificaciones push, y administra el historial de notificaciones enviadas.</p>
            </div>
            <Tabs defaultValue="send" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="send">Enviar Notificaciones</TabsTrigger>
                    <TabsTrigger value="inactive">Usuarios Inactivos</TabsTrigger>
                    <TabsTrigger value="history">Historial</TabsTrigger>
                </TabsList>
                <TabsContent value="send" className="space-y-6">
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
                        <Card className="lg:col-span-3">
                            <CardHeader>
                                <CardTitle>Componer Notificación</CardTitle>
                                <CardDescription>Rellena el formulario para enviar un nuevo mensaje.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSendNotification} className="w-full space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="notif-title">Título</Label>
                                        <Input id="notif-title" name="title" placeholder="¡No te lo pierdas!" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="notif-desc">Descripción</Label>
                                        <Textarea id="notif-desc" name="description" placeholder="Tenemos nuevo contenido para ti..." required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="notif-url">URL (Opcional)</Label>
                                        <Input id="notif-url" name="url" placeholder="https://..." />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="notif-img">Imagen (Opcional)</Label>
                                        {imagePreview &&
                                            <div className="relative w-full aspect-video rounded-md overflow-hidden border">
                                                <img src={imagePreview} alt="Vista previa" className="w-full h-full object-cover" />
                                            </div>
                                        }
                                        <Input id="notif-img" name="image" type="file" onChange={handleImageChange} accept="image/*" />
                                    </div>
                                    <input type="hidden" name="sendMode" value="now" />
                                    <Button type="submit" className="w-full">
                                        <Send className="mr-2 h-4 w-4" />
                                        {recipientsText}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle>Seleccionar Destinatarios</CardTitle>
                                <CardDescription>Deja en blanco para enviar a todos.</CardDescription>
                                <Input
                                    placeholder="Buscar usuario..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[400px] pr-4 -mr-4">
                                    {isLoadingUsers ? (
                                        <div className="space-y-2">
                                            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="flex items-center space-x-2 p-2 border-b">
                                                <Checkbox
                                                    id="select-all"
                                                    checked={Object.keys(selectedUserIds).length > 0 && Object.keys(selectedUserIds).length === filteredUsers.length}
                                                    onCheckedChange={handleSelectAll}
                                                />
                                                <Label htmlFor="select-all" className="font-semibold">
                                                    Seleccionar Todos
                                                </Label>
                                            </div>
                                            {filteredUsers.map(user => (
                                                <div key={user.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted">
                                                    <Checkbox
                                                        id={user.id}
                                                        checked={!!selectedUserIds[user.id]}
                                                        onCheckedChange={(checked) => handleUserSelect(user.id, !!checked)}
                                                    />
                                                    <Label htmlFor={user.id} className="flex items-center gap-3 cursor-pointer flex-1">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={user.avatar} />
                                                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="overflow-hidden">
                                                            <p className="font-medium truncate">{user.name}</p>
                                                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                                        </div>
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
                <TabsContent value="inactive" className="space-y-6">
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
                        <Card className="lg:col-span-3">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <UserX className="h-5 w-5" />
                                    Usuarios Inactivos
                                </CardTitle>
                                <CardDescription>
                                    Filtra usuarios por tiempo de inactividad y envía notificaciones manuales.
                                </CardDescription>
                                <div className="flex items-center gap-4 pt-4">
                                    <div className="flex items-center gap-2 flex-1">
                                        <Filter className="h-4 w-4 text-muted-foreground" />
                                        <Select value={timeFilter} onValueChange={setTimeFilter}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Filtrar por tiempo" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {TIME_FILTERS.map(filter => (
                                                    <SelectItem key={filter.value} value={filter.value}>
                                                        {filter.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Badge variant="secondary" className="text-sm">
                                        {filteredInactiveUsers.length} usuario{filteredInactiveUsers.length !== 1 ? 's' : ''}
                                    </Badge>
                                </div>
                                <Input
                                    placeholder="Buscar usuario..."
                                    value={inactiveSearchTerm}
                                    onChange={(e) => setInactiveSearchTerm(e.target.value)}
                                    className="mt-2"
                                />
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[500px] pr-4 -mr-4">
                                    {isLoadingUsers ? (
                                        <div className="space-y-2">
                                            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                                        </div>
                                    ) : filteredInactiveUsers.length === 0 ? (
                                        <p className="text-center text-muted-foreground py-8">
                                            No hay usuarios inactivos con este filtro.
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="flex items-center space-x-2 p-2 border-b">
                                                <Checkbox
                                                    id="select-all-inactive"
                                                    checked={Object.keys(selectedInactiveUserIds).length > 0 && Object.keys(selectedInactiveUserIds).length === filteredInactiveUsers.length}
                                                    onCheckedChange={handleSelectAllInactive}
                                                />
                                                <Label htmlFor="select-all-inactive" className="font-semibold">
                                                    Seleccionar Todos
                                                </Label>
                                            </div>
                                            {filteredInactiveUsers.map(user => (
                                                <div key={user.id} className="flex items-center space-x-3 p-3 rounded-md hover:bg-muted border">
                                                    <Checkbox
                                                        id={`inactive-${user.id}`}
                                                        checked={!!selectedInactiveUserIds[user.id]}
                                                        onCheckedChange={(checked) => handleInactiveUserSelect(user.id, !!checked)}
                                                    />
                                                    <Label htmlFor={`inactive-${user.id}`} className="flex items-center gap-3 cursor-pointer flex-1">
                                                        <Avatar className="h-10 w-10">
                                                            <AvatarImage src={user.avatar} />
                                                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1 overflow-hidden">
                                                            <p className="font-medium truncate">{user.name}</p>
                                                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <Badge variant="outline" className="text-xs">
                                                                <Clock className="h-3 w-3 mr-1" />
                                                                {formatInactiveTime(user.inactiveHours)}
                                                            </Badge>
                                                            {user.lastActivityDate ? (
                                                                <p className="text-xs text-muted-foreground mt-1">
                                                                    {user.lastActivityDate.toLocaleDateString('es-MX', {
                                                                        day: '2-digit',
                                                                        month: 'short',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })}
                                                                </p>
                                                            ) : (
                                                                <p className="text-xs text-muted-foreground mt-1 italic">
                                                                    Nunca conectado
                                                                </p>
                                                            )}
                                                        </div>
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            </CardContent>
                        </Card>
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle>Enviar Notificación</CardTitle>
                                <CardDescription>Notifica a los usuarios seleccionados.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSendInactiveNotification} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="inactive-title">Título</Label>
                                        <Input id="inactive-title" name="inactive-title" placeholder="¡Te extrañamos!" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="inactive-desc">Descripción</Label>
                                        <Textarea id="inactive-desc" name="inactive-description" placeholder="Vuelve a estudiar con nosotros..." required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="inactive-url">URL (Opcional)</Label>
                                        <Input id="inactive-url" name="inactive-url" placeholder="https://..." />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="inactive-img">Imagen (Opcional)</Label>
                                        {inactiveImagePreview && (
                                            <div className="relative w-full aspect-video rounded-md overflow-hidden border">
                                                <img src={inactiveImagePreview} alt="Vista previa" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                        <Input id="inactive-img" name="inactive-image" type="file" onChange={handleInactiveImageChange} accept="image/*" />
                                    </div>
                                    <Button
                                        type="submit"
                                        className="w-full"
                                        disabled={Object.values(selectedInactiveUserIds).filter(Boolean).length === 0}
                                    >
                                        <Send className="mr-2 h-4 w-4" />
                                        {inactiveRecipientsText}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
                <TabsContent value="history">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div className="space-y-1">
                                <CardTitle className="flex items-center gap-2">
                                    <History className="h-5 w-5" />
                                    Historial de Notificaciones Enviadas
                                </CardTitle>
                                <CardDescription>Lista de todas las notificaciones enviadas anteriormente.</CardDescription>
                            </div>
                            {Object.keys(selectedNotifications).length > 0 && isAdmin && (
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => setDeleteDialogOpen(true)}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Eliminar ({Object.keys(selectedNotifications).length})
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[400px]">
                                {sentNotifications.length > 0 ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-2 p-2 border-b bg-muted/40 rounded-t-lg">
                                            <Checkbox
                                                id="select-all-notifications"
                                                checked={sentNotifications.length > 0 && Object.keys(selectedNotifications).length === sentNotifications.length}
                                                onCheckedChange={handleSelectAllNotifications}
                                            />
                                            <Label htmlFor="select-all-notifications" className="font-semibold cursor-pointer">
                                                Seleccionar Todas
                                            </Label>
                                        </div>

                                        {sentNotifications.map(notification => (
                                            <div key={notification.id} className="border rounded-lg p-4 space-y-2 flex items-start gap-3">
                                                <div className="pt-2">
                                                    <Checkbox
                                                        checked={!!selectedNotifications[notification.id]}
                                                        onCheckedChange={(checked) => handleNotificationSelect(notification.id, !!checked)}
                                                    />
                                                </div>

                                                <div className="flex-1 w-full space-y-2">
                                                    <div className="flex justify-between items-start gap-3">
                                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                                            {notification.imageUrl ? (
                                                                <img src={notification.imageUrl} alt={notification.title} className="w-12 h-12 rounded-md object-cover flex-shrink-0" />
                                                            ) : (
                                                                <Bell className="w-12 h-12 text-muted-foreground flex-shrink-0" />
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className="font-semibold text-sm">{notification.title}</h4>
                                                                    {notification.isScheduled && !notification.sentAt && (
                                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                                                            <Clock className="h-3 w-3 mr-1" />
                                                                            Programada
                                                                        </span>
                                                                    )}
                                                                    {notification.sentAt && (
                                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                                                            <Check className="h-3 w-3 mr-1" />
                                                                            Enviada
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-muted-foreground">{notification.description}</p>
                                                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                                                    <span>
                                                                        {notification.recipientIds ? `${notification.recipientIds.length} usuarios` : 'Todos'}
                                                                    </span>
                                                                    {notification.isScheduled && notification.scheduledFor ? (
                                                                        <span>
                                                                            Programada: {notification.scheduledFor.toDate().toLocaleString()}
                                                                        </span>
                                                                    ) : (
                                                                        <span>
                                                                            {notification.sentAt ? `Enviada: ${notification.sentAt.toDate().toLocaleString()}` : notification.createdAt?.toDate().toLocaleString()}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {isAdmin && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => openDeleteDialog(notification.id)}
                                                                title="Eliminar notificación"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-center text-muted-foreground py-8">No hay notificaciones enviadas aún.</p>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Eliminar Notificación(es)</DialogTitle>
                        <DialogDescription>
                            {notificationToDelete
                                ? "¿Estás seguro de que quieres eliminar esta notificación?"
                                : `¿Estás seguro de que quieres eliminar las ${Object.keys(selectedNotifications).length} notificaciones seleccionadas?`}
                            <br />Esta acción no se puede deshacer.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setDeleteDialogOpen(false);
                            setNotificationToDelete(null);
                        }}>Cancelar</Button>
                        <Button variant="destructive" onClick={confirmDelete}>Eliminar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
