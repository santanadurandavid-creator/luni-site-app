
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ContentItem } from '@/lib/types';
import { PlusCircle, MoreHorizontal, BrainCircuit, GripVertical, ArrowUpDown, Mic, Loader2, Upload, Download, X, Save, HelpCircle, KeyRound, Trash2 } from 'lucide-react';
import { EditContentModal } from '@/components/admin/EditContentModal';
import { AIContentGenerationModal } from '@/components/admin/AIContentGenerationModal';
import { DeletePasswordModal } from '@/components/admin/DeletePasswordModal';
import { AdminSecuritySettingsModal } from '@/components/admin/AdminSecuritySettingsModal';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { collection, onSnapshot, doc, deleteDoc, writeBatch, updateDoc, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, getReactivoNumber, sortContentItems } from '@/lib/utils';
import { ContentCategory } from '@/lib/types';


const ContentTable = ({
    items,
    onEdit,
    onDelete,
    onReorder,
    onRecreate,
    onGenerateAudioClass,
    isLoading,
    isGeneratingAudioId,
    selectedItems,
    onSelectionChange
}: {
    items: ContentItem[],
    onEdit: (item: ContentItem) => void
    onDelete: (item: ContentItem) => void
    onReorder: (items: ContentItem[]) => void
    onRecreate: (item: ContentItem) => void
    onGenerateAudioClass: (item: ContentItem) => void
    isLoading: boolean
    isGeneratingAudioId: string | null
    selectedItems: string[]
    onSelectionChange: (ids: string[]) => void
}) => {
    const [draggedItem, setDraggedItem] = useState<ContentItem | null>(null);
    const [localItems, setLocalItems] = useState<ContentItem[]>(items);

    useEffect(() => {
        setLocalItems(items);
    }, [items]);

    const getAreaLabel = (category: string) => {
        const match = category.match(/Área \d/);
        return match ? match[0] : category;
    };

    const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, item: ContentItem) => {
        setDraggedItem(item);
        e.dataTransfer.effectAllowed = 'move';
        // Set a transparent drag image or custom styling if needed
        // e.dataTransfer.setDragImage(e.currentTarget, 0, 0);
    };

    const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
        e.preventDefault();
        if (!draggedItem) return;

        const draggedIndex = localItems.findIndex(i => i.id === draggedItem.id);
        if (draggedIndex === index) return;

        const newItems = [...localItems];
        const itemToMove = newItems[draggedIndex];
        newItems.splice(draggedIndex, 1);
        newItems.splice(index, 0, itemToMove);

        setLocalItems(newItems);
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
        onReorder(localItems);
    };

    if (isLoading) {
        return (
            <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                        <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                        <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                ))}
            </div>
        )
    }

    if (items.length === 0) {
        return <p className="text-center text-muted-foreground py-8">No hay contenido en esta categoría.</p>
    }

    return (
        <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-muted/50">
                    <tr>
                        <th className="w-10 px-3 py-3">
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                checked={items.length > 0 && selectedItems.length === items.length}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        onSelectionChange(items.map(i => i.id!).filter(Boolean));
                                    } else {
                                        onSelectionChange([]);
                                    }
                                }}
                            />
                        </th>
                        <th className="w-10 px-3 py-3"></th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Título</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Área</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Materia</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Vistas</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Acciones</th>
                    </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                    {localItems.map((item, index) => (
                        <tr
                            key={item.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, item)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragEnd={handleDragEnd}
                            className={cn(
                                "transition-colors hover:bg-muted/50",
                                draggedItem?.id === item.id && "opacity-50 bg-muted",
                                selectedItems.includes(item.id!) && "bg-indigo-50/50"
                            )}
                        >
                            <td className="px-3 py-4 text-center">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                    checked={selectedItems.includes(item.id!)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            onSelectionChange([...selectedItems, item.id!]);
                                        } else {
                                            onSelectionChange(selectedItems.filter(id => id !== item.id));
                                        }
                                    }}
                                />
                            </td>
                            <td className="px-3 py-4 cursor-grab active:cursor-grabbing text-muted-foreground">
                                <GripVertical className="h-4 w-4" />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{item.title}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{getAreaLabel(item.category)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{item.subject}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{item.views?.toLocaleString() || 0}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex items-center justify-end gap-1">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => onEdit(item)}>Editar</DropdownMenuItem>
                                            {item.generationMetadata && (
                                                <DropdownMenuItem onClick={() => onRecreate(item)}>Recrear</DropdownMenuItem>
                                            )}
                                            {item.type === 'content' && (
                                                <DropdownMenuItem
                                                    onClick={() => onGenerateAudioClass(item)}
                                                    disabled={isGeneratingAudioId === item.id}
                                                    className="flex items-center gap-2"
                                                >
                                                    {isGeneratingAudioId === item.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                                    ) : (
                                                        <Mic className="h-4 w-4 text-primary" />
                                                    )}
                                                    <span>{item.interactiveContent?.explanatory.generatedClassText ? 'Regenerar Clase Audio' : 'Generar Clase Audio'}</span>
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem className="text-destructive" onClick={() => onDelete(item)}>Eliminar</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

function AudioClassModal({ isOpen, onClose, item }: { isOpen: boolean, onClose: () => void, item: ContentItem | null }) {
    const [script, setScript] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [audioUrl, setAudioUrl] = useState('');
    const { toast } = useToast();

    useEffect(() => {
        if (item && isOpen) {
            setScript(item.interactiveContent?.explanatory.generatedClassText || '');
            setAudioUrl(item.interactiveContent?.explanatory.audioUrl || '');
        } else if (!isOpen) {
            setScript('');
            setAudioUrl('');
        }
    }, [item, isOpen]);

    const handleGenerateScript = async () => {
        if (!item) return;
        setIsGenerating(true);
        try {
            let blocks = item.interactiveContent?.explanatory.blocks || [];
            if ((!blocks || blocks.length === 0) && item.interactiveContent?.explanatory.blocksJson) {
                try {
                    blocks = JSON.parse(item.interactiveContent.explanatory.blocksJson);
                } catch (e) {
                    console.error("Error parsing blocksJson:", e);
                }
            }

            const response = await fetch('/api/ai/generate-class', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contentBlocks: blocks,
                    title: item.title,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Error al generar la clase');
            }

            const data = await response.json();
            setScript(data.classText);
            toast({ title: "Guion Generado", description: "Puedes editar el texto si lo deseas." });
        } catch (error: any) {
            console.error(error);
            toast({ title: "Error", description: error.message || "No se pudo generar el guion.", variant: 'destructive' });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !item?.id) return;

        setIsUploading(true);
        try {
            const { storage } = getFirebaseServices();
            const storageRef = ref(storage, `audio_classes/${item.id}/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const url = await getDownloadURL(snapshot.ref);
            setAudioUrl(url);
            toast({ title: "Audio subido", description: "El archivo se ha cargado correctamente." });
        } catch (error: any) {
            console.error(error);
            toast({ title: "Error", description: "No se pudo subir el audio.", variant: 'destructive' });
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        if (!item?.id) return;
        setIsSaving(true);
        try {
            const { db } = getFirebaseServices();
            const contentRef = doc(db, 'content', item.id);
            await updateDoc(contentRef, {
                'interactiveContent.explanatory.generatedClassText': script,
                'interactiveContent.explanatory.audioUrl': audioUrl
            });
            toast({ title: "Guardado", description: "La clase de audio ha sido actualizada." });
            onClose();
        } catch (error: any) {
            console.error(error);
            toast({ title: "Error", description: "No se pudo guardar la información.", variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle className="flex items-center gap-2">
                        <Mic className="w-5 h-5 text-primary" />
                        Configurar Clase de Audio
                    </DialogTitle>
                    <DialogDescription>
                        Genera el guion con IA y sube tu propio audio grabado.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label className="font-bold">Guion de la Clase (IA)</Label>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleGenerateScript}
                                disabled={isGenerating}
                                className="h-8 gap-2"
                            >
                                {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <BrainCircuit className="w-3 h-3" />}
                                {script ? 'Regenerar Guion' : 'Generar Guion con IA'}
                            </Button>
                        </div>
                        <Textarea
                            value={script}
                            onChange={(e) => setScript(e.target.value)}
                            placeholder="El guion aparecerá aquí..."
                            className="min-h-[250px] text-sm leading-relaxed"
                        />
                    </div>

                    <div className="space-y-4 pt-4 border-t">
                        <Label className="font-bold">Archivo de Audio (Manual)</Label>
                        <div className="flex flex-col gap-4">
                            {audioUrl ? (
                                <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-primary/10 p-2 rounded-full">
                                            <Mic className="w-4 h-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">Audio Cargado</p>
                                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{audioUrl}</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => setAudioUrl('')} className="text-destructive hover:text-destructive">
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-3 hover:bg-muted/50 transition-colors relative">
                                    <input
                                        type="file"
                                        accept="audio/*"
                                        onChange={handleFileUpload}
                                        disabled={isUploading}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <div className="mx-auto w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                                        {isUploading ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <Upload className="w-6 h-6 text-muted-foreground" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">Pulsa para subir o arrastra un archivo</p>
                                        <p className="text-xs text-muted-foreground">Formatos soportados: MP3, WAV, M4A</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 pt-0">
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={isSaving || !script}>
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Guardar Clase Audio
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}



export default function AdminContentPage() {
    const [modalOpen, setModalOpen] = useState(false);
    const [aiModalOpen, setAiModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
    const [contentItems, setContentItems] = useState<ContentItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGeneratingAudioId, setIsGeneratingAudioId] = useState<string | null>(null);
    const { user } = useAuth();
    const { toast } = useToast();
    const userIsAdminOrSupport = user?.role === 'admin' || user?.role === 'support' || user?.role === 'supervisor_support';
    const [rangeStart, setRangeStart] = useState('');
    const [rangeEnd, setRangeEnd] = useState('');
    const [selectedArea, setSelectedArea] = useState<ContentCategory>('Todos');
    const [isFilterApplied, setIsFilterApplied] = useState(false);

    const [isRecreateModalOpen, setIsRecreateModalOpen] = useState(false);
    const [recreateItem, setRecreateItem] = useState<ContentItem | null>(null);
    const [recreateFeedback, setRecreateFeedback] = useState('');

    const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
    const [audioItem, setAudioItem] = useState<ContentItem | null>(null);
    const [isTutorialModalOpen, setIsTutorialModalOpen] = useState(false);
    const [isVideoHelpModalOpen, setIsVideoHelpModalOpen] = useState(false);

    const [deletePasswordModalOpen, setDeletePasswordModalOpen] = useState(false);
    const [itemPendingDeletion, setItemPendingDeletion] = useState<ContentItem | null>(null);
    const [securityModalOpen, setSecurityModalOpen] = useState(false);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [isSortConfirmModalOpen, setIsSortConfirmModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportConfig, setExportConfig] = useState<{
        area: string;
        subject: string;
        mode: 'all' | 'selected';
        filename: string;
    }>({
        area: 'Todos',
        subject: 'Todas',
        mode: 'all',
        filename: ''
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const { db } = getFirebaseServices();
        const unsubscribe = onSnapshot(collection(db, 'content'), (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ContentItem));
            // Use shared utility for default sort
            setContentItems(sortContentItems(items));
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);



    const handleApplyFilter = () => {
        setIsFilterApplied(true);
    };

    const handleClearFilter = () => {
        setRangeStart('');
        setRangeEnd('');
        setSelectedArea('Todos');
        setIsFilterApplied(false);
    };

    const handleDelete = (item: ContentItem) => {
        setItemPendingDeletion(item);
        setDeletePasswordModalOpen(true);
    };

    const confirmDelete = async () => {
        const { db } = getFirebaseServices();
        try {
            if (itemPendingDeletion) {
                if (!itemPendingDeletion.id) {
                    toast({ title: "Error", description: "Cannot delete item without an ID.", variant: 'destructive' });
                    return;
                }
                await deleteDoc(doc(db, "content", itemPendingDeletion.id));
                toast({
                    title: "Contenido Eliminado",
                    description: `El contenido "${itemPendingDeletion.title}" ha sido eliminado.`
                });
            } else if (selectedItems.length > 0) {
                setIsLoading(true);
                const BATCH_SIZE = 450;

                for (let i = 0; i < selectedItems.length; i += BATCH_SIZE) {
                    const batch = writeBatch(db);
                    const chunk = selectedItems.slice(i, i + BATCH_SIZE);

                    chunk.forEach(id => {
                        batch.delete(doc(db, 'content', id));
                    });
                    await batch.commit();
                }

                toast({
                    title: "Eliminación Masiva Exitosa",
                    description: `Se han eliminado ${selectedItems.length} elementos de contenido.`
                });
                setSelectedItems([]);
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "No se pudo eliminar el contenido.",
                variant: 'destructive'
            });
            console.error("Error deleting content:", error);
        } finally {
            setItemPendingDeletion(null);
            setDeletePasswordModalOpen(false);
            setIsLoading(false);
        }
    };

    const handleBulkDelete = () => {
        setItemPendingDeletion(null);
        setDeletePasswordModalOpen(true);
    };





    const handleEdit = (item: ContentItem) => {
        setSelectedItem(item);
        setModalOpen(true);
    };

    const handleCreate = () => {
        setSelectedItem(null);
        setModalOpen(true);
    };

    const handleReorder = async (reorderedItems: ContentItem[]) => {
        // Optimistically update local state
        setContentItems(prevItems => {
            // We need to merge the reordered items into the full list
            // This logic might be complex if filtering is active, so we might want to disable reorder when filtering
            if (isFilterApplied) return prevItems; // Disable reorder when sorted by filter

            const newItems = [...prevItems];
            reorderedItems.forEach(item => {
                const index = newItems.findIndex(i => i.id === item.id);
                if (index !== -1) newItems[index] = item;
            });
            return newItems;
        });

        // Actual implementation depends on if we want to support global reorder or just view
        // For now, if filter applied, we might want to warn or disable drag in the table
        if (isFilterApplied) {
            toast({ title: "Advertencia", description: "No se puede reordenar mientras el filtro está activo.", variant: "destructive" });
            return;
        }

        try {
            const { db } = getFirebaseServices();

            // Dividir en bloques de 450 para no exceder el límite de 500 de Firestore
            const CHUNK_SIZE = 450;
            for (let i = 0; i < reorderedItems.length; i += CHUNK_SIZE) {
                const batch = writeBatch(db);
                const chunk = reorderedItems.slice(i, i + CHUNK_SIZE);

                chunk.forEach((item, index) => {
                    if (item.id) {
                        const docRef = doc(db, 'content', item.id);
                        batch.update(docRef, { order: i + index });
                    }
                });
                await batch.commit();
            }

            toast({ title: "Orden guardado", description: "Se ha actualizado el orden en la base de datos." });
        } catch (error) {
            console.error("Error updating order:", error);
            toast({
                title: "Error",
                description: "No se pudo guardar el nuevo orden.",
                variant: 'destructive'
            });
        }
    };

    const handleRecreate = (item: ContentItem) => {
        if (!item.id) {
            toast({ title: "Error", description: "No se puede recrear contenido sin ID.", variant: 'destructive' });
            return;
        }
        if (!item.generationMetadata) {
            toast({ title: "Error", description: "Sin metadata de generación.", variant: 'destructive' });
            return;
        }
        setRecreateItem(item);
        setRecreateFeedback('');
        setIsRecreateModalOpen(true);
    };

    const executeRecreate = async () => {
        if (!recreateItem || !recreateItem.id) return;

        try {
            setIsRecreateModalOpen(false);
            toast({ title: "Recreando contenido...", description: "Considerando tu feedback..." });

            const response = await fetch('/api/admin/recreate-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contentId: recreateItem.id,
                    feedback: recreateFeedback
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al recrear contenido');
            }

            toast({
                title: "Contenido Recreado",
                description: `El contenido "${recreateItem.title}" ha sido regenerado considerando tus ajustes.`
            });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "No se pudo recrear el contenido.",
                variant: 'destructive'
            });
            console.error("Error recreating content:", error);
        }
    };

    const handleGenerateAudioClass = (item: ContentItem) => {
        setAudioItem(item);
        setIsAudioModalOpen(true);
    };

    const handleAutoSort = () => {
        setIsSortConfirmModalOpen(true);
    };

    const confirmAutoSort = async () => {
        setIsSortConfirmModalOpen(false);

        const sortedItems = [...contentItems].sort((a, b) => {
            // Primero agrupar por Área/Categoría para mantener el orden lógico por pestañas
            if (a.category !== b.category) {
                return a.category.localeCompare(b.category);
            }

            const numA = getReactivoNumber(a.title);
            const numB = getReactivoNumber(b.title);

            // Si ambos tienen número, ordenar numéricamente
            if (numA !== -1 && numB !== -1) return numA - numB;

            // Si solo A tiene número, va antes
            if (numA !== -1) return -1;

            // Si solo B tiene número, va antes
            if (numB !== -1) return 1;

            // Si ninguno tiene, alfabéticamente
            return a.title.localeCompare(b.title);
        });

        await handleReorder(sortedItems);
        toast({ title: "Ordenamiento Completado", description: "El contenido se ha ordenado por número de reactivo." });
    };

    const executeExport = () => {
        let exportData = contentItems.filter(item =>
            item.type === 'content' || item.type === 'quiz'
        );

        if (exportConfig.mode === 'selected') {
            exportData = exportData.filter(item => item.id && selectedItems.includes(item.id));
        } else {
            if (exportConfig.area !== 'Todos') {
                exportData = exportData.filter(item => item.category === exportConfig.area);
            }
            if (exportConfig.subject !== 'Todas') {
                exportData = exportData.filter(item => item.subject === exportConfig.subject);
            }
        }

        if (exportData.length === 0) {
            toast({
                title: "Sin contenido",
                description: "No hay elementos que coincidan con los filtros seleccionados.",
                variant: 'destructive'
            });
            return;
        }

        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        const dateStr = new Date().toISOString().split('T')[0];
        const defaultName = `luni_export_${exportConfig.mode === 'selected' ? 'seleccionados' : exportConfig.subject.toLowerCase().replace(/\s+/g, '_')}_${dateStr}`;
        const finalFilename = exportConfig.filename.trim()
            ? `${exportConfig.filename.trim().replace(/\s+/g, '_')}.json`
            : `${defaultName}.json`;

        link.download = finalFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({ title: "Exportación completada", description: `Se exportaron ${exportData.length} elementos.` });
        setIsExportModalOpen(false);
    };

    const handleImportContent = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const processDates = (data: any): any => {
            if (!data || typeof data !== 'object') return data;
            if (data.seconds !== undefined && data.nanoseconds !== undefined) {
                return new Timestamp(data.seconds, data.nanoseconds);
            }
            if (Array.isArray(data)) return data.map(processDates);
            const processed: any = {};
            for (const [key, value] of Object.entries(data)) {
                processed[key] = processDates(value);
            }
            return processed;
        };

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target?.result as string;
                const importedItems = JSON.parse(content) as ContentItem[];

                if (!Array.isArray(importedItems)) {
                    throw new Error("El archivo no contiene un formato de lista válido.");
                }

                setIsLoading(true);
                const { db } = getFirebaseServices();
                const BATCH_SIZE = 450;

                for (let i = 0; i < importedItems.length; i += BATCH_SIZE) {
                    const batch = writeBatch(db);
                    const chunk = importedItems.slice(i, i + BATCH_SIZE);

                    chunk.forEach(item => {
                        const docRef = item.id ? doc(db, 'content', item.id) : doc(collection(db, 'content'));
                        const { id, ...data } = item;

                        // Process dates to convert back to Firestore Timestamps if needed
                        const processedData = processDates(data);

                        batch.set(docRef, {
                            ...processedData,
                            updatedAt: serverTimestamp(),
                            importedAt: serverTimestamp()
                        }, { merge: true });
                    });
                    await batch.commit();
                }

                toast({
                    title: "Importación Exitosa",
                    description: `Se han cargado/actualizado ${importedItems.length} elementos de contenido.`
                });
                // Reset input
                event.target.value = '';
            } catch (err: any) {
                console.error("Error importing content:", err);
                toast({
                    title: "Error de Importación",
                    description: err.message || "Asegúrate de que el archivo JSON sea correcto.",
                    variant: 'destructive'
                });
            } finally {
                setIsLoading(false);
            }
        };
        reader.readAsText(file);
    };

    const getFilteredItems = (type: 'content' | 'quiz' | 'video' | 'podcast' | 'class') => {
        let filtered = contentItems.filter(item => item.type === type);

        if (isFilterApplied) {
            // 1. Filtrar por Área
            if (selectedArea !== 'Todos') {
                filtered = filtered.filter(item => item.category === selectedArea);
            }

            // 2. Filtrar por Rango de Reactivos (si existe)
            if (rangeStart || rangeEnd) {
                const start = rangeStart ? parseInt(rangeStart, 10) : 0;
                const end = rangeEnd ? parseInt(rangeEnd, 10) : Infinity;

                filtered = filtered.filter(item => {
                    const num = getReactivoNumber(item.title);
                    return num !== -1 && num >= start && num <= end;
                });
            }

            // 3. Always sort using shared utility when filter is active
            filtered = sortContentItems(filtered);
        }

        return filtered;
    }

    // Input classes for reuse
    const inputClasses = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

    return (
        <>
            <div className="space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold font-headline">Gestión de Contenido</h1>
                        <p className="text-muted-foreground">Administra los recursos de aprendizaje de la plataforma.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => setIsTutorialModalOpen(true)} variant="outline">
                            <HelpCircle className="mr-2 h-4 w-4" />
                            Tutorial
                        </Button>
                        {userIsAdminOrSupport && (
                            <Button onClick={() => setSecurityModalOpen(true)} variant="outline" className="border-amber-200 hover:bg-amber-50 text-amber-700">
                                <KeyRound className="mr-2 h-4 w-4" />
                                Contraseña
                            </Button>
                        )}
                        <Button onClick={handleAutoSort} variant="outline" disabled={isLoading || contentItems.length === 0}>
                            <ArrowUpDown className="mr-2 h-4 w-4" />
                            Ordenar por Reactivo
                        </Button>
                        <Button onClick={() => setAiModalOpen(true)} variant="outline">
                            <BrainCircuit className="mr-2 h-4 w-4" />
                            Crear Contenido con IA
                        </Button>

                        <Button
                            onClick={() => setIsExportModalOpen(true)}
                            variant="outline"
                            className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-200"
                            disabled={isLoading}
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Exportar Contenido
                        </Button>
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            variant="outline"
                            className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-200"
                            disabled={isLoading}
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            Importar Contenido
                        </Button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".json"
                            onChange={handleImportContent}
                        />
                        <Button onClick={handleCreate}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Crear Contenido
                        </Button>
                    </div>
                </div>

                {/* Filter Section */}
                <Card className="bg-muted/30">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-medium">Filtrar Contenido</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-4 items-end">
                        <div className="grid w-full max-w-[200px] items-center gap-1.5">
                            <label htmlFor="areaFilter" className="text-sm font-medium leading-none">Área</label>
                            <Select value={selectedArea} onValueChange={(value) => setSelectedArea(value as ContentCategory)}>
                                <SelectTrigger id="areaFilter">
                                    <SelectValue placeholder="Seleccionar Área" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Todos">Todas las Áreas</SelectItem>
                                    <SelectItem value="Área 1: Ciencias Físico-Matemáticas y de las Ingenierías">Área 1</SelectItem>
                                    <SelectItem value="Área 2: Ciencias Biológicas, Químicas y de la Salud">Área 2</SelectItem>
                                    <SelectItem value="Área 3: Ciencias Sociales">Área 3</SelectItem>
                                    <SelectItem value="Área 4: Humanidades y de las Artes">Área 4</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid w-full max-w-[150px] items-center gap-1.5">
                            <label htmlFor="rangeStart" className="text-sm font-medium leading-none">Del Reactivo</label>
                            <input
                                type="number"
                                id="rangeStart"
                                placeholder="Ej. 1"
                                className={inputClasses}
                                value={rangeStart}
                                onChange={(e) => setRangeStart(e.target.value)}
                            />
                        </div>
                        <div className="grid w-full max-w-[150px] items-center gap-1.5">
                            <label htmlFor="rangeEnd" className="text-sm font-medium leading-none">Al Reactivo</label>
                            <input
                                type="number"
                                id="rangeEnd"
                                placeholder="Ej. 50"
                                className={inputClasses}
                                value={rangeEnd}
                                onChange={(e) => setRangeEnd(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleApplyFilter} disabled={!rangeStart && !rangeEnd && selectedArea === 'Todos'}>
                                Aplicar Filtro
                            </Button>
                            {isFilterApplied && (
                                <Button variant="ghost" onClick={handleClearFilter}>
                                    Limpiar
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {selectedItems.length > 0 && (
                    <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                                <Trash2 className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="font-bold text-red-800">Acción Masiva</p>
                                <p className="text-sm text-red-600">
                                    {selectedItems.length === 1
                                        ? 'Has seleccionado 1 elemento'
                                        : `Has seleccionado ${selectedItems.length} elementos`} para eliminar permanentemente.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedItems([])}
                                className="border-red-200 text-red-700 hover:bg-neutral-50"
                            >
                                <X className="mr-2 h-4 w-4" />
                                Cancelar
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleBulkDelete}
                                className="bg-red-600 hover:bg-red-700 px-6 shadow-md shadow-red-200"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar permanentemente
                            </Button>
                        </div>
                    </div>
                )}

                <Tabs defaultValue="content" className="w-full">
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="content">Lecturas</TabsTrigger>
                        <TabsTrigger value="videos">Videos</TabsTrigger>
                        <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
                        <TabsTrigger value="podcasts">Podcasts</TabsTrigger>
                        <TabsTrigger value="class">Clases</TabsTrigger>
                    </TabsList>
                    <TabsContent value="content">
                        <Card>
                            <CardHeader>
                                <CardTitle>Material de Lectura</CardTitle>
                                <CardDescription>Gestiona todos los artículos. Arrastra para reordenar.</CardDescription>
                            </CardHeader>
                            <CardContent className="max-h-[600px] overflow-y-auto">
                                <ContentTable
                                    items={getFilteredItems('content')}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    onReorder={handleReorder}
                                    onRecreate={handleRecreate}
                                    onGenerateAudioClass={handleGenerateAudioClass}
                                    isLoading={isLoading}
                                    isGeneratingAudioId={isGeneratingAudioId}
                                    selectedItems={selectedItems}
                                    onSelectionChange={setSelectedItems}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="videos">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Videos</CardTitle>
                                        <CardDescription>Gestiona todos los videos. Arrastra para reordenar.</CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setIsVideoHelpModalOpen(true)}
                                            className="flex items-center gap-2"
                                        >
                                            <HelpCircle className="h-4 w-4" />
                                            ¿Cómo generar videos?
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="max-h-[600px] overflow-y-auto">
                                <ContentTable
                                    items={getFilteredItems('video')}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    onReorder={handleReorder}
                                    onRecreate={handleRecreate}
                                    onGenerateAudioClass={handleGenerateAudioClass}
                                    isLoading={isLoading}
                                    isGeneratingAudioId={isGeneratingAudioId}
                                    selectedItems={selectedItems}
                                    onSelectionChange={setSelectedItems}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="quizzes">
                        <Card>
                            <CardHeader>
                                <CardTitle>Quizzes</CardTitle>
                                <CardDescription>Gestiona todos los quizzes. Arrastra para reordenar.</CardDescription>
                            </CardHeader>
                            <CardContent className="max-h-[600px] overflow-y-auto">
                                <ContentTable
                                    items={getFilteredItems('quiz')}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    onReorder={handleReorder}
                                    onRecreate={handleRecreate}
                                    onGenerateAudioClass={handleGenerateAudioClass}
                                    isLoading={isLoading}
                                    isGeneratingAudioId={isGeneratingAudioId}
                                    selectedItems={selectedItems}
                                    onSelectionChange={setSelectedItems}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="podcasts">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Podcasts</CardTitle>
                                        <CardDescription>Gestiona todos los episodios. Arrastra para reordenar.</CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setIsVideoHelpModalOpen(true)}
                                            className="flex items-center gap-2"
                                        >
                                            <HelpCircle className="h-4 w-4" />
                                            ¿Cómo generar podcasts?
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="max-h-[600px] overflow-y-auto">
                                <ContentTable
                                    items={getFilteredItems('podcast')}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    onReorder={handleReorder}
                                    onRecreate={handleRecreate}
                                    onGenerateAudioClass={handleGenerateAudioClass}
                                    isLoading={isLoading}
                                    isGeneratingAudioId={isGeneratingAudioId}
                                    selectedItems={selectedItems}
                                    onSelectionChange={setSelectedItems}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="class">
                        <Card>
                            <CardHeader>
                                <CardTitle>Clases</CardTitle>
                                <CardDescription>Gestiona todas las clases. Arrastra para reordenar.</CardDescription>
                            </CardHeader>
                            <CardContent className="max-h-[600px] overflow-y-auto">
                                <ContentTable
                                    items={getFilteredItems('class')}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    onReorder={handleReorder}
                                    onRecreate={handleRecreate}
                                    onGenerateAudioClass={handleGenerateAudioClass}
                                    isLoading={isLoading}
                                    isGeneratingAudioId={isGeneratingAudioId}
                                    selectedItems={selectedItems}
                                    onSelectionChange={setSelectedItems}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs >
            </div >
            <EditContentModal
                isOpen={modalOpen}
                setIsOpen={setModalOpen}
                item={selectedItem}
            />
            <AIContentGenerationModal
                isOpen={aiModalOpen}
                setIsOpen={setAiModalOpen}
            />

            <AudioClassModal
                isOpen={isAudioModalOpen}
                onClose={() => {
                    setIsAudioModalOpen(false);
                    setAudioItem(null);
                }}
                item={audioItem}
            />

            <Dialog open={isRecreateModalOpen} onOpenChange={setIsRecreateModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Recrear Contenido</DialogTitle>
                        <DialogDescription>
                            ¿Qué te gustaría ajustar en esta nueva versión? La IA usará tus instrucciones para mejorar el contenido.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="feedback" className="font-bold">Tu Feedback (Opcional)</Label>
                            <Textarea
                                id="feedback"
                                placeholder="Ej: Haz la explicación más breve, añade más ejemplos prácticos, el tono debe ser más formal..."
                                value={recreateFeedback}
                                onChange={(e) => setRecreateFeedback(e.target.value)}
                                className="h-32"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRecreateModalOpen(false)}>Cancelar</Button>
                        <Button onClick={executeRecreate}>
                            <BrainCircuit className="w-4 h-4 mr-2" />
                            Regenerar con IA
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isTutorialModalOpen} onOpenChange={setIsTutorialModalOpen}>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-2xl">
                            <HelpCircle className="h-6 w-6 text-primary" />
                            Tutorial de Gestión de Contenido
                        </DialogTitle>
                        <DialogDescription>
                            Aprende a crear, editar, eliminar y organizar el contenido de la plataforma
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Sección 1: Crear Contenido */}
                        <div className="space-y-3">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <PlusCircle className="h-5 w-5 text-green-500" />
                                1. Crear Contenido Nuevo
                            </h3>
                            <div className="pl-7 space-y-2 text-sm">
                                <p><strong>Opción A - Manual:</strong></p>
                                <ol className="list-decimal list-inside space-y-1 pl-4">
                                    <li>Haz clic en el botón <strong>"Crear Contenido"</strong> (botón azul en la esquina superior derecha)</li>
                                    <li>Selecciona el tipo de contenido: Lectura, Video, Quiz o Podcast</li>
                                    <li>Completa los campos requeridos (título, materia, área, etc.)</li>
                                    <li>Sube imágenes o archivos según el tipo de contenido</li>
                                    <li>Haz clic en <strong>"Guardar"</strong></li>
                                </ol>

                                <p className="pt-2"><strong>Opción B - Con IA:</strong></p>
                                <ol className="list-decimal list-inside space-y-1 pl-4">
                                    <li>Haz clic en <strong>"Crear Contenido con IA"</strong></li>
                                    <li>Sube una imagen con la pregunta o tema</li>
                                    <li>La IA generará automáticamente el contenido educativo</li>
                                    <li>Revisa y ajusta el contenido generado</li>
                                    <li>Guarda el contenido</li>
                                </ol>
                            </div>
                        </div>

                        {/* Sección 2: Editar Contenido */}
                        <div className="space-y-3 border-t pt-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <MoreHorizontal className="h-5 w-5 text-blue-500" />
                                2. Editar Contenido Existente
                            </h3>
                            <div className="pl-7 space-y-2 text-sm">
                                <ol className="list-decimal list-inside space-y-1 pl-4">
                                    <li>Navega a la pestaña del tipo de contenido que deseas editar (Lecturas, Videos, Quizzes, Podcasts)</li>
                                    <li>Localiza el contenido en la tabla</li>
                                    <li>Haz clic en el botón de <strong>tres puntos (⋮)</strong> en la columna "Acciones"</li>
                                    <li>Selecciona <strong>"Editar"</strong> del menú desplegable</li>
                                    <li>Modifica los campos que necesites</li>
                                    <li>Haz clic en <strong>"Guardar Cambios"</strong></li>
                                </ol>

                                <p className="pt-2"><strong>Funciones especiales:</strong></p>
                                <ul className="list-disc list-inside space-y-1 pl-4">
                                    <li><strong>Recrear:</strong> Si el contenido fue generado por IA, puedes recrearlo con ajustes</li>
                                    <li><strong>Generar Clase Audio:</strong> Para lecturas, puedes generar una narración en audio automáticamente</li>
                                </ul>
                            </div>
                        </div>

                        {/* Sección 3: Eliminar Contenido */}
                        <div className="space-y-3 border-t pt-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <X className="h-5 w-5 text-red-500" />
                                3. Eliminar Contenido
                            </h3>
                            <div className="pl-7 space-y-2 text-sm">
                                <ol className="list-decimal list-inside space-y-1 pl-4">
                                    <li>Localiza el contenido que deseas eliminar</li>
                                    <li>Haz clic en el botón de <strong>tres puntos (⋮)</strong></li>
                                    <li>Selecciona <strong>"Eliminar"</strong></li>
                                    <li>Confirma la eliminación en el diálogo que aparece</li>
                                </ol>
                                <p className="text-amber-600 font-medium">⚠️ Esta acción es permanente y no se puede deshacer</p>
                            </div>
                        </div>

                        {/* Sección 4: Filtrar Contenido */}
                        <div className="space-y-3 border-t pt-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <ArrowUpDown className="h-5 w-5 text-purple-500" />
                                4. Filtrar y Buscar Contenido
                            </h3>
                            <div className="pl-7 space-y-2 text-sm">
                                <p><strong>Usar el panel de filtros:</strong></p>
                                <ol className="list-decimal list-inside space-y-1 pl-4">
                                    <li>En la sección "Filtrar Contenido" (debajo de los botones principales)</li>
                                    <li>Selecciona el <strong>Área</strong> que deseas filtrar (Área 1, 2, 3, 4 o Todas)</li>
                                    <li>Opcionalmente, ingresa un rango de reactivos:
                                        <ul className="list-disc list-inside pl-6 mt-1">
                                            <li><strong>"Del Reactivo":</strong> número inicial (ej: 1)</li>
                                            <li><strong>"Al Reactivo":</strong> número final (ej: 50)</li>
                                        </ul>
                                    </li>
                                    <li>Haz clic en <strong>"Aplicar Filtro"</strong></li>
                                    <li>Para quitar el filtro, haz clic en <strong>"Limpiar"</strong></li>
                                </ol>
                            </div>
                        </div>

                        {/* Sección 5: Ordenar Contenido */}
                        <div className="space-y-3 border-t pt-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <GripVertical className="h-5 w-5 text-orange-500" />
                                5. Ordenar Contenido
                            </h3>
                            <div className="pl-7 space-y-2 text-sm">
                                <p><strong>Opción A - Ordenamiento Automático:</strong></p>
                                <ol className="list-decimal list-inside space-y-1 pl-4">
                                    <li>Haz clic en <strong>"Ordenar por Reactivo"</strong></li>
                                    <li>Confirma la acción en el diálogo</li>
                                    <li>El sistema ordenará todo el contenido por número de reactivo automáticamente</li>
                                </ol>

                                <p className="pt-2"><strong>Opción B - Ordenamiento Manual (Arrastrar y Soltar):</strong></p>
                                <ol className="list-decimal list-inside space-y-1 pl-4">
                                    <li>Asegúrate de que NO haya filtros aplicados</li>
                                    <li>Haz clic y mantén presionado el ícono de <strong>líneas (≡)</strong> al inicio de cada fila</li>
                                    <li>Arrastra el elemento a la posición deseada</li>
                                    <li>Suelta para guardar el nuevo orden</li>
                                </ol>
                                <p className="text-amber-600 font-medium">⚠️ No puedes reordenar manualmente mientras hay filtros activos</p>
                            </div>
                        </div>

                        {/* Sección 6: Pestañas */}
                        <div className="space-y-3 border-t pt-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Mic className="h-5 w-5 text-indigo-500" />
                                6. Navegar por Tipos de Contenido
                            </h3>
                            <div className="pl-7 space-y-2 text-sm">
                                <p>Usa las pestañas en la parte superior para cambiar entre:</p>
                                <ul className="list-disc list-inside space-y-1 pl-4">
                                    <li><strong>Lecturas:</strong> Material de lectura y contenido interactivo</li>
                                    <li><strong>Videos:</strong> Contenido en video educativo</li>
                                    <li><strong>Quizzes:</strong> Evaluaciones y cuestionarios</li>
                                    <li><strong>Podcasts:</strong> Contenido de audio</li>
                                </ul>
                            </div>
                        </div>

                        {/* Consejos adicionales */}
                        <div className="space-y-3 border-t pt-4 bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <HelpCircle className="h-5 w-5 text-blue-500" />
                                Consejos Útiles
                            </h3>
                            <ul className="list-disc list-inside space-y-2 text-sm pl-4">
                                <li>Los títulos con formato "Reactivo X" se ordenarán automáticamente por número</li>
                                <li>Puedes ver el número de vistas de cada contenido en la columna correspondiente</li>
                                <li>El contenido generado por IA tiene la opción de "Recrear" para mejorarlo</li>
                                <li>Las lecturas pueden convertirse en clases de audio automáticamente</li>
                                <li>Usa filtros para trabajar con áreas o rangos específicos de reactivos</li>
                            </ul>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button onClick={() => setIsTutorialModalOpen(false)}>
                            Entendido
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isVideoHelpModalOpen} onOpenChange={setIsVideoHelpModalOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-2xl">
                            <BrainCircuit className="h-6 w-6 text-primary" />
                            ¿Cómo generar videos y podcasts con IA?
                        </DialogTitle>
                        <DialogDescription>
                            Aprende a crear videos y podcasts educativos de forma automática usando inteligencia artificial
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                <BrainCircuit className="h-5 w-5 text-blue-600" />
                                NotebookLM de Google
                            </h3>
                            <p className="text-sm text-muted-foreground mb-3">
                                NotebookLM es una herramienta de inteligencia artificial de Google que puede generar videos y podcasts educativos automáticamente a partir de tus documentos, notas o contenido.
                            </p>

                            <div className="space-y-2">
                                <h4 className="font-medium text-sm">¿Qué puedes hacer?</h4>
                                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground pl-2">
                                    <li>Subir documentos PDF, textos o notas sobre cualquier tema</li>
                                    <li>Generar resúmenes automáticos con IA</li>
                                    <li>Crear podcasts y videos educativos narrados</li>
                                    <li>Obtener explicaciones claras y concisas de temas complejos</li>
                                    <li>Generar contenido multimedia para tus estudiantes</li>
                                </ul>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-semibold flex items-center gap-2">
                                <HelpCircle className="h-5 w-5 text-green-600" />
                                Pasos para generar videos y podcasts:
                            </h4>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground pl-4">
                                <li>Haz clic en el botón <strong>"Crear Contenido con IA"</strong> abajo</li>
                                <li>Se abrirá NotebookLM de Google en una nueva pestaña</li>
                                <li>Inicia sesión con tu cuenta de Google</li>
                                <li>Sube tu contenido educativo (PDF, texto, notas, etc.)</li>
                                <li>Selecciona la opción de generar video o podcast</li>
                                <li>La IA procesará tu contenido y generará el video o podcast automáticamente</li>
                                <li>Descarga el video o podcast generado</li>
                                <li>Sube el contenido a YouTube, Spotify u otra plataforma</li>
                                <li>Copia el enlace y agrégalo aquí en la sección de Videos o Podcasts</li>
                            </ol>
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                            <p className="text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
                                <span className="text-lg">💡</span>
                                <span>
                                    <strong>Consejo:</strong> NotebookLM funciona mejor con contenido bien estructurado.
                                    Asegúrate de que tus documentos tengan títulos claros, secciones bien definidas y
                                    explicaciones detalladas para obtener los mejores resultados.
                                </span>
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsVideoHelpModalOpen(false)}
                        >
                            Cerrar
                        </Button>
                        <Button
                            onClick={() => {
                                window.open('https://notebooklm.google/', '_blank', 'noopener,noreferrer');
                            }}
                            className="flex items-center gap-2"
                        >
                            <BrainCircuit className="h-4 w-4" />
                            Crear Contenido con IA
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <DeletePasswordModal
                isOpen={deletePasswordModalOpen}
                onOpenChange={setDeletePasswordModalOpen}
                onConfirm={confirmDelete}
                title={itemPendingDeletion ? `¿Eliminar "${itemPendingDeletion.title}"?` : `¿Eliminar ${selectedItems.length} elementos?`}
            />
            <AdminSecuritySettingsModal
                isOpen={securityModalOpen}
                onOpenChange={setSecurityModalOpen}
            />

            <SortConfirmationModal
                isOpen={isSortConfirmModalOpen}
                onOpenChange={setIsSortConfirmModalOpen}
                onConfirm={confirmAutoSort}
            />

            <ExportConfigModal
                isOpen={isExportModalOpen}
                onOpenChange={setIsExportModalOpen}
                config={exportConfig}
                setConfig={setExportConfig}
                onExport={executeExport}
                availableSubjects={Array.from(new Set(contentItems.map(item => item.subject))).filter(Boolean).sort()}
                selectedCount={selectedItems.length}
            />
        </>
    );
}

function ExportConfigModal({
    isOpen,
    onOpenChange,
    config,
    setConfig,
    onExport,
    availableSubjects,
    selectedCount
}: {
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
    config: any,
    setConfig: (config: any) => void,
    onExport: () => void,
    availableSubjects: string[],
    selectedCount: number
}) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md p-0 overflow-hidden border-none bg-background rounded-3xl shadow-2xl">
                <div className="h-1.5 w-full bg-gradient-to-r from-primary/80 via-primary to-primary/90" />

                <div className="p-8 pb-4">
                    <div className="flex flex-col items-center gap-4 text-center mb-6">
                        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/5 ring-1 ring-primary/20 border border-primary/10">
                            <Download className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-bold font-headline text-foreground">
                                Configurar Exportación
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                                Selecciona qué contenido deseas exportar a un archivo JSON.
                            </DialogDescription>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-3">
                            <Label className="text-sm font-bold text-foreground/80 ml-1">Modo de Exportación</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    type="button"
                                    variant={config.mode === 'all' ? 'default' : 'outline'}
                                    onClick={() => setConfig({ ...config, mode: 'all' })}
                                    className={cn(
                                        "h-12 rounded-xl transition-all font-bold",
                                        config.mode === 'all'
                                            ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                                            : "hover:bg-primary/5 border-border text-muted-foreground"
                                    )}
                                >
                                    Todo el Contenido
                                </Button>
                                <Button
                                    type="button"
                                    variant={config.mode === 'selected' ? 'default' : 'outline'}
                                    onClick={() => setConfig({ ...config, mode: 'selected' })}
                                    className={cn(
                                        "h-12 rounded-xl transition-all font-bold",
                                        config.mode === 'selected'
                                            ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                                            : "hover:bg-primary/5 border-border text-muted-foreground"
                                    )}
                                >
                                    Seleccionados ({selectedCount})
                                </Button>
                            </div>
                        </div>

                        {config.mode === 'all' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-foreground/80 ml-1">Filtrar por Área</Label>
                                    <Select
                                        value={config.area}
                                        onValueChange={(val) => setConfig({ ...config, area: val })}
                                    >
                                        <SelectTrigger className="h-12 rounded-xl border-border focus:ring-primary">
                                            <SelectValue placeholder="Seleccionar Área" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Todos">Todas las Áreas</SelectItem>
                                            <SelectItem value="Área 1: Ciencias Físico-Matemáticas y de las Ingenierías">Área 1</SelectItem>
                                            <SelectItem value="Área 2: Ciencias Biológicas, Químicas y de la Salud">Área 2</SelectItem>
                                            <SelectItem value="Área 3: Ciencias Sociales">Área 3</SelectItem>
                                            <SelectItem value="Área 4: Humanidades y de las Artes">Área 4</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-foreground/80 ml-1">Filtrar por Materia</Label>
                                    <Select
                                        value={config.subject}
                                        onValueChange={(val) => setConfig({ ...config, subject: val })}
                                    >
                                        <SelectTrigger className="h-12 rounded-xl border-border focus:ring-primary">
                                            <SelectValue placeholder="Seleccionar Materia" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Todas">Todas las Materias</SelectItem>
                                            {availableSubjects.map((subject) => (
                                                <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2 pt-2 border-t border-slate-100">
                            <Label className="text-sm font-bold text-foreground/80 ml-1">Nombre del Archivo (Opcional)</Label>
                            <Input
                                placeholder="Ej: respaldo_matematicas"
                                value={config.filename}
                                onChange={(e) => setConfig({ ...config, filename: e.target.value })}
                                className="h-12 rounded-xl border-border focus:ring-primary"
                            />
                            <p className="text-[10px] text-muted-foreground ml-1">Se guardará automáticamente como .json</p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-8 pt-4 flex-row gap-3">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="flex-1 h-12 rounded-xl text-muted-foreground hover:bg-muted font-medium"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={onExport}
                        className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                    >
                        <Download className="h-4 w-4" />
                        Exportar JSON
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function SortConfirmationModal({ isOpen, onOpenChange, onConfirm }: { isOpen: boolean, onOpenChange: (open: boolean) => void, onConfirm: () => void }) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md p-0 overflow-hidden border-none bg-white rounded-3xl shadow-2xl">
                <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-500" />

                <div className="p-8 pb-4">
                    <div className="flex flex-col items-center gap-6 text-center">
                        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-100 ring-1 ring-amber-200">
                            <ArrowUpDown className="h-8 w-8 text-amber-600" />
                        </div>

                        <div className="space-y-2">
                            <DialogTitle className="text-2xl font-bold font-headline text-slate-800">
                                Reordenar Todo el Contenido
                            </DialogTitle>
                            <DialogDescription className="text-slate-500 text-base leading-relaxed">
                                ¿Estás seguro de reordenar <span className="font-bold text-slate-700">TODO</span> el contenido por número de reactivo?
                                <br /><br />
                                <span className="text-amber-600 font-medium">Esta acción cambiará el orden para todos los usuarios de la plataforma.</span>
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 pt-2 flex-row gap-3">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="flex-1 h-12 rounded-xl text-slate-500 hover:bg-slate-50 font-medium"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={onConfirm}
                        className="flex-1 h-12 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-lg shadow-amber-200/50"
                    >
                        Sí, Reordenar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
