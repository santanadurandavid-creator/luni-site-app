'use client';

import { useState, useEffect } from 'react';
import { getFirebaseServices } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, Eye, EyeOff, GripVertical } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Advertisement } from '@/lib/types';
import { AdFormModal } from '@/components/admin/AdFormModal';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function AdsManagementPage() {
    const { user } = useAuth();
    const { toast } = useToast();

    const [ads, setAds] = useState<Advertisement[]>([]);
    const [loadingAds, setLoadingAds] = useState(true);
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
    const [deletingAdId, setDeletingAdId] = useState<string | null>(null);

    // Load advertisements
    useEffect(() => {
        if (!user) return;
        const { db } = getFirebaseServices();
        const adsRef = collection(db, 'advertisements');
        const q = query(adsRef, orderBy('priority', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const adsData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Advertisement[];
            setAds(adsData);
            setLoadingAds(false);
        });
        return () => unsubscribe();
    }, [user]);



    const handleCreateAd = () => {
        setEditingAd(null);
        setShowFormModal(true);
    };

    const handleEditAd = (ad: Advertisement) => {
        setEditingAd(ad);
        setShowFormModal(true);
    };

    const handleDeleteAd = async (adId: string) => {
        try {
            const { db } = getFirebaseServices();
            await deleteDoc(doc(db, 'advertisements', adId));
            toast({ title: 'Anuncio eliminado', description: 'El anuncio ha sido eliminado exitosamente.' });
            setDeletingAdId(null);
        } catch (error) {
            console.error('Error deleting ad:', error);
            toast({ title: 'Error', description: 'No se pudo eliminar el anuncio.', variant: 'destructive' });
        }
    };

    const handleToggleActive = async (ad: Advertisement) => {
        try {
            const { db } = getFirebaseServices();
            await updateDoc(doc(db, 'advertisements', ad.id), {
                isActive: !ad.isActive,
                updatedAt: Timestamp.now(),
            });
            toast({
                title: ad.isActive ? 'Anuncio desactivado' : 'Anuncio activado',
                description: `El anuncio ha sido ${ad.isActive ? 'desactivado' : 'activado'} exitosamente.`,
            });
        } catch (error) {
            console.error('Error toggling ad:', error);
            toast({ title: 'Error', description: 'No se pudo cambiar el estado del anuncio.', variant: 'destructive' });
        }
    };



    const AdCard = ({ ad }: { ad: Advertisement }) => (
        <Card className="mb-4">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                        <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                        <div>
                            <CardTitle className="text-lg">{ad.name}</CardTitle>
                            <CardDescription>
                                Prioridad: {ad.priority} • Tipo: {ad.type === 'script' ? 'Script/HTML' : 'Imagen'}{ad.section && ` • Sección: ${ad.section}`}
                            </CardDescription>
                        </div>
                    </div>
                    <Badge variant={ad.isActive ? 'default' : 'secondary'}>{ad.isActive ? 'Activo' : 'Inactivo'}</Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2 mb-2">
                    <Button variant="outline" size="sm" onClick={() => handleToggleActive(ad)}>
                        {ad.isActive ? (
                            <><EyeOff className="h-4 w-4 mr-2" />Desactivar</>
                        ) : (
                            <><Eye className="h-4 w-4 mr-2" />Activar</>
                        )}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEditAd(ad)}>
                        <Pencil className="h-4 w-4 mr-2" />Editar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setDeletingAdId(ad.id)}>
                        <Trash2 className="h-4 w-4 mr-2" />Eliminar
                    </Button>
                </div>
                <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                    <p className="text-sm font-medium mb-2">Vista previa:</p>
                    {ad.type === 'image' && ad.imageUrl ? (
                        <div className="flex flex-col items-center gap-2">
                            <img src={ad.imageUrl} alt={ad.name} className="max-w-full h-auto max-h-32 object-contain" />
                            {ad.clickUrl && <p className="text-xs text-muted-foreground">Click URL: {ad.clickUrl}</p>}
                        </div>
                    ) : ad.type === 'script' && ad.scriptContent ? (
                        <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words">{ad.scriptContent.substring(0, 200)}{ad.scriptContent.length > 200 && '...'}</pre>
                    ) : (
                        <p className="text-sm text-muted-foreground">Sin contenido</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );

    if (loadingAds) {
        return (
            <div className="flex items-center justify-center h-96">
                <p>Cargando datos...</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Gestión de Anuncios y Guías</h1>
                    <p className="text-muted-foreground">Administra los anuncios y guías de la aplicación</p>
                </div>
                <Button onClick={handleCreateAd}>
                    <Plus className="h-4 w-4 mr-2" />Nuevo Anuncio
                </Button>
            </div>
            <Tabs defaultValue="modal" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="modal">Anuncios Modal ({ads.filter(a => a.placement === 'modal').length})</TabsTrigger>
                    <TabsTrigger value="banner">Anuncios Banner ({ads.filter(a => a.placement === 'banner').length})</TabsTrigger>
                </TabsList>

                <TabsContent value="modal" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Anuncios Modal</CardTitle>
                            <CardDescription>Anuncios que aparecen en ventanas emergentes.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {ads.filter(a => a.placement === 'modal').length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">No hay anuncios modales configurados</p>
                            ) : (
                                ads.filter(a => a.placement === 'modal').map(ad => <AdCard key={ad.id} ad={ad} />)
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="banner" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Anuncios Banner</CardTitle>
                            <CardDescription>Anuncios fijos en la parte inferior.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {ads.filter(a => a.placement === 'banner').length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">No hay anuncios banner configurados</p>
                            ) : (
                                ads.filter(a => a.placement === 'banner').map(ad => <AdCard key={ad.id} ad={ad} />)
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>


            </Tabs>

            {/* Form Modal */}
            <AdFormModal isOpen={showFormModal} onClose={() => { setShowFormModal(false); setEditingAd(null); }} editingAd={editingAd} />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deletingAdId} onOpenChange={() => setDeletingAdId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>Esta acción no se puede deshacer. El anuncio será eliminado permanentemente.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deletingAdId && handleDeleteAd(deletingAdId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
