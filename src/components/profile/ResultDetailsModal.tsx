
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
import type { Exam, ExamResult, ExamQuestion, UserAnswer, ContentItem } from '@/lib/types';
import { CheckCircle, XCircle, Lightbulb, BookOpen, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge'; 
import { useEffect, useState } from 'react';
import { getFirebaseServices } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, query, where, limit, updateDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton'; 
import { ScrollArea } from '@/components/ui/scroll-area'; 
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { ResultDetailsModal as ResultDetailsModalContent } from '@/lib/ResultDetailsModal';

interface ResultDetailsModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  result: ExamResult | null;
}

export function ResultDetailsModal({ isOpen, setIsOpen, result }: ResultDetailsModalProps) {
  if (!result) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <ResultDetailsModalContent result={result} setIsOpen={setIsOpen} />
    </Dialog>
  );
}
