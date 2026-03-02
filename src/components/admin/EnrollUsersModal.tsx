'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import type { ContentItem, User } from '@/lib/types';
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Search, UserPlus, UserMinus } from 'lucide-react';

interface EnrollUsersModalProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    classItem: ContentItem | null;
}

export function EnrollUsersModal({ isOpen, setIsOpen, classItem }: EnrollUsersModalProps) {
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [enrolledUserIds, setEnrolledUserIds] = useState<string[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        if (isOpen && classItem) {
            fetchUsers();
            setEnrolledUserIds(classItem.classDetails?.registeredUsers || []);
        }
    }, [isOpen, classItem]);

    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredUsers(users);
        } else {
            const term = searchTerm.toLowerCase();
            setFilteredUsers(
                users.filter(
                    (u) =>
                        u.name.toLowerCase().includes(term) ||
                        u.email.toLowerCase().includes(term)
                )
            );
        }
    }, [searchTerm, users]);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const { db } = getFirebaseServices();
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const userData = usersSnapshot.docs
                .map((doc) => doc.data() as User)
                .filter((u) => !u.isAdmin); // Exclude admins from the list
            setUsers(userData);
            setFilteredUsers(userData);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast({
                title: 'Error',
                description: 'No se pudieron cargar los usuarios.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleEnrollment = async (userId: string, isEnrolled: boolean) => {
        if (!classItem?.id) return;

        try {
            const { db } = getFirebaseServices();
            const classRef = doc(db, 'content', classItem.id);

            if (isEnrolled) {
                // Remove user
                await updateDoc(classRef, {
                    'classDetails.registeredUsers': arrayRemove(userId),
                });
                setEnrolledUserIds((prev) => prev.filter((id) => id !== userId));
                toast({
                    title: 'Usuario desinscrito',
                    description: 'El usuario ha sido removido de la clase.',
                });
            } else {
                // Add user
                await updateDoc(classRef, {
                    'classDetails.registeredUsers': arrayUnion(userId),
                });
                setEnrolledUserIds((prev) => [...prev, userId]);
                toast({
                    title: 'Usuario inscrito',
                    description: 'El usuario ha sido inscrito a la clase.',
                });
            }
        } catch (error) {
            console.error('Error toggling enrollment:', error);
            toast({
                title: 'Error',
                description: 'No se pudo actualizar la inscripción.',
                variant: 'destructive',
            });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Inscribir Usuarios a "{classItem?.title}"</DialogTitle>
                    <DialogDescription>
                        Selecciona los usuarios que deseas inscribir o desinscribir de esta clase.
                    </DialogDescription>
                </DialogHeader>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por nombre o email..."
                        className="pl-10"
                    />
                </div>

                <ScrollArea className="h-[400px] -mx-6 px-6">
                    {isLoading ? (
                        <p className="text-center py-8 text-muted-foreground">Cargando usuarios...</p>
                    ) : filteredUsers.length === 0 ? (
                        <p className="text-center py-8 text-muted-foreground">
                            No se encontraron usuarios.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {filteredUsers.map((user) => {
                                const isEnrolled = enrolledUserIds.includes(user.id);
                                return (
                                    <div
                                        key={user.id}
                                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            {user.avatar ? (
                                                <img
                                                    src={user.avatar}
                                                    alt={user.name}
                                                    className="w-10 h-10 rounded-full"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <span className="text-primary font-semibold text-sm">
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-semibold">{user.name}</p>
                                                <p className="text-sm text-muted-foreground">{user.email}</p>
                                            </div>
                                        </div>
                                        <Button
                                            variant={isEnrolled ? 'destructive' : 'default'}
                                            size="sm"
                                            onClick={() => handleToggleEnrollment(user.id, isEnrolled)}
                                        >
                                            {isEnrolled ? (
                                                <>
                                                    <UserMinus className="mr-2 h-4 w-4" />
                                                    Desinscribir
                                                </>
                                            ) : (
                                                <>
                                                    <UserPlus className="mr-2 h-4 w-4" />
                                                    Inscribir
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>

                <div className="flex justify-between items-center pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                        {enrolledUserIds.length} usuario(s) inscrito(s)
                    </p>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>
                        Cerrar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
