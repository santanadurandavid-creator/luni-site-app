
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TermsAndPrivacyModal } from '@/components/auth/TermsAndPrivacyModal';
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { collection, onSnapshot, addDoc, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { X, Loader2, Link as LinkIcon } from 'lucide-react';
import type { Setting } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { FaqManager } from '@/components/admin/FaqManager';

interface DbItem {
    id: string;
    name: string;
}

const EditableList = ({ collectionName, title, description }: { collectionName: string, title: string, description: string }) => {
    const { toast } = useToast();
    const [items, setItems] = useState<DbItem[]>([]);
    const [newItemName, setNewItemName] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const { db } = getFirebaseServices();
        const unsubscribe = onSnapshot(collection(db, collectionName), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
            setItems(data);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [collectionName]);

    const handleAddItem = async () => {
        if (!newItemName.trim()) {
            toast({ variant: 'destructive', title: "El nombre no puede estar vacío." });
            return;
        }
        try {
            const { db } = getFirebaseServices();
            await addDoc(collection(db, collectionName), { name: newItemName });
            toast({ title: "Elemento añadido", description: `"${newItemName}" ha sido añadido.` });
            setNewItemName('');
        } catch (error) {
            console.error(`Error adding item to ${collectionName}:`, error);
            toast({ variant: 'destructive', title: "Error", description: "No se pudo añadir el elemento." });
        }
    };

    const handleDeleteItem = async (item: DbItem) => {
        if (!window.confirm(`¿Seguro que quieres eliminar "${item.name}"?`)) return;
        try {
            const { db } = getFirebaseServices();
            await deleteDoc(doc(db, collectionName, item.id));
            toast({ title: "Elemento eliminado", description: `"${item.name}" ha sido eliminado.` });
        } catch (error) {
            console.error(`Error deleting item from ${collectionName}:`, error);
            toast({ variant: 'destructive', title: "Error", description: "No se pudo eliminar el elemento." });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                    {isLoading ? (
                        <p>Cargando...</p>
                    ) : (
                        items.map(item => (
                            <Badge key={item.id} variant="secondary" className="text-sm py-1 pl-3 pr-1">
                                {item.name}
                                <button onClick={() => handleDeleteItem(item)} className="ml-2 rounded-full hover:bg-muted-foreground/20 p-0.5">
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))
                    )}
                </div>
                 <div className="flex gap-2 pt-4 border-t">
                   <Input 
                        placeholder={`Nueva ${title.toLowerCase().slice(0, -1)}`} 
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                   />
                   <Button onClick={handleAddItem}>Añadir</Button>
                </div>
            </CardContent>
        </Card>
    );
};


const GeneralSettings = () => {
    const { toast } = useToast();
    const [settings, setSettings] = useState<Setting>({} as Setting);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms');
    
    useEffect(() => {
        const { db } = getFirebaseServices();
        const settingsRef = doc(db, 'settings', 'general');
        const unsubscribe = onSnapshot(settingsRef, (doc) => {
            if(doc.exists()) {
                const data = doc.data() as Setting;
                setSettings(data);
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);
    
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { db } = getFirebaseServices();
            await setDoc(doc(db, 'settings', 'general'), settings, { merge: true });
            toast({
                title: "Configuración Guardada",
                description: "Los cambios han sido guardados.",
            });
        } catch (error) {
            console.error("Error saving settings:", error);
            toast({ variant: 'destructive', title: "Error", description: "No se pudo guardar la configuración." });
        } finally {
            setIsSaving(false);
        }
    }

    if (isLoading) {
        return <Card><CardHeader><CardTitle>Configuración General</CardTitle></CardHeader><CardContent><Loader2 className="h-6 w-6 animate-spin" /></CardContent></Card>
    }

    return (
        <>
        <Card>
            <CardHeader>
                <CardTitle>Configuración General</CardTitle>
                <CardDescription>Define URLs y otros parámetros de la aplicación.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Editar Términos y Condiciones / Políticas de Privacidad</Label>
                    <div className="flex gap-4">
                        <Button onClick={() => { setActiveTab('terms'); setIsModalOpen(true); }}>
                            Términos y Condiciones
                        </Button>
                        <Button onClick={() => { setActiveTab('privacy'); setIsModalOpen(true); }}>
                            Políticas de Privacidad
                        </Button>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar Configuración
                </Button>
            </CardContent>
        </Card>
        <TermsAndPrivacyModal 
            isOpen={isModalOpen} 
            setIsOpen={setIsModalOpen} 
            activeTab={activeTab}
            settings={settings}
            setSettings={setSettings}
        />
        </>
    )

}


export default function AdminSettingsPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Configuración</h1>
                <p className="text-muted-foreground">Ajusta la configuración general de la plataforma.</p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                <GeneralSettings />
                <EditableList
                    collectionName="subjects"
                    title="Materias"
                    description="Gestiona las materias disponibles para el contenido."
                />
            </div>

            <FaqManager />
        </div>
    );
}
