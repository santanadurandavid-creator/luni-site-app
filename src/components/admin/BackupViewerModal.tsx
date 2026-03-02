
'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    History,
    Download,
    Trash2,
    FileText,
    Video,
    Mic,
    Search,
    RotateCcw,
    RefreshCw,
    Calendar,
    User,
    ArrowRight,
    Loader2,
    Database,
    Zap
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, addDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DeletePasswordModal } from '@/components/admin/DeletePasswordModal';
import { cn } from '@/lib/utils';

interface BackupViewerModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    currentArea?: string;
    onBackupRequest?: () => Promise<void>;
}

export function BackupViewerModal({
    isOpen,
    onOpenChange,
    currentArea = 'Todos',
    onBackupRequest
}: BackupViewerModalProps) {
    const [backups, setBackups] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAreaInner, setSelectedAreaInner] = useState(currentArea);
    const [selectedType, setSelectedType] = useState('Todos');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [isClearingAll, setIsClearingAll] = useState(false);
    const [selectedBackupIds, setSelectedBackupIds] = useState<string[]>([]);
    const [isRestoring, setIsRestoring] = useState(false);
    const { toast } = useToast();

    // Sincronizar con el área actual si cambia externamente
    useEffect(() => {
        setSelectedAreaInner(currentArea);
    }, [currentArea]);

    const handleCreateBackup = async () => {
        if (!onBackupRequest) return;
        setIsBackingUp(true);
        try {
            await onBackupRequest();
        } finally {
            setIsBackingUp(false);
        }
    };

    useEffect(() => {
        if (!isOpen) return;

        const { db } = getFirebaseServices();
        const q = query(
            collection(db, 'content_backups'),
            orderBy('backedUpAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                backedUpAt: doc.data().backedUpAt?.toDate() || new Date()
            }));
            setBackups(items);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [isOpen]);

    const handleRestore = async (backupItems: any[]) => {
        if (backupItems.length === 0) return;

        const confirmMsg = backupItems.length === 1
            ? `¿Estás seguro de que quieres restaurar "${backupItems[0].title}"?`
            : `¿Estás seguro de que quieres restaurar ${backupItems.length} elementos seleccionados?`;

        if (!window.confirm(`${confirmMsg} Esto creará copias en el panel de contenido actual.`)) return;

        setIsRestoring(true);
        try {
            const { db } = getFirebaseServices();
            const BATCH_SIZE = 450;

            for (let i = 0; i < backupItems.length; i += BATCH_SIZE) {
                const batch = writeBatch(db);
                const chunk = backupItems.slice(i, i + BATCH_SIZE);

                chunk.forEach(backup => {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { id, backedUpAt, backedUpBy, backupType, originalId, ...contentData } = backup;
                    const contentRef = doc(collection(db, "content"));
                    batch.set(contentRef, {
                        ...contentData,
                        updatedAt: serverTimestamp(),
                        restoredFrom: id
                    });
                });
                await batch.commit();
            }

            toast({
                title: backupItems.length === 1 ? "Contenido Restaurado" : "Múltiples Elementos Restaurados",
                description: `${backupItems.length} elementos han sido añadidos de nuevo al panel de contenido.`
            });
            setSelectedBackupIds([]);
        } catch (error) {
            console.error("Error restoring backup:", error);
            toast({
                title: "Error",
                description: "No se pudo completar la restauración.",
                variant: 'destructive'
            });
        } finally {
            setIsRestoring(false);
        }
    };

    const handleDeleteBackup = (id: string) => {
        setItemToDelete(id);
        setIsClearingAll(false);
        setIsDeleteModalOpen(true);
    };

    const handleClearAllHistory = () => {
        setIsClearingAll(true);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteBackup = async () => {
        setIsLoading(true);
        try {
            const { db } = getFirebaseServices();

            if (isClearingAll) {
                // Fetch ALL docs from the collection directly to ensure nothing is missed
                const { getDocs, collection: fsCollection } = await import('firebase/firestore');
                const querySnapshot = await getDocs(fsCollection(db, "content_backups"));
                const allDocs = querySnapshot.docs;

                if (allDocs.length === 0) {
                    toast({ description: "El historial ya está vacío." });
                    return;
                }

                // Firestore batch limit is 500 operations
                const BATCH_SIZE = 450;
                let deletedCount = 0;

                for (let i = 0; i < allDocs.length; i += BATCH_SIZE) {
                    const batch = writeBatch(db);
                    const chunk = allDocs.slice(i, i + BATCH_SIZE);
                    chunk.forEach(docSnap => {
                        batch.delete(docSnap.ref);
                        deletedCount++;
                    });
                    await batch.commit();
                }

                toast({
                    title: "Historial Vaciado",
                    description: `Se han eliminado permanentemente ${deletedCount} registros del historial.`
                });
            } else {
                // Single delete
                if (!itemToDelete) return;
                await deleteDoc(doc(db, "content_backups", itemToDelete));
                toast({
                    description: "Registro de respaldo eliminado permanentemente."
                });
            }
        } catch (error) {
            console.error("Error deleting backup(s):", error);
            toast({
                title: "Error",
                description: "No se pudo realizar la eliminación completa. Verifique su conexión.",
                variant: 'destructive'
            });
        } finally {
            setItemToDelete(null);
            setIsClearingAll(false);
            setIsDeleteModalOpen(false);
            setIsLoading(false);
        }
    };

    const filteredBackups = backups.filter(b =>
        (b.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.category?.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (selectedAreaInner === 'Todos' || b.category === selectedAreaInner) &&
        (selectedType === 'Todos' || b.type === selectedType)
    );

    const getBackupTypeBadge = (type: string) => {
        switch (type) {
            case 'manual_delete': return <Badge variant="destructive" className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-100">Eliminado</Badge>;
            case 'area_mass_delete': return <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">Limpieza IA</Badge>;
            case 'snapshot': return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Snapshot</Badge>;
            default: return <Badge variant="secondary">Respaldo</Badge>;
        }
    };

    const getTypeIcon = (type: string) => {
        if (type?.includes('video')) return <Video className="h-5 w-5 text-purple-500" />;
        if (type?.includes('podcast')) return <Mic className="h-5 w-5 text-blue-500" />;
        return <FileText className="h-5 w-5 text-amber-500" />;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 border-none bg-slate-50 shadow-2xl overflow-hidden">
                <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

                <div className="p-6 pb-4 bg-white border-b border-slate-100">
                    <DialogHeader className="flex flex-col gap-4">
                        <div className="flex flex-row items-center justify-between space-y-0">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                                    <History className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <DialogTitle className="text-2xl font-bold font-headline text-slate-800">Historial de Respaldos</DialogTitle>
                                    <DialogDescription className="text-slate-500">
                                        Explora y restaura contenido eliminado o respaldado manualmente.
                                    </DialogDescription>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10 text-slate-400 hover:text-indigo-600 rounded-xl"
                                    onClick={() => {
                                        setIsLoading(true);
                                    }}
                                    title="Refrescar historial"
                                >
                                    <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                                </Button>
                                <div className="relative w-64 text-sm">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        placeholder="Buscar por título..."
                                        className="pl-9 bg-slate-50 border-slate-200 rounded-xl h-10"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    {selectedBackupIds.length > 0 && (
                                        <Button
                                            size="sm"
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 gap-2 shadow-md shadow-indigo-100"
                                            onClick={() => handleRestore(backups.filter(b => selectedBackupIds.includes(b.id)))}
                                            disabled={isRestoring}
                                        >
                                            {isRestoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                                            Restaurar Seleccionados ({selectedBackupIds.length})
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl h-10 gap-2"
                                        onClick={() => handleRestore(filteredBackups)}
                                        disabled={isRestoring || filteredBackups.length === 0}
                                    >
                                        <Database className="h-4 w-4" />
                                        Restaurar Sección
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-50">
                            <Tabs value={selectedType} onValueChange={setSelectedType} className="w-auto">
                                <TabsList className="bg-slate-100/80 p-1 rounded-xl">
                                    <TabsTrigger value="Todos" className="rounded-lg px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">Todos</TabsTrigger>
                                    <TabsTrigger value="content" className="rounded-lg px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">Lectura</TabsTrigger>
                                    <TabsTrigger value="quiz" className="rounded-lg px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">Quizzes</TabsTrigger>
                                    <TabsTrigger value="video" className="rounded-lg px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">Videos</TabsTrigger>
                                    <TabsTrigger value="podcast" className="rounded-lg px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">Podcast</TabsTrigger>
                                    <TabsTrigger value="class" className="rounded-lg px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">Clases</TabsTrigger>
                                </TabsList>
                            </Tabs>

                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Área:</span>
                                <Select value={selectedAreaInner} onValueChange={setSelectedAreaInner}>
                                    <SelectTrigger className="w-[180px] bg-white border-slate-200 rounded-xl h-10 font-medium">
                                        <SelectValue placeholder="Seleccionar Área" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                        <SelectItem value="Todos">Todas las Áreas</SelectItem>
                                        <SelectItem value="Área 1: Ciencias Físico-Matemáticas y de las Ingenierías">Área 1</SelectItem>
                                        <SelectItem value="Área 2: Ciencias Biológicas, Químicas y de la Salud">Área 2</SelectItem>
                                        <SelectItem value="Área 3: Ciencias Sociales">Área 3</SelectItem>
                                        <SelectItem value="Área 4: Humanidades y de las Artes">Área 4</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </DialogHeader>
                </div>

                <div className="flex-1 overflow-y-auto p-6 pt-2">
                    {isLoading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4">
                            <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
                            <p className="text-slate-400 font-medium font-headline">Cargando base de datos de respaldo...</p>
                        </div>
                    ) : filteredBackups.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-10 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                            <Database className="h-16 w-16 text-slate-200 mb-4" />
                            <h3 className="text-xl font-bold text-slate-700 mb-1">No se encontraron respaldos</h3>
                            <p className="text-slate-500 max-w-sm">
                                {searchTerm ? "No hay registros que coincidan con tu búsqueda." : "El historial de respaldos está vacío."}
                            </p>
                            {searchTerm && (
                                <Button variant="ghost" className="mt-4" onClick={() => setSearchTerm('')}>Limpiar búsqueda</Button>
                            )}
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {filteredBackups.map((backup, index) => (
                                <Card key={`${backup.id}-${index}`} className={cn(
                                    "overflow-hidden border-none shadow-sm hover:shadow-md transition-all group bg-white rounded-2xl",
                                    selectedBackupIds.includes(backup.id) && "ring-2 ring-indigo-500 ring-inset bg-indigo-50/10"
                                )}>
                                    <div className="flex items-center p-4 gap-4">
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                className="h-5 w-5 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                checked={selectedBackupIds.includes(backup.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedBackupIds([...selectedBackupIds, backup.id]);
                                                    } else {
                                                        setSelectedBackupIds(selectedBackupIds.filter(id => id !== backup.id));
                                                    }
                                                }}
                                            />
                                        </div>
                                        <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                                            {getTypeIcon(backup.type)}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-bold text-slate-800 truncate">{backup.title}</h4>
                                                {getBackupTypeBadge(backup.backupType)}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    {format(backup.backedUpAt, "d 'de' MMMM, HH:mm", { locale: es })}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <User className="h-3.5 w-3.5" />
                                                    {backup.backedUpBy}
                                                </div>
                                                <Badge variant="secondary" className="bg-slate-100 text-[10px] px-1.5 py-0 h-4">
                                                    {backup.category?.split(':')[0]}
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="rounded-lg h-9 gap-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50"
                                                onClick={() => handleRestore([backup])}
                                            >
                                                <RotateCcw className="h-4 w-4" />
                                                Restaurar
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-9 w-9 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                onClick={() => handleDeleteBackup(backup.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-white border-t border-slate-100 flex justify-between items-center px-6">
                    <div className="flex items-center gap-4">
                        <p className="text-xs text-slate-400">
                            {filteredBackups.length} registros encontrados {selectedAreaInner !== 'Todos' ? `en ${selectedAreaInner.split(':')[0]}` : 'en total'}
                        </p>
                        {backups.length > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleClearAllHistory}
                                className="text-red-400 hover:text-red-600 hover:bg-red-50 h-8 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider gap-2"
                            >
                                <Trash2 className="h-3 w-3" />
                                Vaciar todo el historial
                            </Button>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Zap className="h-3 w-3 text-amber-500" />
                            Los respaldos restaurados aparecerán como borradores en el panel principal.
                        </p>
                        <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl h-10 px-6">
                            Cerrar
                        </Button>
                    </div>
                </div>
            </DialogContent>
            <DeletePasswordModal
                isOpen={isDeleteModalOpen}
                onOpenChange={setIsDeleteModalOpen}
                onConfirm={confirmDeleteBackup}
                title={isClearingAll ? "¿VACIAR TODO EL HISTORIAL?" : "¿Eliminar este respaldo?"}
            />
        </Dialog>
    );
}
