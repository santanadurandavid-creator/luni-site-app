'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle, MoreHorizontal, Image as ImageIcon, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { UpdateInfo } from '@/lib/types';
import Image from 'next/image';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EditAnnouncementModal } from '@/components/admin/EditAnnouncementModal';
import { collection, onSnapshot, deleteDoc, doc, orderBy, query } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { DeletePasswordModal } from '@/components/admin/DeletePasswordModal';

const AnnouncementCardSkeleton = () => (
    <Card className="overflow-hidden">
        <CardHeader className="p-0 relative">
            <div className="relative h-48 w-full">
                <Skeleton className="h-full w-full" />
            </div>
        </CardHeader>
    </Card>
);


const AnnouncementCard = ({
    item,
    onEdit,
    onDelete
}: {
    item: UpdateInfo,
    onEdit: (item: UpdateInfo) => void,
    onDelete: (item: UpdateInfo) => void
}) => {
    const { toast } = useToast();
    const handleDelete = () => {
        onDelete(item);
    };

    const handleCardClick = () => {
        if (item.contentType === 'url' && item.contentUrl) {
            // For URL type announcements, open directly in new tab
            window.open(item.contentUrl, '_blank', 'noopener,noreferrer');
        } else if (item.contentType === 'html' && item.contentHtml) {
            // For HTML type, check if it contains social media URLs
            const hasSocialMediaUrl = /facebook\.com|instagram\.com|tiktok\.com|youtube\.com|twitter\.com|linkedin\.com/.test(item.contentHtml);
            if (hasSocialMediaUrl) {
                // Extract first social media URL and open it
                const socialUrlMatch = item.contentHtml.match(/(https?:\/\/(?:www\.)?(?:facebook|instagram|tiktok|youtube|twitter|linkedin)\.com[^\s"']*)/);
                if (socialUrlMatch) {
                    window.open(socialUrlMatch[1], '_blank', 'noopener,noreferrer');
                    return;
                }
            }
            // If no social media URL found, open modal (existing behavior)
            onEdit(item);
        } else {
            // No content, open modal for editing
            onEdit(item);
        }
    };

    return (
        <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={handleCardClick}>
            <CardHeader className="p-0 relative">
                <div className="absolute top-2 right-2 z-10">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="secondary" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(item); }}>Editar</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(); }}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <div className="relative h-48 w-full">
                    <Image
                        src={item.imageUrl || 'https://placehold.co/600x400'}
                        alt={item.title}
                        layout="fill"
                        objectFit="cover"
                        data-ai-hint="announcement banner"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent p-4 flex flex-col justify-end">
                        <h3 className="text-lg font-bold text-white">{item.title}</h3>
                        <p className="text-sm text-white/90">{item.description}</p>
                    </div>
                </div>
            </CardHeader>
        </Card>
    );
};


export default function AdminAnnouncementsPage() {
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<UpdateInfo | null>(null);
    const [announcements, setAnnouncements] = useState<UpdateInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemPendingDeletion, setItemPendingDeletion] = useState<UpdateInfo | null>(null);
    const { toast } = useToast();


    useEffect(() => {
        const { db } = getFirebaseServices();
        const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const announcementsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UpdateInfo));
            setAnnouncements(announcementsData);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleEdit = (item: UpdateInfo) => {
        setSelectedItem(item);
        setModalOpen(true);
    };

    const handleCreate = () => {
        setSelectedItem(null);
        setModalOpen(true);
    };

    const handleDeletePrompt = (item: UpdateInfo) => {
        setItemPendingDeletion(item);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemPendingDeletion) return;
        const item = itemPendingDeletion;

        try {
            const { db } = getFirebaseServices();
            await deleteDoc(doc(db, 'announcements', item.id));
            toast({
                title: "Anuncio Eliminado",
                description: `El anuncio "${item.title}" ha sido eliminado.`,
            });
        } catch (error) {
            console.error("Error deleting announcement:", error);
            toast({ variant: 'destructive', title: "Error", description: "No se pudo eliminar el anuncio." });
        } finally {
            setItemPendingDeletion(null);
            setDeleteModalOpen(false);
        }
    };

    return (
        <>
            <div className="space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold font-headline">Gestión de Novedades</h1>
                        <p className="text-muted-foreground">Administra los anuncios y banners de la página de Novedades.</p>
                    </div>
                    <Button onClick={handleCreate}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Crear Novedad
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ImageIcon />
                            Banners de Novedades
                        </CardTitle>
                        <CardDescription>Visualiza, edita o elimina los anuncios actuales.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {isLoading ? (
                            Array.from({ length: 3 }).map((_, i) => <AnnouncementCardSkeleton key={i} />)
                        ) : (
                            announcements.map(item => (
                                <AnnouncementCard key={item.id} item={item} onEdit={handleEdit} onDelete={handleDeletePrompt} />
                            ))
                        )}
                    </CardContent>
                </Card>

            </div>
            <EditAnnouncementModal
                isOpen={modalOpen}
                setIsOpen={setModalOpen}
                item={selectedItem}
            />
            <DeletePasswordModal
                isOpen={deleteModalOpen}
                onOpenChange={setDeleteModalOpen}
                onConfirm={confirmDelete}
                title={`¿Eliminar anuncio "${itemPendingDeletion?.title || 'Anuncio'}"?`}
            />
        </>
    );
}
