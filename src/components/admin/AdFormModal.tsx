'use client';

import { useState, useEffect } from 'react';
import { getFirebaseServices } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, Timestamp, query, orderBy, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Advertisement, AdType, AdPlacement, AdSection } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Image as ImageIcon } from 'lucide-react';

interface AdFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingAd: Advertisement | null;
}

export function AdFormModal({ isOpen, onClose, editingAd }: AdFormModalProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [type, setType] = useState<AdType>('script');
    const [placement, setPlacement] = useState<AdPlacement>('modal');
    const [section, setSection] = useState<AdSection>('all');
    const [scriptContent, setScriptContent] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [clickUrl, setClickUrl] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [priority, setPriority] = useState(1);

    // Load editing ad data
    useEffect(() => {
        if (editingAd) {
            setName(editingAd.name);
            setType(editingAd.type);
            setPlacement(editingAd.placement);
            setSection(editingAd.section || 'all');
            setScriptContent(editingAd.scriptContent || '');
            setImageUrl(editingAd.imageUrl || '');
            setClickUrl(editingAd.clickUrl || '');
            setIsActive(editingAd.isActive);
            setPriority(editingAd.priority);
        } else {
            // Reset form for new ad
            setName('');
            setType('script');
            setPlacement('modal');
            setSection('all');
            setScriptContent('');
            setImageUrl('');
            setClickUrl('');
            setIsActive(true);
            setPriority(1);
        }
    }, [editingAd, isOpen]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast({
                title: 'Error',
                description: 'Por favor selecciona un archivo de imagen válido.',
                variant: 'destructive',
            });
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast({
                title: 'Error',
                description: 'La imagen no debe superar los 5MB.',
                variant: 'destructive',
            });
            return;
        }

        setUploadingImage(true);
        try {
            const { storage } = getFirebaseServices();
            const timestamp = Date.now();
            const fileName = `ads/${timestamp}_${file.name}`;
            const storageRef = ref(storage, fileName);

            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            setImageUrl(url);

            toast({
                title: 'Imagen subida',
                description: 'La imagen ha sido subida exitosamente.',
            });
        } catch (error) {
            console.error('Error uploading image:', error);
            toast({
                title: 'Error',
                description: 'No se pudo subir la imagen.',
                variant: 'destructive',
            });
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) return;

        // Validation
        if (!name.trim()) {
            toast({
                title: 'Error',
                description: 'Por favor ingresa un nombre para el anuncio.',
                variant: 'destructive',
            });
            return;
        }

        if (type === 'script' && !scriptContent.trim()) {
            toast({
                title: 'Error',
                description: 'Por favor ingresa el código del anuncio.',
                variant: 'destructive',
            });
            return;
        }

        if (type === 'image') {
            if (!imageUrl.trim()) {
                toast({
                    title: 'Error',
                    description: 'Por favor sube una imagen.',
                    variant: 'destructive',
                });
                return;
            }
            if (!clickUrl.trim()) {
                toast({
                    title: 'Error',
                    description: 'Por favor ingresa la URL de destino.',
                    variant: 'destructive',
                });
                return;
            }
        }

        setLoading(true);
        try {
            const { db } = getFirebaseServices();

            const adData: Partial<Advertisement> = {
                name: name.trim(),
                type,
                placement,
                section: placement === 'banner' ? section : undefined,
                isActive,
                priority,
                updatedAt: Timestamp.now(),
            };

            if (type === 'script') {
                adData.scriptContent = scriptContent.trim();
                adData.imageUrl = null as any; // Firestore doesn't accept undefined
                adData.clickUrl = null as any;
            } else {
                adData.imageUrl = imageUrl.trim();
                adData.clickUrl = clickUrl.trim();
                adData.scriptContent = null as any;
            }

            // Remove undefined values from adData to prevent Firestore errors
            Object.keys(adData).forEach(key => {
                if (adData[key as keyof Advertisement] === undefined) {
                    delete adData[key as keyof Advertisement];
                }
            });

            if (editingAd) {
                // Update existing ad
                await updateDoc(doc(db, 'advertisements', editingAd.id), adData);
                toast({
                    title: 'Anuncio actualizado',
                    description: 'El anuncio ha sido actualizado exitosamente.',
                });
            } else {
                // Create new ad
                // Get next priority number
                const adsRef = collection(db, 'advertisements');
                const q = query(adsRef, orderBy('priority', 'desc'));
                const snapshot = await getDocs(q);
                const maxPriority = snapshot.empty ? 0 : (snapshot.docs[0].data() as Advertisement).priority;

                await addDoc(collection(db, 'advertisements'), {
                    ...adData,
                    priority: maxPriority + 1,
                    createdAt: Timestamp.now(),
                    createdBy: user.id,
                });

                toast({
                    title: 'Anuncio creado',
                    description: 'El anuncio ha sido creado exitosamente.',
                });
            }

            onClose();
        } catch (error) {
            console.error('Error saving ad:', error);
            toast({
                title: 'Error',
                description: 'No se pudo guardar el anuncio.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {editingAd ? 'Editar Anuncio' : 'Crear Nuevo Anuncio'}
                    </DialogTitle>
                    <DialogDescription>
                        {editingAd
                            ? 'Modifica los detalles del anuncio'
                            : 'Completa los detalles para crear un nuevo anuncio'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Name */}
                    <div className="space-y-2">
                        <Label htmlFor="name">Nombre del Anuncio *</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej: Anuncio Principal Banner"
                            required
                        />
                    </div>

                    {/* Type */}
                    <div className="space-y-2">
                        <Label htmlFor="type">Tipo de Anuncio *</Label>
                        <Select value={type} onValueChange={(value) => setType(value as AdType)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="script">Script/HTML</SelectItem>
                                <SelectItem value="image">Imagen + URL</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Placement */}
                    <div className="space-y-2">
                        <Label htmlFor="placement">Ubicación *</Label>
                        <Select value={placement} onValueChange={(value) => setPlacement(value as AdPlacement)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="modal">Modal (Ventana emergente)</SelectItem>
                                <SelectItem value="banner">Banner (Fijo inferior)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Section (only for banner) */}
                    {placement === 'banner' && (
                        <div className="space-y-2">
                            <Label htmlFor="section">Sección *</Label>
                            <Select value={section} onValueChange={(value) => setSection(value as AdSection)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas las secciones</SelectItem>
                                    <SelectItem value="quizzes">Quizzes</SelectItem>
                                    <SelectItem value="content">Contenido</SelectItem>
                                    <SelectItem value="exams">Exámenes</SelectItem>
                                    <SelectItem value="profile">Perfil</SelectItem>
                                    <SelectItem value="classes">Clases</SelectItem>
                                    <SelectItem value="news">Novedades</SelectItem>
                                    <SelectItem value="challenges_modal">Modal de Retos</SelectItem>
                                    <SelectItem value="duel_modal">Modal de Duelo</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Los banners solo se muestran a usuarios no premium
                            </p>
                        </div>
                    )}

                    {/* Content based on type */}
                    <Tabs value={type} className="w-full">
                        <TabsContent value="script" className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="scriptContent">Código del Anuncio *</Label>
                                <Textarea
                                    id="scriptContent"
                                    value={scriptContent}
                                    onChange={(e) => setScriptContent(e.target.value)}
                                    placeholder="Pega aquí el código HTML/JavaScript del anuncio"
                                    rows={8}
                                    className="font-mono text-sm"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Pega el código completo del anuncio (incluyendo tags &lt;script&gt;)
                                </p>
                            </div>
                        </TabsContent>

                        <TabsContent value="image" className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="imageUpload">Imagen del Anuncio *</Label>
                                <div className="flex items-center gap-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => document.getElementById('imageUpload')?.click()}
                                        disabled={uploadingImage}
                                    >
                                        <Upload className="h-4 w-4 mr-2" />
                                        {uploadingImage ? 'Subiendo...' : 'Subir Imagen'}
                                    </Button>
                                    <input
                                        id="imageUpload"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                    />
                                </div>
                                {imageUrl && (
                                    <div className="mt-4 p-4 border rounded-lg">
                                        <img
                                            src={imageUrl}
                                            alt="Preview"
                                            className="max-w-full h-auto max-h-48 object-contain mx-auto"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="clickUrl">URL de Destino *</Label>
                                <Input
                                    id="clickUrl"
                                    type="url"
                                    value={clickUrl}
                                    onChange={(e) => setClickUrl(e.target.value)}
                                    placeholder="https://ejemplo.com"
                                />
                                <p className="text-xs text-muted-foreground">
                                    URL que se abrirá al hacer clic en el anuncio
                                </p>
                            </div>
                        </TabsContent>
                    </Tabs>

                    {/* Active Status */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="isActive">Estado</Label>
                            <p className="text-sm text-muted-foreground">
                                Activar o desactivar este anuncio
                            </p>
                        </div>
                        <Switch
                            id="isActive"
                            checked={isActive}
                            onCheckedChange={setIsActive}
                        />
                    </div>

                    {/* Priority (only for editing) */}
                    {editingAd && (
                        <div className="space-y-2">
                            <Label htmlFor="priority">Prioridad</Label>
                            <Input
                                id="priority"
                                type="number"
                                min="1"
                                value={priority}
                                onChange={(e) => setPriority(parseInt(e.target.value) || 1)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Menor número = mayor prioridad en la rotación
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Guardando...' : editingAd ? 'Actualizar' : 'Crear'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
