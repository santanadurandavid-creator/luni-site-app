'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ContentItem, User } from '@/lib/types';
import { PlusCircle, MoreHorizontal, Video, Eye, UserPlus, Settings } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, doc, deleteDoc, query, where, updateDoc, getDocs, orderBy, serverTimestamp } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { DynamicEditContentModal } from '@/components/shared/dynamic';
import { DeletePasswordModal } from '@/components/admin/DeletePasswordModal';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnrollUsersModal } from '@/components/admin/EnrollUsersModal';
import { SendNotificationModal } from '@/components/admin/SendNotificationModal';
import { AdminManageClassModal } from '@/components/admin/AdminManageClassModal';
import { Switch } from '@/components/ui/switch';

const ViewRegisteredUsersModal = ({ isOpen, setIsOpen, classItem }: { isOpen: boolean, setIsOpen: (open: boolean) => void, classItem: ContentItem | null }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [sendNotifModalOpen, setSendNotifModalOpen] = useState(false);
    const [manageClassModalOpen, setManageClassModalOpen] = useState(false);
    const [notifType, setNotifType] = useState<'reminder' | 'absence'>('reminder');
    const { toast } = useToast();

    useEffect(() => {
        if (isOpen && classItem?.classDetails?.registeredUsers && classItem.classDetails.registeredUsers.length > 0) {
            const fetchUsers = async () => {
                setIsLoading(true);
                const { db } = getFirebaseServices();
                const userIds = classItem.classDetails!.registeredUsers!;

                const userPromises: Promise<User[]>[] = [];
                for (let i = 0; i < userIds.length; i += 30) {
                    const chunk = userIds.slice(i, i + 30);
                    const usersQuery = query(collection(db, 'users'), where('id', 'in', chunk));
                    userPromises.push(getDocs(usersQuery).then(snapshot => snapshot.docs.map(doc => doc.data() as User)));
                }

                try {
                    const userChunks = await Promise.all(userPromises);
                    const fetchedUsers = userChunks.flat();
                    setUsers(fetchedUsers);
                } catch (e) {
                    console.error("Error fetching registered users:", e);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchUsers();
        } else {
            setUsers([]);
        }
    }, [isOpen, classItem]);

    const handleToggleAttendance = async (userId: string, newStatus: boolean | undefined) => {
        if (!classItem?.id) return;

        try {
            const { db } = getFirebaseServices();
            const classRef = doc(db, 'content', classItem.id);

            const currentAttendance = classItem.classDetails?.attendance || [];

            let newAttendance;

            if (newStatus === undefined) {
                // Eliminar el registro de asistencia
                newAttendance = currentAttendance.filter(a => a.userId !== userId);
            } else {
                const existingIndex = currentAttendance.findIndex(a => a.userId === userId);

                if (existingIndex >= 0) {
                    // Actualizar registro existente
                    newAttendance = [...currentAttendance];
                    newAttendance[existingIndex] = {
                        userId,
                        attended: newStatus,
                        markedAt: new Date()
                    };
                } else {
                    // Crear nuevo registro
                    newAttendance = [
                        ...currentAttendance,
                        {
                            userId,
                            attended: newStatus,
                            markedAt: new Date()
                        }
                    ];
                }
            }

            await updateDoc(classRef, {
                'classDetails.attendance': newAttendance
            });

            toast({
                title: 'Asistencia actualizada',
                description: newStatus === undefined ? 'Registro eliminado' : `Marcado como ${newStatus ? 'asistió' : 'no asistió'}`
            });

            // Actualizar el classItem local para reflejar cambios
            if (classItem.classDetails) {
                classItem.classDetails.attendance = newAttendance;
            }
        } catch (error) {
            console.error('Error updating attendance:', error);
            toast({
                title: 'Error',
                description: 'No se pudo actualizar la asistencia',
                variant: 'destructive'
            });
        }
    };

    const getAttendanceStatus = (userId: string): boolean | undefined => {
        const attendance = classItem?.classDetails?.attendance?.find(a => a.userId === userId);
        return attendance?.attended;
    };

    const absentUsers = users.filter(u => {
        const attended = getAttendanceStatus(u.id);
        return attended === false;
    });

    const handleSendNotifications = (type: 'reminder' | 'absence') => {
        setNotifType(type);
        setSendNotifModalOpen(true);
    };

    const getUsersForNotification = () => {
        if (notifType === 'absence') {
            return absentUsers.map(u => u.id);
        }
        return users.map(u => u.id);
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Estudiantes Registrados en "{classItem?.title}"</DialogTitle>
                        <DialogDescription>
                            {users.length} estudiante(s) registrado(s)
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="registered" className="flex-1 flex flex-col min-h-0">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="registered">Inscritos ({users.length})</TabsTrigger>
                            <TabsTrigger value="absent">Ausencias ({absentUsers.length})</TabsTrigger>
                        </TabsList>

                        <TabsContent value="registered" className="flex-1 min-h-0">
                            <div className="space-y-4">
                                <Button
                                    onClick={() => handleSendNotifications('reminder')}
                                    className="w-full"
                                    disabled={users.length === 0}
                                >
                                    📢 Enviar Recordatorio a Todos los Inscritos
                                </Button>

                                <ScrollArea className="h-96">
                                    <div className="space-y-2">
                                        {isLoading ? <p>Cargando...</p> : (
                                            users.map(user => {
                                                const attended = getAttendanceStatus(user.id);
                                                return (
                                                    <div key={user.id} className="flex items-center justify-between p-3 border rounded-md">
                                                        <div className="flex items-center gap-3 flex-1">
                                                            {user.avatar ? (
                                                                <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                                    <span className="text-primary font-semibold text-sm">{user.name.charAt(0).toUpperCase()}</span>
                                                                </div>
                                                            )}
                                                            <div>
                                                                <p className="font-semibold">{user.name}</p>
                                                                <p className="text-sm text-muted-foreground">{user.email}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex gap-1">
                                                                <button
                                                                    onClick={() => handleToggleAttendance(user.id, true)}
                                                                    className={`px-3 py-1 text-xs rounded transition-colors ${attended === true
                                                                        ? 'bg-green-500 text-white'
                                                                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                                                        }`}
                                                                >
                                                                    ✓ Asistió
                                                                </button>
                                                                <button
                                                                    onClick={() => handleToggleAttendance(user.id, false)}
                                                                    className={`px-3 py-1 text-xs rounded transition-colors ${attended === false
                                                                        ? 'bg-red-500 text-white'
                                                                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                                                        }`}
                                                                >
                                                                    ✗ No asistió
                                                                </button>
                                                                {attended !== undefined && (
                                                                    <button
                                                                        onClick={() => handleToggleAttendance(user.id, undefined)}
                                                                        className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
                                                                        title="Limpiar"
                                                                    >
                                                                        ↺
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                        {users.length === 0 && !isLoading && <p className="text-muted-foreground text-center py-4">Aún no hay estudiantes registrados.</p>}
                                    </div>
                                </ScrollArea>
                            </div>
                        </TabsContent>

                        <TabsContent value="absent" className="flex-1 min-h-0">
                            <div className="space-y-4">
                                <Button
                                    onClick={() => handleSendNotifications('absence')}
                                    variant="destructive"
                                    className="w-full"
                                    disabled={absentUsers.length === 0}
                                >
                                    📩 Enviar Notificación a Ausentes
                                </Button>

                                <ScrollArea className="h-96">
                                    <div className="space-y-2">
                                        {absentUsers.length === 0 ? (
                                            <p className="text-muted-foreground text-center py-8">
                                                {users.length === 0 ? 'No hay usuarios inscritos' : 'No hay ausencias registradas'}
                                            </p>
                                        ) : (
                                            absentUsers.map(user => (
                                                <div key={user.id} className="flex items-center gap-3 p-3 border rounded-md border-destructive/50 bg-destructive/5">
                                                    {user.avatar ? (
                                                        <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                            <span className="text-primary font-semibold text-sm">{user.name.charAt(0).toUpperCase()}</span>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-semibold">{user.name}</p>
                                                        <p className="text-sm text-muted-foreground">{user.email}</p>
                                                        <p className="text-xs text-destructive">No asistió a la clase</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <div className="flex justify-end pt-4 border-t">
                        <Button variant="outline" onClick={() => setIsOpen(false)}>
                            Cerrar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {classItem && (
                <SendNotificationModal
                    isOpen={sendNotifModalOpen}
                    setIsOpen={setSendNotifModalOpen}
                    userIds={getUsersForNotification()}
                    classId={classItem.id || ''}
                    classTitle={classItem.title}
                    notificationType={notifType}
                />
            )}
        </>
    );
};

const ClassTable = ({ items, onEdit, onDelete, onViewUsers, onEnrollUsers, onManageClass, onToggleLive, isLoading }: {
    items: ContentItem[],
    onEdit: (item: ContentItem) => void,
    onDelete: (item: ContentItem) => void,
    onViewUsers: (item: ContentItem) => void,
    onEnrollUsers: (item: ContentItem) => void,
    onManageClass: (item: ContentItem) => void,
    onToggleLive: (item: ContentItem, isLive: boolean) => void,
    isLoading: boolean
}) => {
    if (isLoading) return <Skeleton className="h-48 w-full" />
    if (items.length === 0) {
        return <p className="text-center text-muted-foreground py-8">No hay clases en esta sección.</p>;
    }
    return (
        <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-muted/50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Título</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Fecha</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">En Vivo</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Acciones</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {items.map(item => (
                        <tr key={item.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.title}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.classDetails?.classDate ? format(item.classDetails.classDate.toDate(), "d MMM, yyyy HH:mm", { locale: es }) : 'No especificada'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={item.classDetails?.isLive || false}
                                        onCheckedChange={(checked) => onToggleLive(item, checked)}
                                    />
                                    <span className="text-xs">{item.classDetails?.isLive ? 'En Vivo' : 'No En Vivo'}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                <Button variant="secondary" size="sm" onClick={() => onManageClass(item)}><Settings className="mr-2 h-4 w-4" />Gestionar Clase</Button>
                                <Button variant="outline" size="sm" onClick={() => onViewUsers(item)}><Eye className="mr-2 h-4 w-4" />Ver Inscritos</Button>
                                <Button variant="default" size="sm" onClick={() => onEnrollUsers(item)}><UserPlus className="mr-2 h-4 w-4" />Inscribir</Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onClick={() => onEdit(item)}>Editar</DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive" onClick={() => onDelete(item)}>Eliminar</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default function AdminClassesPage() {
    const [modalOpen, setModalOpen] = useState(false);
    const [usersModalOpen, setUsersModalOpen] = useState(false);
    const [enrollModalOpen, setEnrollModalOpen] = useState(false);
    const [manageModalOpen, setManageModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
    const [classes, setClasses] = useState<ContentItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const [deletePasswordModalOpen, setDeletePasswordModalOpen] = useState(false);
    const [itemPendingDeletion, setItemPendingDeletion] = useState<ContentItem | null>(null);

    useEffect(() => {
        const { db } = getFirebaseServices();
        const qClasses = query(collection(db, 'content'), where('type', '==', 'class'), orderBy('createdAt', 'desc'));

        const unsubClasses = onSnapshot(qClasses, (snapshot) => {
            setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ContentItem)));
            setIsLoading(false);
        });

        return () => {
            unsubClasses();
        };
    }, []);

    const handleDelete = (item: ContentItem) => {
        setItemPendingDeletion(item);
        setDeletePasswordModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemPendingDeletion) return;
        const item = itemPendingDeletion;

        if (!item.id) {
            toast({ title: "Error", description: "Cannot delete item without an ID.", variant: 'destructive' });
            return;
        }
        try {
            const { db } = getFirebaseServices();
            await deleteDoc(doc(db, "content", item.id));
            toast({ title: "Clase Eliminada", description: `La clase "${item.title}" ha sido eliminada.` });
        } catch (error) {
            toast({ title: "Error", description: "No se pudo eliminar la clase.", variant: 'destructive' });
        } finally {
            setItemPendingDeletion(null);
            setDeletePasswordModalOpen(false);
        }
    };

    const handleEdit = (item: ContentItem) => {
        setSelectedItem(item);
        setModalOpen(true);
    };

    const handleCreate = () => {
        const newItem: Partial<ContentItem> = {
            type: 'class',
            accessLevel: 'free',
            classDetails: {
                isLive: false,
                status: 'scheduled',
                approvalStatus: 'approved'
            }
        };
        setSelectedItem(newItem as ContentItem);
        setModalOpen(true);
    };

    const handleViewUsers = (item: ContentItem) => {
        setSelectedItem(item);
        setUsersModalOpen(true);
    }

    const handleEnrollUsers = (item: ContentItem) => {
        setSelectedItem(item);
        setEnrollModalOpen(true);
    };

    const handleManageClass = (item: ContentItem) => {
        setSelectedItem(item);
        setManageModalOpen(true);
    };

    const handleToggleLive = async (item: ContentItem, isLive: boolean) => {
        if (!item.id) return;
        try {
            const { db } = getFirebaseServices();
            const classRef = doc(db, 'content', item.id);
            await updateDoc(classRef, {
                'classDetails.isLive': isLive
            });
            toast({
                title: isLive ? "Clase En Vivo" : "Clase Finalizada",
                description: `La clase ha sido marcada como ${isLive ? 'en vivo' : 'no en vivo'}.`
            });

            // Send notification if class is now LIVE
            if (isLive) {
                try {
                    await fetch('/api/notifications/send-push', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            title: 'Clase en vivo ahora',
                            description: 'No te la pierdas',
                            imageUrl: window.location.origin + '/images/luni-live-icon.png',
                            url: `/clases?open=${item.id}` // Link to open the class directly
                        })
                    });
                    toast({ title: "Notificación enviada", description: "Se ha enviado una notificación push a todos los usuarios." });
                } catch (notifError) {
                    console.error("Error sending push notification:", notifError);
                    toast({ title: "Error de notificación", description: "No se pudo enviar la notificación automática.", variant: 'destructive' });
                }
            }

        } catch (error) {
            console.error("Error toggling live status:", error);
            toast({
                title: "Error",
                description: "No se pudo actualizar el estado de la clase.",
                variant: 'destructive'
            });
        }
    };

    return (
        <>
            <div className="space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold font-headline">Gestión de Clases</h1>
                        <p className="text-muted-foreground">Administra las clases programadas.</p>
                    </div>
                    <Button onClick={() => handleCreate()}><PlusCircle className="mr-2 h-4 w-4" /> Crear Clase</Button>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Clases Programadas</CardTitle>
                        <CardDescription>Visualiza y edita las clases que los estudiantes pueden ver.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ClassTable
                            items={classes}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onViewUsers={handleViewUsers}
                            onEnrollUsers={handleEnrollUsers}
                            onManageClass={handleManageClass}
                            onToggleLive={handleToggleLive}
                            isLoading={isLoading}
                        />
                    </CardContent>
                </Card>
            </div>
            <DynamicEditContentModal isOpen={modalOpen} setIsOpen={setModalOpen} item={selectedItem} allowedTypes={['class']} />
            <ViewRegisteredUsersModal isOpen={usersModalOpen} setIsOpen={setUsersModalOpen} classItem={selectedItem} />
            <EnrollUsersModal isOpen={enrollModalOpen} setIsOpen={setEnrollModalOpen} classItem={selectedItem} />
            <AdminManageClassModal isOpen={manageModalOpen} setIsOpen={setManageModalOpen} classItem={selectedItem} />
            <DeletePasswordModal
                isOpen={deletePasswordModalOpen}
                onOpenChange={setDeletePasswordModalOpen}
                onConfirm={confirmDelete}
                title={`¿Eliminar "${itemPendingDeletion?.title || 'la clase'}"?`}
            />
        </>
    );
}
