
'use client';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import type { UpdateInfo } from '@/lib/types';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { DynamicAnnouncementModal } from '@/components/shared/dynamic';
import { BannerAd } from '@/components/ads/AdManager';
import { SearchBar } from '@/components/content/SearchBar';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

function UpdatesLoadingSkeleton() {
  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex justify-end items-center">
        <Skeleton className="h-10 w-48" />
      </div>
      <div className="space-y-6">
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </div>
  )
}

export default function UpdatesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [updates, setUpdates] = useState<UpdateInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUpdate, setSelectedUpdate] = useState<UpdateInfo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  useEffect(() => {
    const fetchUpdates = async () => {
      try {
        const { db } = getFirebaseServices();
        const updatesQuery = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(updatesQuery);
        const updatesData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            date: data.date,
          } as UpdateInfo;
        });
        setUpdates(updatesData);
      } catch (error) {
        console.error("Error fetching updates:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUpdates();
  }, []);

  const filteredUpdates = useMemo(() => {
    return updates.filter(update => {
      const lowercasedQuery = searchQuery.toLowerCase();
      const matchesSearch =
        update.title.toLowerCase().includes(lowercasedQuery) ||
        (update.description ?? '').toLowerCase().includes(lowercasedQuery);

      const matchesDate = selectedDate
        ? isSameDay(new Date(update.date), selectedDate)
        : true;

      return matchesSearch && matchesDate;
    });
  }, [updates, searchQuery, selectedDate]);

  const handleCreate = () => {
    router.push('/admin/announcements');
  }

  if (loading) {
    return <UpdatesLoadingSkeleton />
  }

  return (
    <>
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex justify-end items-center gap-2">
          <div className="flex-grow flex items-center gap-2">
            <SearchBar onSearch={setSearchQuery} className="flex-grow" />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className={cn("flex-shrink-0", selectedDate && "border-primary text-primary")}>
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {selectedDate && (
              <Button variant="ghost" size="icon" onClick={() => setSelectedDate(undefined)} className="flex-shrink-0">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {user?.isAdmin && (
            <Button onClick={handleCreate} className="flex-shrink-0">
              Gestionar Anuncios
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-2 sm:gap-6">
          {filteredUpdates.length > 0 ? filteredUpdates.map((update) => {
            const handleCardClick = () => {
              if (update.contentType === 'url' && update.contentUrl) {
                window.open(update.contentUrl, '_blank', 'noopener,noreferrer');
              } else {
                setSelectedUpdate(update);
              }
            };

            return (
              <div
                key={update.id}
                className="group relative rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 cursor-pointer aspect-[16/10] md:aspect-[3/1] lg:aspect-[16/3] flex items-end border border-white/10 hover:-translate-y-1"
                onClick={handleCardClick}
              >
                <Image
                  src={update.imageUrl || 'https://placehold.co/600x400'}
                  alt={update.title}
                  fill
                  className="z-0 object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 opacity-80 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-20 p-5 md:p-6 w-full transform transition-transform duration-500 group-hover:translate-y-[-4px]">
                  <div className="bg-primary/90 text-white text-[10px] font-black px-2 py-0.5 rounded-full w-fit mb-3 uppercase tracking-widest shadow-lg">Novedad</div>
                  <h2 className="text-white font-black text-lg md:text-xl lg:text-2xl font-headline leading-tight drop-shadow-lg">{update.title}</h2>
                  <p className="text-white/80 mt-2 text-xs md:text-sm line-clamp-2 md:line-clamp-3">{update.description}</p>
                  <div className="flex items-center gap-2 mt-4 text-white/50 text-[10px] md:text-xs">
                    <CalendarIcon className="w-3 h-3" />
                    <span>{update.date}</span>
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground">No se encontraron novedades que coincidan con tu búsqueda.</p>
            </div>
          )}
        </div>
      </div>
      {selectedUpdate && (
        <DynamicAnnouncementModal
          isOpen={!!selectedUpdate}
          setIsOpen={(isOpen) => !isOpen && setSelectedUpdate(null)}
          announcement={selectedUpdate}
        />
      )}
      <BannerAd section="news" />
    </>
  );
}
