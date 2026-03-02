
'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import type { ContentItem } from '@/lib/types';
import { collection, onSnapshot, doc, deleteDoc, query, where } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { ContentCard } from '@/components/content/ContentCard';
import { SearchBar } from '@/components/content/SearchBar';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { PlusCircle, Settings, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DynamicQuizPlayerModal, DynamicEditContentModal, DynamicPremiumContentModal } from '@/components/shared/dynamic';
import { QuizMilestoneModal } from '@/components/profile/QuizMilestoneModal';
import { useIsMobile } from '@/hooks/use-mobile';
import { sortContentItems } from '@/lib/utils';
import { isFuture } from 'date-fns';
import { BannerAd } from '@/components/ads/AdManager';
import { AdPromptModal } from '@/components/ads/AdPromptModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

function ContentLoadingSkeleton() {
  return (
    <div className="container mx-auto p-4 sm:p-6 min-h-[85vh]">
      <div className="flex flex-col sm:flex-row justify-end items-center mb-6 gap-4">
        <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-4 items-center">
          <Skeleton className="h-10 w-full sm:w-64 md:w-80" />
          <div className="hidden sm:block">
            <Skeleton className="h-10 w-28" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-6 mt-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function QuizzesPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ContentItem | null>(null);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isQuizPlayerOpen, setIsQuizPlayerOpen] = useState(false);
  const [showAdPrompt, setShowAdPrompt] = useState(false);
  const [showAdModal, setShowAdModal] = useState(false);
  const [adCountdown, setAdCountdown] = useState(10);
  const [canCloseAd, setCanCloseAd] = useState(false);
  const isMobile = useIsMobile();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { user, handleQuizCompletion, markFreeContentAsViewed, showQuizMilestoneModal, milestoneReward, closeQuizMilestoneModal } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const { db } = getFirebaseServices();
    const contentRef = collection(db, 'content');
    const q = query(contentRef, where('type', '==', 'quiz'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const contentData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ContentItem));
      // Sort items using shared utility (order field + reactive number fallback)
      setItems(sortContentItems(contentData));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching quizzes:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const openQuiz = useCallback(() => {
    setIsQuizPlayerOpen(true);
  }, []);

  // New unified `useEffect` to handle item opening logic
  useEffect(() => {
    if (!selectedItem || !user) return;

    const isPremium = selectedItem.accessLevel === 'premium';
    const isUserPremium = user?.premiumUntil && isFuture(user.premiumUntil.toDate());
    const isSubjectUnlocked = user?.unlockedSubjects?.includes(selectedItem.subject);

    // Check if user has already viewed this free content (to skip ad on subsequent views)
    const hasViewed = user?.viewedFreeContentIds?.includes(selectedItem.id || '');

    // FIRST: Check if user is admin or premium or has subject unlocked (they bypass ads and can access premium content)
    if (user?.isAdmin || isUserPremium || isSubjectUnlocked) {
      openQuiz();
      if (!hasViewed && selectedItem.id) {
        markFreeContentAsViewed(selectedItem.id);
      }
      return;
    }

    // SECOND: Check if content is premium and user is not premium
    if (isPremium) {
      setIsPremiumModalOpen(true);
      return;
    }

    // THIRD: Check if ad should be shown (only for non-premium users)
    if (selectedItem.showAd && !hasViewed) {
      setShowAdPrompt(true);
      return;
    }

    // FOURTH: It's free content and no ad needed - open directly
    openQuiz();
    if (!hasViewed && selectedItem.id) {
      markFreeContentAsViewed(selectedItem.id);
    }
  }, [selectedItem, user, openQuiz, markFreeContentAsViewed]);


  // This useEffect handles opening content from a URL parameter
  useEffect(() => {
    const openItemId = searchParams.get('open');
    if (openItemId && items.length > 0) {
      const itemToOpen = items.find(item => item.id === openItemId);
      if (itemToOpen) {
        setSelectedItem(itemToOpen); // This will trigger the useEffect above
        // Clean the URL to prevent re-opening on close
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('open');
        router.replace(newUrl.pathname + newUrl.search, { scroll: false });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, items, router]);


  const filteredItems = useMemo(() => {
    // 1. Filter by user area first
    const baseItems = items.filter(item => {
      if (user?.isAdmin) {
        return true; // Admin sees everything
      }
      // Normal user sees content for their active area only
      return item.category === user?.examType;
    });

    // 2. Then, filter by search query if it exists
    if (!searchQuery.trim()) {
      return baseItems; // No search query, return the area-filtered list
    }

    return baseItems.filter(item =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subject.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [items, searchQuery, user]);

  const handleEdit = (item: ContentItem) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  const handleCreate = () => {
    setEditingItem(null);
    setIsEditModalOpen(true);
  };

  const handleWatchAd = () => {
    const adUrl = selectedItem?.adUrl;
    if (adUrl) {
      window.open(adUrl, '_blank');
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'No se ha configurado una URL de anuncio para este contenido.' });
      return;
    }
    setShowAdPrompt(false);
    setShowAdModal(true);
    setCanCloseAd(false);
    setAdCountdown(10);

    const interval = setInterval(() => {
      setAdCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanCloseAd(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleCloseAd = () => {
    setShowAdModal(false);
    setCanCloseAd(false);
    setAdCountdown(10);
    // Now open the quiz player modal
    openQuiz();
    const hasViewedFreeContent = user?.viewedFreeContentIds?.includes(selectedItem?.id || '');
    if (!hasViewedFreeContent && selectedItem?.id) {
      markFreeContentAsViewed(selectedItem.id);
    }
  };

  const handleConfirmPurchase = async () => {
    setIsPremiumModalOpen(false);
    toast({ title: "Redirigiendo..." });
    // Add logic to open purchase/premium page
  };

  const confirmDelete = async () => {
    if (!itemToDelete || !itemToDelete.id) return;

    try {
      const { db } = getFirebaseServices();
      await deleteDoc(doc(db, 'content', itemToDelete.id));
      setItems(prevItems => prevItems.filter(item => item.id !== itemToDelete.id));
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
  }

  if (loading) {
    return <ContentLoadingSkeleton />;
  }

  return (
    <>
      <div className="container mx-auto p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-end items-center mb-6 gap-4">
          <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-4 items-center">
            <SearchBar onSearch={setSearchQuery} className="w-full sm:w-64 md:w-80" />
            {user?.isAdmin && (
              <Button onClick={handleCreate} className="w-full sm:w-auto">
                <PlusCircle />
                Agregar Quiz
              </Button>
            )}
          </div>
        </div>

        <div className="mt-6">
          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-6">
              {filteredItems.map((item) => (
                <div key={item.id} className="flex flex-col">
                  <ContentCard
                    item={item}
                    onOpen={setSelectedItem}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    isMobileView={isMobile}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground">No se encontró contenido que coincida con tu búsqueda o área de estudio.</p>
            </div>
          )}
        </div>
      </div>
      <DynamicQuizPlayerModal
        quiz={isQuizPlayerOpen ? selectedItem : null}
        onClose={() => {
          setIsQuizPlayerOpen(false);
          setSelectedItem(null); // Deselect item on close
        }}
        onQuizComplete={(score, totalQuestions) => handleQuizCompletion(score, totalQuestions)}
      />
      <DynamicEditContentModal
        isOpen={isEditModalOpen}
        setIsOpen={setIsEditModalOpen}
        item={editingItem}
        allowedTypes={['quiz']}
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
      <DynamicPremiumContentModal
        isOpen={isPremiumModalOpen}
        setIsOpen={(open) => {
          setIsPremiumModalOpen(open);
          if (!open) setSelectedItem(null); // Deselect item on close
        }}
        onConfirm={handleConfirmPurchase}
      />
      <QuizMilestoneModal
        isOpen={showQuizMilestoneModal}
        onClose={closeQuizMilestoneModal}
        milestoneReward={milestoneReward}
      />
      <AdPromptModal
        isOpen={showAdPrompt}
        onClose={() => {
          setShowAdPrompt(false);
          setSelectedItem(null); // Deselect item on close
        }}
        onWatchAd={handleWatchAd}
      />
      <Dialog open={showAdModal} onOpenChange={(open) => { if (canCloseAd) handleCloseAd(); }}>
        <DialogContent className="max-w-md flex flex-col items-center justify-center p-6 rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-center">Anuncio Abierto</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-lg mb-4">El anuncio se ha abierto en una nueva pestaña</p>
            <p className="text-sm text-gray-500 mb-4">
              Puedes cerrar este mensaje en {adCountdown} segundos.
            </p>
            {canCloseAd && (
              <Button onClick={handleCloseAd} className="mt-4">
                Cerrar y Ver Contenido
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <BannerAd section="quizzes" />
    </>
  );
}



