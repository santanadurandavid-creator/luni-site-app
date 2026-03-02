'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Avatar as AvatarType } from '@/lib/types';
import Image from 'next/image';
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getFirebaseServices } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';

const AvatarCardSkeleton = () => (
    <Skeleton className="relative aspect-square w-full rounded-lg overflow-hidden" />
);


export default function AdminAvatarsPage() {
    const [avatars, setAvatars] = useState<AvatarType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        const { db } = getFirebaseServices();
        const q = query(collection(db, 'avatars'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const avatarsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AvatarType));
            setAvatars(avatarsData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching avatars:", error);
            toast({ variant: 'destructive', title: "Error", description: "No se pudieron cargar los avatares." });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [toast]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setImageFile(e.target.files[0]);
        }
    };

    const handleUploadAvatar = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!imageFile) {
            toast({ variant: 'destructive', title: "Error", description: "Por favor, selecciona un archivo de imagen." });
            return;
        }

        setIsUploading(true);
        try {
            const { db, storage } = getFirebaseServices();
            const storageRef = ref(storage, `avatars/${Date.now()}_${imageFile.name}`);
            const snapshot = await uploadBytes(storageRef, imageFile);
            const downloadURL = await getDownloadURL(snapshot.ref);

            await addDoc(collection(db, 'avatars'), {
                url: downloadURL,
                createdAt: serverTimestamp(),
            });

            toast({
                title: "Avatar Subido",
                description: "El nuevo avatar está disponible para los usuarios.",
            });
            
            // Reset form
            setImageFile(null);
            (e.target as HTMLFormElement).reset();

        } catch (error) {
            console.error("Error uploading avatar:", error);
            toast({ variant: 'destructive', title: "Error", description: "No se pudo subir el avatar." });
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteAvatar = async (avatar: AvatarType) => {
        if (!window.confirm("¿Estás seguro de que quieres eliminar este avatar?")) return;

        try {
            const { db, storage } = getFirebaseServices();
            // Delete from Firestore
            await deleteDoc(doc(db, 'avatars', avatar.id));

            // Delete from Storage
            const imageRef = ref(storage, avatar.url);
            await deleteObject(imageRef);

            toast({
                title: "Avatar Eliminado",
                description: "El avatar ha sido eliminado permanentemente.",
            });
        } catch (error) {
            console.error("Error deleting avatar:", error);
            toast({ variant: 'destructive', title: "Error", description: "No se pudo eliminar el avatar." });
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Gestión de Avatares</h1>
                <p className="text-muted-foreground">Sube y administra los avatares predeterminados que los usuarios pueden elegir.</p>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ImageIcon /> Avatares Disponibles</CardTitle>
                        <CardDescription>Estos son los avatares que los usuarios pueden seleccionar.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                             <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-4">
                                {Array.from({ length: 12 }).map((_, i) => <AvatarCardSkeleton key={i} />)}
                            </div>
                        ) : (
                            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-4">
                                {avatars.map(avatar => (
                                    <div key={avatar.id} className="relative group">
                                        <div className="relative aspect-square w-full rounded-lg overflow-hidden">
                                            <Image src={avatar.url} alt="Avatar" layout="fill" objectFit="cover" />
                                        </div>
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                onClick={() => handleDeleteAvatar(avatar)}
                                                className="h-8 w-8"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                         { !isLoading && avatars.length === 0 && (
                            <p className="text-center text-muted-foreground py-8">No hay avatares. Sube uno para empezar.</p>
                        )}
                    </CardContent>
                </Card>
                 <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Subir Nuevo Avatar</CardTitle>
                        <CardDescription>La imagen debe ser cuadrada para una mejor visualización.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleUploadAvatar} className="w-full space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="avatar-file">Archivo de Imagen</Label>
                                <Input id="avatar-file" type="file" onChange={handleImageChange} accept="image/*" required />
                            </div>
                            <Button type="submit" className="w-full" disabled={isUploading}>
                                {isUploading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Subiendo...
                                    </>
                                ) : (
                                    <>
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Añadir Avatar
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
