'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Image as ImageIcon, X } from 'lucide-react';
import { getFirebaseServices } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface SendNotificationModalProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    userIds: string[];
    classId: string;
    classTitle: string;
    notificationType: 'reminder' | 'absence';
}

export function SendNotificationModal({
    isOpen,
    setIsOpen,
    userIds,
    classId,
    classTitle,
    notificationType
}: SendNotificationModalProps) {
    const { toast } = useToast();
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    // Set default messages based on notification type
    const getDefaultMessage = () => {
        if (notificationType === 'reminder') {
            return `🔔 Recordatorio: Tienes una clase programada de "${classTitle}". ¡No te la pierdas!`;
        } else {
            return `📋 Notamos que no asististe a la clase de "${classTitle}". ¡Esperamos verte en la próxima sesión!`;
        }
    };

    // Set message when modal opens
    useState(() => {
        if (isOpen) {
            setMessage(getDefaultMessage());
        }
    });

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview(null);
    };

    const handleSend = async () => {
        if (!message.trim()) {
            toast({
                title: 'Error',
                description: 'Por favor escribe un mensaje',
                variant: 'destructive'
            });
            return;
        }

        setIsSending(true);

        try {
            let imageUrl = '';

            if (imageFile) {
                const { storage } = getFirebaseServices();
                const storageRef = ref(storage, `notifications/${Date.now()}_${imageFile.name}`);
                const snapshot = await uploadBytes(storageRef, imageFile);
                imageUrl = await getDownloadURL(snapshot.ref);
            }

            const response = await fetch('/api/admin/send-class-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userIds,
                    message: message.trim(),
                    classId,
                    classTitle,
                    notificationType,
                    imageUrl
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al enviar notificaciones');
            }

            toast({
                title: 'Notificaciones Enviadas',
                description: `Se enviaron ${userIds.length} notificación(es) exitosamente`
            });

            setIsOpen(false);
            setMessage('');
            setImageFile(null);
            setImagePreview(null);
        } catch (error: any) {
            console.error('Error sending notifications:', error);
            toast({
                title: 'Error',
                description: error.message || 'No se pudieron enviar las notificaciones',
                variant: 'destructive'
            });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {notificationType === 'reminder' ? 'Enviar Recordatorio' : 'Notificar Ausencias'}
                    </DialogTitle>
                    <DialogDescription>
                        Se enviará una notificación push y en la app a {userIds.length} usuario(s)
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="message">Mensaje de la notificación</Label>
                        <Textarea
                            id="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Escribe tu mensaje personalizado..."
                            rows={5}
                            className="resize-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Imagen (Opcional)</Label>
                        {!imagePreview ? (
                            <div className="flex items-center gap-2">
                                <Input
                                    id="image"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="hidden"
                                />
                                <Label
                                    htmlFor="image"
                                    className="flex items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                        <ImageIcon className="w-6 h-6" />
                                        <span className="text-xs">Adjuntar imagen</span>
                                    </div>
                                </Label>
                            </div>
                        ) : (
                            <div className="relative w-full h-40 rounded-lg overflow-hidden border">
                                <img
                                    src={imagePreview}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                />
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-2 right-2 h-6 w-6 rounded-full"
                                    onClick={handleRemoveImage}
                                >
                                    <X className="w-3 h-3" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => setIsOpen(false)}
                        disabled={isSending}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSend}
                        disabled={isSending || !message.trim()}
                    >
                        {isSending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Enviando...
                            </>
                        ) : (
                            'Enviar Notificaciones'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
