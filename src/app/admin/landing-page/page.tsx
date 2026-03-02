'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getFirebaseServices } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Save, Image as ImageIcon, ChevronUp, ChevronDown } from 'lucide-react';

interface LandingPageConfig {
    heroImages: string[];
    autoPlayInterval: number;
}

export default function LandingPageAdmin() {
    const [config, setConfig] = useState<LandingPageConfig>({
        heroImages: [],
        autoPlayInterval: 5000
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const { db } = getFirebaseServices();
            const docRef = doc(db, 'settings', 'landingPage');
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                setConfig(docSnap.data() as LandingPageConfig);
            }
        } catch (error) {
            console.error('Error loading config:', error);
            toast({
                title: 'Error',
                description: 'No se pudo cargar la configuración',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (file: File, index?: number) => {
        try {
            const targetIndex = index ?? config.heroImages.length;
            setUploadingIndex(targetIndex);

            const { storage } = getFirebaseServices();
            const timestamp = Date.now();
            const fileName = `landing-hero-${timestamp}-${file.name}`;
            const storageRef = ref(storage, `landing/${fileName}`);

            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            const newImages = [...config.heroImages];
            if (index !== undefined) {
                // Replace existing image
                newImages[index] = downloadURL;
            } else {
                // Add new image
                newImages.push(downloadURL);
            }

            setConfig({ ...config, heroImages: newImages });

            toast({
                title: 'Éxito',
                description: 'Imagen subida correctamente'
            });
        } catch (error) {
            console.error('Error uploading image:', error);
            toast({
                title: 'Error',
                description: 'No se pudo subir la imagen',
                variant: 'destructive'
            });
        } finally {
            setUploadingIndex(null);
        }
    };

    const handleRemoveImage = (index: number) => {
        const newImages = config.heroImages.filter((_, i) => i !== index);
        setConfig({ ...config, heroImages: newImages });
    };

    const handleMoveImage = (index: number, direction: 'up' | 'down') => {
        const newImages = [...config.heroImages];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= newImages.length) return;

        [newImages[index], newImages[targetIndex]] = [newImages[targetIndex], newImages[index]];
        setConfig({ ...config, heroImages: newImages });
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const { db } = getFirebaseServices();
            const docRef = doc(db, 'settings', 'landingPage');

            await setDoc(docRef, config);

            toast({
                title: 'Éxito',
                description: 'Configuración guardada correctamente'
            });
        } catch (error) {
            console.error('Error saving config:', error);
            toast({
                title: 'Error',
                description: 'No se pudo guardar la configuración',
                variant: 'destructive'
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#3A5064] border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Configuración de Landing Page</h1>
                <p className="text-gray-600">Administra el carrusel de imágenes del hero de la landing page</p>
            </div>

            <div className="space-y-6">
                {/* Auto-play Interval */}
                <Card className="p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Configuración del Carrusel</h2>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="interval">Intervalo de Auto-reproducción (milisegundos)</Label>
                            <Input
                                id="interval"
                                type="number"
                                min="1000"
                                step="1000"
                                value={config.autoPlayInterval}
                                onChange={(e) => setConfig({ ...config, autoPlayInterval: parseInt(e.target.value) || 5000 })}
                                className="max-w-xs"
                            />
                            <p className="text-sm text-gray-500 mt-1">
                                Tiempo entre cambios automáticos de imagen (recomendado: 5000ms = 5 segundos)
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Hero Images */}
                <Card className="p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Imágenes del Hero</h2>

                    {/* Image List */}
                    <div className="space-y-4 mb-6">
                        {config.heroImages.map((image, index) => (
                            <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                                <div className="w-32 h-20 flex-shrink-0 bg-white rounded-lg overflow-hidden border border-gray-200">
                                    <img
                                        src={image}
                                        alt={`Hero ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900">Imagen {index + 1}</p>
                                    <p className="text-xs text-gray-500 truncate">{image}</p>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* Move Up */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleMoveImage(index, 'up')}
                                        disabled={index === 0}
                                    >
                                        <ChevronUp className="w-4 h-4" />
                                    </Button>

                                    {/* Move Down */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleMoveImage(index, 'down')}
                                        disabled={index === config.heroImages.length - 1}
                                    >
                                        <ChevronDown className="w-4 h-4" />
                                    </Button>

                                    {/* Replace Image */}
                                    <label className="cursor-pointer">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={uploadingIndex === index}
                                            asChild
                                        >
                                            <span>
                                                {uploadingIndex === index ? (
                                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#3A5064] border-t-transparent" />
                                                ) : (
                                                    <Upload className="w-4 h-4" />
                                                )}
                                            </span>
                                        </Button>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleImageUpload(file, index);
                                            }}
                                            disabled={uploadingIndex === index}
                                        />
                                    </label>

                                    {/* Remove */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleRemoveImage(index)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}

                        {config.heroImages.length === 0 && (
                            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                                <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                <p className="text-gray-600 mb-1">No hay imágenes configuradas</p>
                                <p className="text-sm text-gray-500">Agrega tu primera imagen para el carrusel</p>
                            </div>
                        )}
                    </div>

                    {/* Add New Image */}
                    <label className="cursor-pointer">
                        <Button
                            variant="outline"
                            disabled={uploadingIndex !== null}
                            asChild
                        >
                            <span>
                                {uploadingIndex === config.heroImages.length ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#3A5064] border-t-transparent mr-2" />
                                        Subiendo...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4 mr-2" />
                                        Agregar Nueva Imagen
                                    </>
                                )}
                            </span>
                        </Button>
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(file);
                            }}
                            disabled={uploadingIndex !== null}
                        />
                    </label>
                </Card>

                {/* Save Button */}
                <div className="flex justify-end gap-4">
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-[#3A5064] hover:bg-[#2d3e50]"
                    >
                        {saving ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Guardar Cambios
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
