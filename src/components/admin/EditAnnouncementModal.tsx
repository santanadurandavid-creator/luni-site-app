
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
import { Textarea } from '@/components/ui/textarea';
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { UpdateInfo } from '@/lib/types';
import Image from 'next/image';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { ScrollArea } from '../ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EditAnnouncementModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  item: UpdateInfo | null;
}

export function EditAnnouncementModal({ isOpen, setIsOpen, item }: EditAnnouncementModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState<'url' | 'html'>('url');
  const [contentUrl, setContentUrl] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      if (item) {
        setTitle(item.title);
        setDescription(item.description || '');
        setContentType(item.contentType || 'url');
        setContentUrl(item.contentUrl || '');
        setContentHtml(item.contentHtml || '');
        setImagePreview(item.imageUrl || null);
        setImageFile(null);
      } else {
        // Reset form for creation
        setTitle('');
        setDescription('');
        setContentType('url');
        setContentUrl('');
        setContentHtml('');
        setImagePreview('https://placehold.co/600x400.png');
        setImageFile(null);
      }
    }
  }, [item, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast({ variant: 'destructive', title: "Error", description: "El título y la descripción son requeridos." });
      return;
    }

    setIsSubmitting(true);

    try {
      const { db, storage } = getFirebaseServices();
      let imageUrl = item?.imageUrl || null;

      if (imageFile) {
        const storageRef = ref(storage, `announcements/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      if (!imageUrl) {
        toast({ variant: 'destructive', title: "Error", description: "Se requiere una imagen." });
        setIsSubmitting(false);
        return;
      }

      const announcementData = {
        title,
        description,
        contentType,
        contentUrl: contentType === 'url' ? contentUrl : '',
        contentHtml: contentType === 'html' ? contentHtml : '',
        imageUrl,
        date: item?.date || new Date().toISOString().split('T')[0], // Use existing or new date
      };

      if (item) {
        // Update existing item
        const itemRef = doc(db, 'announcements', item.id);
        await updateDoc(itemRef, announcementData);
        toast({
          title: 'Novedad Actualizada',
          description: `La novedad "${title}" ha sido guardada exitosamente.`,
        });
      } else {
        // Create new item
        const docRef = await addDoc(collection(db, 'announcements'), {
          ...announcementData,
          createdAt: serverTimestamp(),
        });

        // Send push notification for new announcement
        try {
          await fetch('/api/notifications/send-push', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: `Novedad: ${title}`,
              description: description,
              imageUrl: imageUrl,
              url: '/updates', // Path to the announcements page
              isScheduled: false,
            }),
          });
        } catch (pushError) {
          console.error("Error sending push notification for announcement:", pushError);
          // We don't fail the whole process if push fails, just log it
        }

        toast({
          title: 'Novedad Creada',
          description: `La novedad "${title}" ha sido creada exitosamente y se ha enviado una notificación.`,
        });
      }
      setIsOpen(false);

    } catch (error) {
      console.error("Error saving announcement:", error);
      toast({ variant: 'destructive', title: "Error", description: "No se pudo guardar la novedad." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-[95vw] max-w-xl rounded-lg flex flex-col max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4 flex-shrink-0 border-b">
          <DialogTitle>{item ? 'Editar Novedad' : 'Crear Novedad'}</DialogTitle>
          <DialogDescription>
            Rellena los detalles del anuncio. Elige entre URL o código HTML para el contenido.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto">
          <form id="announcement-form" onSubmit={handleSubmit} className="space-y-4 p-6">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título del anuncio"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción Corta</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción corta que aparece en la tarjeta"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contentType">Tipo de Contenido</Label>
              <Select value={contentType} onValueChange={(value: 'url' | 'html') => setContentType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="url">URL</SelectItem>
                  <SelectItem value="html">Código HTML</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {contentType === 'url' ? (
              <div className="space-y-2">
                <Label htmlFor="contentUrl">URL del Contenido</Label>
                <Input
                  id="contentUrl"
                  value={contentUrl}
                  onChange={(e) => setContentUrl(e.target.value)}
                  placeholder="https://ejemplo.com/noticia"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="contentHtml">Código HTML</Label>
                <Textarea
                  id="contentHtml"
                  value={contentHtml}
                  onChange={(e) => setContentHtml(e.target.value)}
                  placeholder="<h1>Título</h1><p>Contenido...</p>"
                  rows={6}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Imagen de Portada</Label>
              <Label htmlFor="image-upload" className="cursor-pointer">
                {imagePreview && (
                  <div className="aspect-video relative rounded-md overflow-hidden border hover:opacity-80 transition-opacity">
                    <Image src={imagePreview} alt="Vista previa" layout="fill" objectFit="cover" />
                  </div>
                )}
              </Label>
              <Input id="image-upload" type="file" onChange={handleImageChange} accept="image/*" className="hidden" />
            </div>
          </form>
        </div>
        <DialogFooter className="p-6 pt-4 border-t flex-shrink-0 bg-background">
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
          <Button type="submit" form="announcement-form" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar Cambios'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
