
'use client';

import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import type { ExamResult } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import { MoreVertical, Archive, Trash2, ArchiveRestore } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useState, useMemo } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from '../ui/input';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '../ui/carousel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ResultDetailsModal } from '@/lib/ResultDetailsModal';
import { Dialog } from '../ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';

const getScoreColor = (score: number) => {
  if (score >= 70) return 'text-green-500';
  if (score >= 50) return 'text-yellow-500';
  return 'text-destructive';
};

const ResultCard = ({ result, onCardClick }: { result: ExamResult; onCardClick: (result: ExamResult) => void; }) => {
  const { updateExamResult, deleteExamResult } = useAuth();
  const { t, language } = useLanguage();
  const [deleteInput, setDeleteInput] = useState('');
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return t('invalidDate');
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    if (isNaN(date.getTime())) return t('invalidDate');
    return format(date, "d MMM, yyyy", { locale: language === 'es' ? es : enUS });
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateExamResult(result.resultId!, { isArchived: !result.isArchived });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteExamResult(result.resultId!);
    setIsAlertOpen(false);
  };

  const handleDropdownClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Card className="w-full cursor-pointer hover:border-primary transition-all shadow-sm hover:shadow-md border-0 bg-gradient-to-br from-primary/5 via-card to-primary/10 hover:from-primary/10 hover:via-card/50 hover:to-primary/15 group" onClick={() => onCardClick(result)}>
      <CardContent className="p-4 relative">
        <div className="absolute top-1 right-1" onClick={handleDropdownClick}>
          <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleArchive}>
                  {result.isArchived ? (
                    <ArchiveRestore className="mr-2 h-4 w-4" />
                  ) : (
                    <Archive className="mr-2 h-4 w-4" />
                  )}
                  <span>{result.isArchived ? t('unarchive') : t('archive')}</span>
                </DropdownMenuItem>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem className="text-destructive" onClick={(e) => e.stopPropagation()}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('delete')}
                  </DropdownMenuItem>
                </AlertDialogTrigger>
              </DropdownMenuContent>
            </DropdownMenu>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('areYouSureDelete')}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t('permanentAction')} <b>{t('deleteBelow')}</b> {t('deleteBelow') === 'delete' ? 'abajo' : 'debajo'}.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                    placeholder={t('deleteBelow')}
                />
                <AlertDialogFooter>
                    <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        disabled={deleteInput !== t('deleteBelow')}
                        className="bg-destructive hover:bg-destructive/90"
                    >
                        {t('confirmDelete')}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <div className="flex flex-col items-center text-center space-y-1">
          <p className={cn('text-3xl font-bold font-headline', getScoreColor(result.score))}>
            {result.score}
          </p>
          <p className="font-semibold text-sm font-headline truncate w-full" title={result.examName}>
            {result.examName}
          </p>
          <p className="text-xs text-muted-foreground">
            {result.correctAnswers}/{result.totalQuestions} {t('correctAnswers')}
          </p>
          <p className="text-xs text-muted-foreground pt-1">
            {formatDate(result.completedAt)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};


const ResultsCarousel = ({ results, onCardClick }: { results: ExamResult[], onCardClick: (result: ExamResult) => void }) => {
    const { t } = useLanguage();

    if (!results || results.length === 0) {
        return (
             <div className="text-center text-muted-foreground py-10">
                <p>{t('noResultsInSection')}</p>
             </div>
        )
    }

    return (
        <Carousel
            opts={{
                align: 'start',
                loop: false,
            }}
            className="w-full"
        >
            <CarouselContent className="-ml-2 md:-ml-4">
                {results.map((result, index) => (
                    <CarouselItem key={`${result.resultId}-${index}`} className="pl-2 md:pl-4 basis-[45%] sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
                       <ResultCard result={result} onCardClick={onCardClick} />
                    </CarouselItem>
                ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
        </Carousel>
    );
};


export function RecentResults() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<ExamResult | null>(null);

  const sortedResults = useMemo(() => {
    if (!user || !Array.isArray(user.examResults)) {
        return [];
    }

    const resultsWithDate = user.examResults.map(r => {
        const date = r.completedAt?.seconds ? new Date(r.completedAt.seconds * 1000) : new Date(r.completedAt);
        return { ...r, date };
    });

    return resultsWithDate.sort((a, b) => b.date.getTime() - a.date.getTime());

  }, [user?.examResults]);

  const activeResults = useMemo(() => sortedResults.filter(r => !r.isArchived), [sortedResults]);
  const archivedResults = useMemo(() => sortedResults.filter(r => r.isArchived), [sortedResults]);

  const handleCardClick = (result: ExamResult) => {
    const freshResult = user?.examResults?.find(r => r.resultId === result.resultId);
    setSelectedResult(freshResult || result);
    setIsModalOpen(true);
  }

  if (!user || !sortedResults || sortedResults.length === 0) {
    return (
      <Card className="shadow-sm hover:shadow-md transition-all duration-300 border-0 bg-gradient-to-br from-primary/5 via-card to-primary/10 hover:from-primary/10 hover:via-card/50 hover:to-primary/15 group">
        <CardContent className="pt-6 text-center text-muted-foreground">
          <p>{t('noExamsCompleted')}</p>
          <p className="text-sm">{t('startPracticing')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">{t('active')}</TabsTrigger>
            <TabsTrigger value="archived">{t('archived')}</TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="mt-4">
            <ResultsCarousel results={activeResults} onCardClick={handleCardClick} />
          </TabsContent>
          <TabsContent value="archived" className="mt-4">
            <ResultsCarousel results={archivedResults} onCardClick={handleCardClick} />
          </TabsContent>
        </Tabs>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            {selectedResult && <ResultDetailsModal result={selectedResult} setIsOpen={setIsModalOpen} />}
        </Dialog>
    </>
  );
}
