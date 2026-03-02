

'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import type { Avatar as AvatarType } from '@/lib/types';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';
import { ScrollArea } from '../ui/scroll-area';
import { Upload } from 'lucide-react';
import { formatDistanceToNow, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';

interface EditProfileModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function EditProfileModal({ isOpen, setIsOpen }: EditProfileModalProps) {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [avatars, setAvatars] = useState<AvatarType[]>([]);
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string | null>(user?.avatar || null);
  const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null);
  const [isLoadingAvatars, setIsLoadingAvatars] = useState(true);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setSelectedAvatarUrl(user.avatar);
      setNewAvatarFile(null); // Reset file on open
    }
  }, [user, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    
    setIsLoadingAvatars(true);
    const { db } = getFirebaseServices();
    const q = query(collection(db, 'avatars'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const avatarsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AvatarType));
        setAvatars(avatarsData);
        setIsLoadingAvatars(false);
    });

    return () => unsubscribe();
  }, [isOpen]);

  const canUploadCustomAvatar = useMemo(() => {
    if (!user?.avatarLastUpdatedAt) return true;
    const lastUpdate = new Date(user.avatarLastUpdatedAt.seconds * 1000);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    return lastUpdate < oneMonthAgo;
  }, [user?.avatarLastUpdatedAt]);

  const nextChangeDate = useMemo(() => {
    if (canUploadCustomAvatar || !user?.avatarLastUpdatedAt) return null;
    const lastUpdate = new Date(user.avatarLastUpdatedAt.seconds * 1000);
    const nextDate = addMonths(lastUpdate, 1);
    return formatDistanceToNow(nextDate, { addSuffix: true, locale: es });
  }, [user?.avatarLastUpdatedAt, canUploadCustomAvatar]);


  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setNewAvatarFile(file);
          setSelectedAvatarUrl(URL.createObjectURL(file));
      }
  };
  
  const handleAvatarSelect = (avatarUrl: string) => {
      setSelectedAvatarUrl(avatarUrl);
      setNewAvatarFile(null); // Clear file if selecting a preset avatar
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedAvatarUrl) {
        toast({ variant: 'destructive', title: 'Error', description: 'El nombre y un avatar son requeridos.'});
        return;
    }

    await updateUser({ name, avatar: selectedAvatarUrl, newAvatarFile });
    toast({ title: 'Perfil actualizado', description: 'Tus cambios han sido guardados.' });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-[95vw] max-w-2xl rounded-lg p-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>Editar Perfil</DialogTitle>
          <DialogDescription>
            Realiza cambios en tu perfil. Haz clic en guardar cuando termines.
          </DialogDescription>
        </DialogHeader>
        <form id="edit-profile-form" onSubmit={handleSubmit} className="flex-grow overflow-y-auto">
          <div className="grid gap-6 p-6">
            <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="max-w-sm"
                />
            </div>

            <div className="space-y-2">
                <Label>Selecciona un Avatar o Sube tu Foto</Label>
                <p className="text-xs text-muted-foreground">
                    Puedes cambiar entre los avatares predeterminados en cualquier momento. 
                    Subir una foto personalizada solo se permite una vez al mes.
                </p>
                {!canUploadCustomAvatar && (
                    <p className="text-xs text-amber-600 dark:text-amber-500">
                        Podrás subir una foto nueva {nextChangeDate}.
                    </p>
                )}
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageChange}
                    accept="image/*"
                    className="hidden" 
                    disabled={!canUploadCustomAvatar}
                />
                {isLoadingAvatars ? (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20 w-20 rounded-full" />)}
                </div>
                ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-4">
                    {/* Upload Button */}
                    <button
                        type="button"
                        onClick={() => canUploadCustomAvatar && fileInputRef.current?.click()}
                        disabled={!canUploadCustomAvatar}
                        className={cn(
                            "relative h-16 w-16 sm:h-20 sm:w-20 rounded-full overflow-hidden border-4 border-dashed border-muted-foreground/50 flex items-center justify-center text-muted-foreground transition-all",
                            "hover:border-primary hover:text-primary",
                            newAvatarFile && 'border-primary ring-2 ring-primary',
                            !canUploadCustomAvatar && "opacity-50 cursor-not-allowed hover:border-muted-foreground/50 hover:text-muted-foreground"
                        )}
                        >
                            {selectedAvatarUrl && newAvatarFile ? (
                                <Image src={selectedAvatarUrl} alt="Vista previa" layout="fill" objectFit="cover" />
                            ) : (
                                <Upload className="h-8 w-8" />
                            )}
                        </button>
                    
                    {/* Preset Avatars */}
                    {avatars.map(avatar => (
                        <button
                            key={avatar.id}
                            type="button"
                            onClick={() => handleAvatarSelect(avatar.url)}
                            className={cn(
                                "relative h-16 w-16 sm:h-20 sm:w-20 rounded-full overflow-hidden border-4 border-transparent transition-all cursor-pointer",
                                selectedAvatarUrl === avatar.url && !newAvatarFile && 'border-primary ring-2 ring-primary'
                            )}
                        >
                            <Image src={avatar.url} alt="Avatar" layout="fill" objectFit="cover" />
                        </button>
                    ))}
                </div>
                )}
            </div>
          </div>
        </form>
          <DialogFooter className="p-6 pt-4 border-t flex-shrink-0 bg-background">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button type="submit" form="edit-profile-form">Guardar cambios</Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
