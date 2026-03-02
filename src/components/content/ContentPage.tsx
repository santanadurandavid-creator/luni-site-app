
'use client';

import { useState, useMemo, useEffect } from 'react';
import type { ContentItem, ContentCategory } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContentCard } from './ContentCard';
import { ContentModal } from './ContentModal';
import { SearchBar } from './SearchBar';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '../ui/button';
import { PlusCircle, Trash2 } from 'lucide-react';
import { EditContentModal } from '../admin/EditContentModal';
import { useToast } from '@/hooks/use-toast';
import { doc, deleteDoc, updateDoc, increment } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { sortContentItems } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';


interface ContentPageProps {
  items: ContentItem[];
}

const categories: ContentCategory[] = ['Todos', 'Área 1: Ciencias Físico-Matemáticas y de las Ingenierías', 'Área 2: Ciencias Biológicas, Químicas y de la Salud', 'Área 3: Ciencias Sociales', 'Área 4: Humanidades y de las Artes'];

export function ContentPage({ items }: ContentPageProps) {
  const [activeTab, setActiveTab] = useState<ContentCategory>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentItems, setCurrentItems] = useState(items);
  const [itemToDelete, setItemToDelete] = useState<ContentItem | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    setCurrentItems(items);
  }, [items]);

  const filteredItems = useMemo(() => {
    const filtered = currentItems.filter((item) => {
      const matchesCategory = activeTab === 'Todos' || item.category === activeTab;
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || (item.subject && item.subject.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
    return sortContentItems(filtered);
  }, [currentItems, activeTab, searchQuery]);

  const handleEdit = (item: ContentItem) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  }

  const handleCreate = () => {
    setEditingItem(null);
    setIsEditModalOpen(true);
  }

  const handleItemOpen = async (item: ContentItem) => {
    if (!item.id) return;
    setSelectedItem(item);

    // Optimistic update
    const originalItems = currentItems;
    const updatedItems = currentItems.map(i =>
      i.id === item.id ? { ...i, views: (i.views || 0) + 1 } : i
    );
    setCurrentItems(updatedItems);

    try {
      const { db } = getFirebaseServices();
      const contentRef = doc(db, 'content', item.id);
      await updateDoc(contentRef, {
        views: increment(1)
      });
    } catch (error) {
      console.error("Error updating view count: ", error);
      // Revert if error
      setCurrentItems(originalItems);
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete || !itemToDelete.id) return;
    try {
      const { db } = getFirebaseServices();
      await deleteDoc(doc(db, 'content', itemToDelete.id));
      setCurrentItems(prevItems => prevItems.filter(item => item.id !== itemToDelete.id));
      toast({
        title: "Contenido Eliminado",
        description: `El contenido "${itemToDelete.title}" ha sido eliminado.`,
      });
    } catch (error) {
      console.error("Error deleting document: ", error);
      toast({
        variant: 'destructive',
        title: "Error",
        description: "No se pudo eliminar el contenido.",
      });
    } finally {
      setItemToDelete(null);
    }
  };

  const handleDelete = (item: ContentItem) => {
    setItemToDelete(item);
  };

  return (
    <>
      <div className="container mx-auto p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-end items-center mb-6 gap-4">
          <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-4 items-center">
            <SearchBar onSearch={setSearchQuery} className="w-full sm:w-64 md:w-80" />
            {user?.isAdmin && (
              <Button onClick={handleCreate} className="w-full sm:w-auto">
                <PlusCircle />
                Agregar
              </Button>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ContentCategory)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 mb-6 h-auto">
            {categories.map((cat) => (
              <TabsTrigger key={cat} value={cat} className="text-xs md:text-sm break-words whitespace-normal h-auto py-2 px-1 md:px-3">{cat}</TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeTab}>
            {filteredItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredItems.map((item) => (
                  item.id && (
                    <ContentCard
                      key={item.id}
                      item={item}
                      onOpen={handleItemOpen}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  )
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-muted-foreground">No se encontró contenido que coincida con tu búsqueda.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <ContentModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
      <EditContentModal
        isOpen={isEditModalOpen}
        setIsOpen={setIsEditModalOpen}
        item={editingItem}
      />
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de que quieres eliminar?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es permanente y no se puede deshacer. Se eliminará el contenido
              <strong>"{itemToDelete?.title}"</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              <Trash2 className="mr-2 h-4 w-4" />
              Confirmar y Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
