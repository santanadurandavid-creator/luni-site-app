'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Crop, Upload, X } from 'lucide-react';
import { getFirebaseServices } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';

interface ImageCropperProps {
    isOpen: boolean;
    onClose: () => void;
    sourceImages: string[];
    onImageCropped: (imageUrl: string) => void;
    area: string;
    questionId: string;
}

export function ImageCropper({ isOpen, onClose, sourceImages, onImageCropped, area, questionId }: ImageCropperProps) {
    const { toast } = useToast();
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);

    // Cuadro inicial predefinido
    const [crop, setCrop] = useState({ x: 50, y: 50, width: 150, height: 150 });

    const [isUploading, setIsUploading] = useState(false);
    const [dragMode, setDragMode] = useState<'move' | 'resize' | null>(null);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0, cropX: 0, cropY: 0, cropW: 0, cropH: 0 });

    const imageRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Resetear posición al cambiar de imagen
    useEffect(() => {
        setCrop({ x: 50, y: 50, width: 150, height: 150 });
    }, [selectedImageIndex]);

    const handleMouseDown = (e: React.MouseEvent, mode: 'move' | 'resize') => {
        e.stopPropagation();
        setDragMode(mode);
        setDragStart({
            x: e.clientX,
            y: e.clientY,
            cropX: crop.x,
            cropY: crop.y,
            cropW: crop.width,
            cropH: crop.height
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragMode || !imageRef.current) return;

        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        const rect = imageRef.current.getBoundingClientRect();

        if (dragMode === 'move') {
            const nextX = Math.max(0, Math.min(dragStart.cropX + dx, rect.width - crop.width));
            const nextY = Math.max(0, Math.min(dragStart.cropY + dy, rect.height - crop.height));
            setCrop(prev => ({ ...prev, x: nextX, y: nextY }));
        } else if (dragMode === 'resize') {
            const nextW = Math.max(50, Math.min(dragStart.cropW + dx, rect.width - crop.x));
            const nextH = Math.max(50, Math.min(dragStart.cropH + dy, rect.height - crop.y));
            setCrop(prev => ({ ...prev, width: nextW, height: nextH }));
        }
    };

    const handleMouseUp = () => {
        setDragMode(null);
    };

    const handleCropAndUpload = async () => {
        if (!imageRef.current || !canvasRef.current) return;
        setIsUploading(true);

        try {
            const img = imageRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas context error');

            const scaleX = img.naturalWidth / img.width;
            const scaleY = img.naturalHeight / img.height;

            canvas.width = crop.width * scaleX;
            canvas.height = crop.height * scaleY;

            ctx.drawImage(
                img,
                crop.x * scaleX, crop.y * scaleY, crop.width * scaleX, crop.height * scaleY,
                0, 0, canvas.width, canvas.height
            );

            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            const { storage } = getFirebaseServices();
            const timestamp = Date.now();
            const path = `question-images/${area.replace(/[^a-z0-9]/gi, '_')}/crop_${questionId}_${timestamp}.jpg`;
            const imageRefPath = ref(storage, path);

            await uploadString(imageRefPath, dataUrl, 'data_url');
            const url = await getDownloadURL(imageRefPath);

            onImageCropped(url);
            toast({ title: 'Éxito', description: 'Imagen recortada y guardada' });
            onClose();
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Recortar Imagen</DialogTitle>
                    <DialogDescription>
                        Mueve el cuadro con el ratón o cámbiale el tamaño desde la esquina inferior derecha.
                    </DialogDescription>
                </DialogHeader>

                {/* Lista de páginas */}
                <div className="flex gap-2 p-2 border rounded overflow-x-auto bg-muted/50 mb-4">
                    {sourceImages.map((src, i) => (
                        <button
                            key={i}
                            onClick={() => setSelectedImageIndex(i)}
                            className={`w-20 h-20 flex-shrink-0 border-2 rounded overflow-hidden ${selectedImageIndex === i ? 'border-primary' : 'border-transparent opacity-60'}`}
                        >
                            <img src={src} className="w-full h-full object-cover" alt="" />
                        </button>
                    ))}
                </div>

                {/* Área de recorte */}
                <div
                    className="relative flex-1 bg-black/5 border rounded overflow-hidden flex items-center justify-center select-none"
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    <div className="relative inline-block">
                        <img
                            ref={imageRef}
                            src={sourceImages[selectedImageIndex]}
                            className="max-h-[50vh] w-auto block pointer-events-none"
                            alt=""
                        />

                        {/* Cuadro Negro de Recorte */}
                        <div
                            style={{
                                position: 'absolute',
                                left: crop.x,
                                top: crop.y,
                                width: crop.width,
                                height: crop.height,
                                border: '2px solid black',
                                boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                                cursor: dragMode === 'move' ? 'grabbing' : 'grab'
                            }}
                            onMouseDown={(e) => handleMouseDown(e, 'move')}
                        >
                            {/* Esquina para redimensionar */}
                            <div
                                style={{
                                    position: 'absolute',
                                    right: -5,
                                    bottom: -5,
                                    width: 20,
                                    height: 20,
                                    backgroundColor: 'white',
                                    border: '2px solid black',
                                    cursor: 'nwse-resize',
                                    zIndex: 10
                                }}
                                onMouseDown={(e) => handleMouseDown(e, 'resize')}
                            />

                            {/* Líneas guía opcionales */}
                            <div className="absolute inset-0 opacity-20 pointer-events-none">
                                <div className="absolute top-1/3 w-full h-px bg-white" />
                                <div className="absolute top-2/3 w-full h-px bg-white" />
                                <div className="absolute left-1/3 h-full w-px bg-white" />
                                <div className="absolute left-2/3 h-full w-px bg-white" />
                            </div>
                        </div>
                    </div>
                </div>

                <canvas ref={canvasRef} className="hidden" />

                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleCropAndUpload} disabled={isUploading}>
                        {isUploading ? 'Subiendo...' : <><Crop className="mr-2 h-4 w-4" /> Finalizar Recorte</>}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
