
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { ContentItem, ContentCategory, ClassDetails, QuizQuestion, InteractiveContent, Professor, ContentBlock } from '@/lib/types';
import { getSpotifyEmbedUrl } from '@/lib/utils';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { getFirebaseServices } from '@/lib/firebase';
import { doc, serverTimestamp, onSnapshot, setDoc, updateDoc, collection, addDoc, query, orderBy } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { Switch } from '../ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon, Star, PlusCircle, Trash2, Image as ImageIcon, Text, ArrowUp, ArrowDown, Video, Mic, BrainCircuit, GripVertical, Plus, X, Heading1, Heading2, AlignLeft, Type, List, Table, Layout, MessageSquare, HelpCircle, Info, Lightbulb, Check, Loader2 } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Textarea } from '../ui/textarea';
import { Slider } from '../ui/slider';

type ContentType = 'video' | 'content' | 'quiz' | 'class' | 'podcast';

interface EditContentModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  item: ContentItem | null;
  allowedTypes?: ContentType[];
}

interface DbItem {
  id: string;
  name: string;
}

const allTypes: { value: ContentType, label: string }[] = [
  { value: 'class', label: 'Clase Grabada' },
  { value: 'video', label: 'Video' },
  { value: 'content', label: 'Lectura' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'podcast', label: 'Podcast' },
];

const categories: ContentCategory[] = ['Todos', 'Área 1: Ciencias Físico-Matemáticas y de las Ingenierías', 'Área 2: Ciencias Biológicas, Químicas y de la Salud', 'Área 3: Ciencias Sociales', 'Área 4: Humanidades y de las Artes'];

const initialInteractiveContentState: InteractiveContent = {
  splashTitle: '',
  splashBackgroundImageUrl: '',
  explanatory: {
    title: '',
    htmlContent: '',
    blocks: []
  },
  linkedQuizId: '',
  linkedVideoId: '',
  linkedPodcastId: '',
};

export function EditContentModal({ isOpen, setIsOpen, item, allowedTypes }: EditContentModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [subjects, setSubjects] = useState<DbItem[]>([]);
  const [type, setType] = useState<ContentType>('class');
  const [category, setCategory] = useState<ContentCategory>('Área 1: Ciencias Físico-Matemáticas y de las Ingenierías');
  const [accessLevel, setAccessLevel] = useState<'free' | 'premium'>('free');
  const [contentUrl, setContentUrl] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [contentSource, setContentSource] = useState<'url' | 'upload' | 'spotify'>('url');
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageSource, setImageSource] = useState<'upload' | 'url' | 'none'>('upload');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [classDetails, setClassDetails] = useState<ClassDetails>({ isLive: false, status: 'scheduled' });
  const [quizDetails, setQuizDetails] = useState<ContentItem['quizDetails']>({ questions: [] });
  const [interactiveContent, setInteractiveContent] = useState<InteractiveContent>(initialInteractiveContentState);

  const [professorImageFile, setProfessorImageFile] = useState<File | null>(null);

  const [showAd, setShowAd] = useState(false);
  const [adUrl, setAdUrl] = useState('');

  const [showBanner, setShowBanner] = useState(false);
  const [bannerType, setBannerType] = useState<'image' | 'script'>('image');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [bannerClickUrl, setBannerClickUrl] = useState('');
  const [bannerScript, setBannerScript] = useState('');
  const [showInLanding, setShowInLanding] = useState(false);
  const [isVisible, setIsVisible] = useState(true); // Control de visibilidad del contenido
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState('');



  // States for linked content dropdowns
  const [allQuizzes, setAllQuizzes] = useState<ContentItem[]>([]);
  const [allVideos, setAllVideos] = useState<ContentItem[]>([]);
  const [allPodcasts, setAllPodcasts] = useState<ContentItem[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [uploadingBlocks, setUploadingBlocks] = useState<Set<number>>(new Set());
  const [uploadingQuestions, setUploadingQuestions] = useState<Set<number>>(new Set());
  const [uploadingOptions, setUploadingOptions] = useState<Set<string>>(new Set());

  useEffect(() => {
    const { db } = getFirebaseServices();
    const q = query(collection(db, 'professors'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Professor));
      setProfessors(data);
    });
    return () => unsubscribe();
  }, []);

  const handleInteractiveContentChange = useCallback(<K extends keyof InteractiveContent>(field: K, value: InteractiveContent[K]) => {
    setInteractiveContent(prev => ({
      ...prev!,
      [field]: value
    }));
  }, []);

  const addBlock = (blockType: ContentBlock['type']) => {
    let initialContent: any = '';
    if (blockType === 'list') initialContent = [];
    if (blockType === 'table') initialContent = { headers: ['Col 1', 'Col 2'], rows: [['', '']] };

    setInteractiveContent(prev => ({
      ...prev,
      explanatory: {
        ...prev.explanatory,
        blocks: [...(prev.explanatory.blocks || []), { type: blockType, content: initialContent }]
      }
    }));
  };

  const removeBlock = (index: number) => {
    setInteractiveContent(prev => ({
      ...prev,
      explanatory: {
        ...prev.explanatory,
        blocks: (prev.explanatory.blocks || []).filter((_, i) => i !== index)
      }
    }));
  };

  const updateBlock = (index: number, content: any) => {
    setInteractiveContent(prev => {
      const newBlocks = [...(prev.explanatory.blocks || [])];
      newBlocks[index] = { ...newBlocks[index], content };
      return {
        ...prev,
        explanatory: {
          ...prev.explanatory,
          blocks: newBlocks
        }
      };
    });
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    setInteractiveContent(prev => {
      const newBlocks = [...(prev.explanatory.blocks || [])];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newBlocks.length) return prev;
      [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
      return {
        ...prev,
        explanatory: {
          ...prev.explanatory,
          blocks: newBlocks
        }
      };
    });
  };

  const handleImageBlockUpload = async (index: number, file: File) => {
    try {
      setUploadingBlocks(prev => new Set(prev).add(index));
      const { storage } = getFirebaseServices();
      const storageRef = ref(storage, `content_blocks/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      updateBlock(index, url);
    } catch (error) {
      console.error("Error uploading block image:", error);
      toast({ title: "Error", description: "No se pudo subir la imagen del bloque.", variant: 'destructive' });
    } finally {
      setUploadingBlocks(prev => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  };

  const handleQuestionImageUpload = async (qIndex: number, file: File) => {
    try {
      setUploadingQuestions(prev => new Set(prev).add(qIndex));
      const { storage } = getFirebaseServices();
      const storageRef = ref(storage, `quiz_questions/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      handleQuestionChange(qIndex, 'imageUrl', url);
    } catch (error) {
      console.error("Error uploading question image:", error);
      toast({ title: "Error", description: "No se pudo subir la imagen de la pregunta.", variant: 'destructive' });
    } finally {
      setUploadingQuestions(prev => {
        const next = new Set(prev);
        next.delete(qIndex);
        return next;
      });
    }
  };

  const handleOptionImageUpload = async (qIndex: number, oIndex: number, file: File) => {
    const key = `${qIndex}_${oIndex}`;
    try {
      setUploadingOptions(prev => new Set(prev).add(key));
      const { storage } = getFirebaseServices();
      const storageRef = ref(storage, `quiz_options/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);

      const newQuestions = [...(quizDetails?.questions || [])];
      newQuestions[qIndex].options[oIndex].imageUrl = url;
      handleQuizDetailChange('questions', newQuestions);
    } catch (error) {
      console.error("Error uploading option image:", error);
      toast({ title: "Error", description: "No se pudo subir la imagen de la opción.", variant: 'destructive' });
    } finally {
      setUploadingOptions(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };


  const { toast } = useToast();

  const selectableTypes = useMemo(() => allowedTypes
    ? allTypes.filter(t => allowedTypes.includes(t.value))
    : allTypes, [allowedTypes]);

  useEffect(() => {
    if (isOpen) {
      const { db } = getFirebaseServices();
      const unsubSubjects = onSnapshot(collection(db, 'subjects'), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
        setSubjects(data);
      });

      const unsubContent = onSnapshot(collection(db, 'content'), (snapshot) => {
        const contentData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ContentItem));
        setAllQuizzes(contentData.filter(c => c.type === 'quiz'));
        setAllVideos(contentData.filter(c => c.type === 'video'));
        setAllPodcasts(contentData.filter(c => c.type === 'podcast'));
      });

      return () => {
        unsubSubjects();
        unsubContent();
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (item) {
      setTitle(item.title || '');
      setSubject(item.subject || '');
      setType(item.type || 'class');
      setCategory(item.category || 'Área 1: Ciencias Físico-Matemáticas y de las Ingenierías');
      setAccessLevel(item.accessLevel || 'free');
      setContentUrl(item.contentUrl || '');
      setAudioFile(null);
      if (item.spotifyUrl) {
        setContentSource('spotify');
        setSpotifyUrl(item.spotifyUrl);
      } else {
        setContentSource('url');
      }
      setImagePreview(item.imageUrl || '');
      setImageFile(null);
      setImageSource(item.imageUrl ? 'url' : (!item.imageUrl && item.id ? 'none' : 'upload'));
      setImageUrlInput(item.imageUrl || '');
      setShowAd(item.showAd || false);
      setAdUrl(item.adUrl || '');
      setShowBanner(item.showBanner || false);
      setBannerType(item.bannerType || 'image');
      setBannerImageUrl(item.bannerImageUrl || '');
      setBannerClickUrl(item.bannerClickUrl || '');
      setBannerScript(item.bannerScript || '');
      setShowInLanding(item.showInLanding || false);
      setIsVisible(item.isVisible !== undefined ? item.isVisible : true); // Por defecto visible
      setPdfUrl(item.pdfUrl || '');
      setPdfFile(null);


      if (item.type === 'class' && item.classDetails) {
        const date = item.classDetails.classDate?.seconds ? new Date(item.classDetails.classDate.seconds * 1000) : new Date();
        setClassDetails({
          ...item.classDetails,
          isLive: item.id ? (item.classDetails.isLive || false) : false,
          classDate: date,
        });
      } else {
        setClassDetails({ isLive: false, classDate: new Date(), status: 'scheduled', approvalStatus: 'approved' });
      }

      if (item.type === 'quiz' && item.quizDetails) {
        setQuizDetails(item.quizDetails);
      } else {
        setQuizDetails({
          questions: [],
          backgroundColor: '#FFFFFF',
          textColor: '#000000',
          backgroundImageUrl: '',
          backgroundImageOpacity: 0.2
        });
      }

      setInteractiveContent({
        splashTitle: item.interactiveContent?.splashTitle || '',
        splashBackgroundImageUrl: item.interactiveContent?.splashBackgroundImageUrl || '',
        explanatory: {
          title: item.interactiveContent?.explanatory?.title || '',
          htmlContent: item.interactiveContent?.explanatory?.htmlContent || '',
          blocks: (item.interactiveContent?.explanatory?.blocks && item.interactiveContent.explanatory.blocks.length > 0)
            ? item.interactiveContent.explanatory.blocks
            : (item.interactiveContent?.explanatory?.blocksJson
              ? (() => {
                try {
                  const p = JSON.parse(item.interactiveContent.explanatory.blocksJson);
                  return Array.isArray(p) ? p : [];
                } catch (e) {
                  console.error("Error parsing blocksJson in EditContentModal:", e);
                  return [];
                }
              })()
              : []),
        },
        linkedQuizId: item.interactiveContent?.linkedQuizId || '',
        linkedVideoId: item.interactiveContent?.linkedVideoId || '',
        linkedPodcastId: item.interactiveContent?.linkedPodcastId || '',
      });

    } else {
      // Reset for new item
      setTitle('');
      setSubject(subjects.length > 0 ? subjects[0].name : '');
      setType(selectableTypes[0]?.value || 'class');
      setCategory('Área 1: Ciencias Físico-Matemáticas y de las Ingenierías');
      setAccessLevel('free');
      setContentUrl('');
      setAudioFile(null);
      setSpotifyUrl('');
      setContentSource('url');
      setImagePreview('https://placehold.co/400x225.png');
      setImageFile(null);
      setImageUrlInput('');
      setShowAd(false);
      setAdUrl('');
      setShowBanner(false);
      setBannerType('image');
      setBannerImageUrl('');
      setBannerClickUrl('');
      setBannerScript('');
      setShowInLanding(false);
      setIsVisible(true); // Por defecto visible
      setPdfUrl('');
      setPdfFile(null);
      setClassDetails({ isLive: false, classDate: new Date(), status: 'scheduled', approvalStatus: 'approved' });
      setQuizDetails({
        questions: [],
        backgroundColor: '#FFFFFF',
        textColor: '#000000',
        backgroundImageUrl: '',
        backgroundImageOpacity: 0.2
      });
      setInteractiveContent(initialInteractiveContentState);
    }
  }, [item, isOpen, selectableTypes, subjects]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title?.trim() || !subject?.trim() || !type || !category) {
      toast({ variant: 'destructive', title: 'Error de Validación', description: 'Título, materia, tipo y área son requeridos.' });
      return;
    }

    setIsSubmitting(true);

    try {
      const { db, storage } = getFirebaseServices();
      let imageUrl = item?.imageUrl || null;

      if (imageSource === 'upload' && imageFile) {
        const storageRef = ref(storage, `content/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(snapshot.ref);
      } else if (imageSource === 'url' && imageUrlInput.trim()) {
        imageUrl = imageUrlInput.trim();
      } else if (imageSource === 'none') {
        imageUrl = null;
      }

      let finalContentUrl = contentUrl;
      if (type === 'podcast' && contentSource === 'upload' && audioFile) {
        const storageRef = ref(storage, `podcasts/${Date.now()}_${audioFile.name}`);
        const snapshot = await uploadBytes(storageRef, audioFile);
        finalContentUrl = await getDownloadURL(snapshot.ref);
      }

      let finalPdfUrl = pdfUrl;
      if (pdfFile) {
        const storageRef = ref(storage, `pdfs/${Date.now()}_${pdfFile.name}`);
        const snapshot = await uploadBytes(storageRef, pdfFile);
        finalPdfUrl = await getDownloadURL(snapshot.ref);
      }

      let professorAvatarUrl = classDetails.professorAvatar || null;
      if (type === 'class' && professorImageFile) {
        const storageRef = ref(storage, `professors/${Date.now()}_${professorImageFile.name}`);
        const snapshot = await uploadBytes(storageRef, professorImageFile);
        professorAvatarUrl = await getDownloadURL(snapshot.ref);
      }

      // Image is no longer required - allow null for minimalist icon display


      const contentData: Partial<ContentItem> = {
        title,
        subject,
        type,
        contentUrl: finalContentUrl || '',
        imageUrl,
        category: category,
        accessLevel: accessLevel,
        showAd,
        adUrl,
        showBanner,
        bannerType,
        bannerImageUrl,
        bannerClickUrl,
        bannerScript,
        showInLanding,
        isVisible,
        views: item?.views || 0,
        pdfUrl: finalPdfUrl || null,
        spotifyUrl: contentSource === 'spotify' ? (spotifyUrl || null) : null,
      };

      if (type === 'quiz') {
        contentData.quizDetails = quizDetails;
      }

      if (type === 'class') {
        contentData.classDetails = {
          ...classDetails,
          // Forzar isLive a false para clases nuevas (sin ID)
          isLive: item?.id ? classDetails.isLive : false,
          approvalStatus: 'approved',
          professorAvatar: professorAvatarUrl || undefined
        };
      }

      if (type === 'content') {
        const explanatory = { ...interactiveContent.explanatory };

        // Strategy: Convert blocks to blocksJson for Firestore compatibility (nested arrays)
        // If blocks is populated (either edited or loaded from blocksJson), sync it to blocksJson
        if (explanatory.blocks) {
          (explanatory as any).blocksJson = JSON.stringify(explanatory.blocks);
          explanatory.blocks = []; // Always clear blocks array to avoid Firestore nested array error
        }

        contentData.interactiveContent = {
          ...interactiveContent,
          explanatory
        };
      }

      // Sanitización para evitar valores undefined que Firestore no permite
      const sanitizeData = (obj: any): any => {
        const sanitized = { ...obj };
        Object.keys(sanitized).forEach(key => {
          if (sanitized[key] === undefined) {
            delete sanitized[key];
          } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null && !(sanitized[key] instanceof Date)) {
            sanitized[key] = sanitizeData(sanitized[key]);
          }
        });
        return sanitized;
      };

      const finalData = sanitizeData(contentData);

      if (item && item.id) {
        const itemRef = doc(db, 'content', item.id);
        await updateDoc(itemRef, finalData);
        toast({
          title: 'Contenido Actualizado',
          description: `El contenido "${title}" ha sido guardado exitosamente.`,
        });
      } else {
        await addDoc(collection(db, 'content'), {
          ...finalData,
          createdAt: serverTimestamp(),
        });
        toast({
          title: 'Contenido Creado',
          description: `El contenido "${title}" ha sido creado exitosamente.`,
        });
      }

      setIsOpen(false);
    } catch (error) {
      console.error("Error saving content: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el contenido.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleProfessorImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProfessorImageFile(e.target.files[0]);
    }
  };

  const handleClassDetailChange = (field: keyof ClassDetails, value: any) => {
    setClassDetails(prev => ({ ...prev, [field]: value }));
  }

  const handleDateChange = (date?: Date) => {
    if (!date) return;
    const current = classDetails.classDate ? new Date(classDetails.classDate) : new Date();
    current.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    handleClassDetailChange('classDate', current);
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [hours, minutes] = e.target.value.split(':');
    const current = classDetails.classDate ? new Date(classDetails.classDate) : new Date();
    current.setHours(parseInt(hours), parseInt(minutes));
    handleClassDetailChange('classDate', current);
  }

  const handleQuizDetailChange = (field: keyof NonNullable<ContentItem['quizDetails']>, value: any) => {
    setQuizDetails(prev => ({ ...prev!, [field]: value }));
  };

  const handleQuestionChange = (qIndex: number, field: keyof QuizQuestion, value: any) => {
    const newQuestions = [...(quizDetails?.questions || [])];
    (newQuestions[qIndex] as any)[field] = value;
    handleQuizDetailChange('questions', newQuestions);
  };

  const handleOptionChange = (qIndex: number, oIndex: number, value: string) => {
    const newQuestions = [...(quizDetails?.questions || [])];
    newQuestions[qIndex].options[oIndex].text = value;
    handleQuizDetailChange('questions', newQuestions);
  };

  const handleCorrectAnswerChange = (qIndex: number, oIndex: number) => {
    const newQuestions = [...(quizDetails?.questions || [])];
    newQuestions[qIndex].options.forEach((opt, index) => {
      opt.isCorrect = index === oIndex;
    });
    handleQuizDetailChange('questions', newQuestions);
  };

  const addQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: uuidv4(),
      question: '',
      options: [
        { id: uuidv4(), text: '', isCorrect: true },
        { id: uuidv4(), text: '', isCorrect: false }
      ]
    };

    setQuizDetails(prev => ({
      ...prev,
      questions: [...(prev?.questions || []), newQuestion]
    }));
  };

  const removeQuestion = (qIndex: number) => {
    const newQuestions = (quizDetails?.questions || []).filter((_, index) => index !== qIndex);
    handleQuizDetailChange('questions', newQuestions);
  };

  const addOption = (qIndex: number) => {
    if (!quizDetails?.questions || quizDetails.questions[qIndex].options.length >= 4) return;
    const newQuestions = [...quizDetails.questions];
    newQuestions[qIndex].options.push({ id: uuidv4(), text: 'Nueva Opción', isCorrect: false });
    handleQuizDetailChange('questions', newQuestions);
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    if (!quizDetails?.questions || quizDetails.questions[qIndex].options.length <= 2) return;
    const newQuestions = [...quizDetails.questions];
    const removedOptionWasCorrect = newQuestions[qIndex].options[oIndex].isCorrect;
    newQuestions[qIndex].options = newQuestions[qIndex].options.filter((_, index) => index !== oIndex);
    if (removedOptionWasCorrect && newQuestions[qIndex].options.length > 0) {
      newQuestions[qIndex].options[0].isCorrect = true;
    }
    handleQuizDetailChange('questions', newQuestions);
  };


  const timeValue = classDetails.classDate ? format(new Date(classDetails.classDate), 'HH:mm') : '';
  const opacityValue = (quizDetails?.backgroundImageOpacity ?? 0.5) * 100;

  const urlLabel = useMemo(() => {
    switch (type) {
      case 'class':
        return 'URL del Stream (Whereby / YouTube)';
      case 'video':
        return 'URL del Video (YouTube Embed)';
      case 'podcast':
        return 'URL del archivo de Audio';
      default:
        return 'URL del Contenido';
    }
  }, [type]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-[95vw] max-w-4xl rounded-lg p-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>{item ? 'Editar Contenido' : 'Crear Contenido'}</DialogTitle>
          <DialogDescription>
            Rellena los detalles del contenido.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto">
          <form id="edit-content-form" onSubmit={handleSubmit} className="space-y-6 px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input id="title" value={title || ''} onChange={(e) => setTitle(e.target.value)} placeholder="Título del contenido" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contentUrl">{urlLabel}</Label>
                  {type === 'podcast' ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={contentSource === 'url' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setContentSource('url')}
                        >
                          URL Externa
                        </Button>
                        <Button
                          type="button"
                          variant={contentSource === 'upload' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setContentSource('upload')}
                        >
                          Subir Audio
                        </Button>
                        <Button
                          type="button"
                          variant={contentSource === 'spotify' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setContentSource('spotify')}
                        >
                          Spotify
                        </Button>
                      </div>

                      {contentSource === 'url' ? (
                        <Input id="contentUrl" value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} placeholder="https://..." />
                      ) : contentSource === 'spotify' ? (
                        <div className="space-y-4">
                          <Input id="spotifyUrl" value={spotifyUrl} onChange={(e) => setSpotifyUrl(e.target.value)} placeholder="https://open.spotify.com/episode/..." />
                          {spotifyUrl && getSpotifyEmbedUrl(spotifyUrl) && (
                            <div className="mt-2">
                              <p className="text-xs font-semibold mb-2">Vista Previa:</p>
                              <iframe
                                style={{ borderRadius: '12px' }}
                                src={getSpotifyEmbedUrl(spotifyUrl) || ''}
                                width="100%"
                                height="152"
                                frameBorder="0"
                                allowFullScreen={true}
                                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                loading="lazy"
                              />
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">Pega la URL del capítulo de Spotify. Ejemplo: https://open.spotify.com/episode/...</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Input
                            id="audioFile"
                            type="file"
                            accept="audio/*"
                            onChange={(e) => {
                              if (e.target.files?.[0]) setAudioFile(e.target.files[0]);
                            }}
                          />
                          {contentSource === 'upload' && !audioFile && contentUrl && (
                            <p className="text-xs text-muted-foreground break-all">Audio actual: {contentUrl}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Input id="contentUrl" value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} placeholder="https://..." />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Imagen de Portada</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={imageSource === 'upload' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setImageSource('upload')}
                    >
                      Subir Archivo
                    </Button>
                    <Button
                      type="button"
                      variant={imageSource === 'url' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setImageSource('url')}
                    >
                      URL
                    </Button>
                    <Button
                      type="button"
                      variant={imageSource === 'none' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setImageSource('none');
                        setImagePreview(null);
                        setImageFile(null);
                        setImageUrlInput('');
                      }}
                    >
                      Sin Imagen
                    </Button>
                  </div>
                  {imageSource === 'none' ? (
                    <div className="p-4 bg-muted rounded-md text-center text-sm text-muted-foreground">
                      Se mostrará un icono minimalista con fondo degradado según el tipo de contenido
                    </div>
                  ) : (
                    <>
                      {imagePreview && (
                        <div className="aspect-video relative rounded-md overflow-hidden border">
                          <Image src={imagePreview} alt="Vista previa" fill style={{ objectFit: 'cover' }} />
                        </div>
                      )}
                      {imageSource === 'upload' ? (
                        <Input id="image" type="file" onChange={handleImageChange} accept="image/*" />
                      ) : (
                        <Input
                          id="imageUrl"
                          value={imageUrlInput}
                          onChange={(e) => setImageUrlInput(e.target.value)}
                          placeholder="https://..."
                        />
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Materia</Label>
                  <Select value={subject || ''} onValueChange={setSubject}>
                    <SelectTrigger><SelectValue placeholder="Selecciona una materia" /></SelectTrigger>
                    <SelectContent>
                      {subjects.map(sub => (
                        <SelectItem key={sub.id} value={sub.name}>{sub.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo</Label>
                  <Select value={type} onValueChange={(v) => setType(v as any)} disabled={selectableTypes.length === 1}>
                    <SelectTrigger><SelectValue placeholder="Selecciona un tipo" /></SelectTrigger>
                    <SelectContent>
                      {selectableTypes.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Área</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as ContentCategory)}>
                    <SelectTrigger><SelectValue placeholder="Selecciona un área" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat} className="break-words whitespace-normal">{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 pt-4">
                  <Label>Nivel de Acceso</Label>
                  <div className="flex items-center space-x-2 rounded-lg border p-2">
                    <Switch id="accessLevel" checked={accessLevel === 'premium'} onCheckedChange={(checked) => setAccessLevel(checked ? 'premium' : 'free')} />
                    <Label htmlFor="accessLevel" className="flex items-center gap-2">
                      <Star className={cn("h-4 w-4", accessLevel === 'premium' ? 'text-amber-500' : 'text-muted-foreground')} />
                      {accessLevel === 'premium' ? 'Contenido Premium' : 'Contenido Gratuito'}
                    </Label>
                  </div>
                </div>
                <div className="space-y-2 pt-4">
                  <Label>Mostrar Anuncio</Label>
                  <div className="flex items-center space-x-2 rounded-lg border p-2">
                    <Switch id="showAd" checked={showAd} onCheckedChange={setShowAd} />
                    <Label htmlFor="showAd" className="flex items-center gap-2">
                      {showAd ? 'Mostrar Anuncio Directo' : 'No Mostrar Anuncio'}
                    </Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adUrl">URL del Anuncio</Label>
                    <Input id="adUrl" value={adUrl} onChange={(e) => setAdUrl(e.target.value)} placeholder="https://..." />
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <Label>Mostrar en Landing Page</Label>
                  <div className="flex items-center space-x-2 rounded-lg border p-2">
                    <Switch id="showInLanding" checked={showInLanding} onCheckedChange={setShowInLanding} />
                    <Label htmlFor="showInLanding" className="flex items-center gap-2">
                      {showInLanding ? 'Visible en Landing' : 'No Visible en Landing'}
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Marca este contenido para mostrarlo en la página de inicio pública (hasta 3 por tipo)
                  </p>
                </div>

                <div className="space-y-2 pt-4">
                  <Label>Visibilidad del Contenido</Label>
                  <div className="flex items-center space-x-2 rounded-lg border p-2">
                    <Switch id="isVisible" checked={isVisible} onCheckedChange={setIsVisible} />
                    <Label htmlFor="isVisible" className="flex items-center gap-2">
                      {isVisible ? '👁️ Visible para Usuarios' : '🔒 Oculto (Solo Admins)'}
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Si está oculto, solo los administradores podrán ver este contenido
                  </p>
                </div>

                <div className="space-y-2 pt-4 border-t mt-4">
                  <Label className="text-base font-semibold">Documento PDF (Opcional)</Label>
                  <p className="text-xs text-muted-foreground">Sube un archivo PDF que los usuarios podrán ver dentro del modal de contenido.</p>

                  <div className="space-y-3 mt-2">
                    <div className="flex gap-2">
                      <Input
                        id="pdf"
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => {
                          if (e.target.files?.[0]) setPdfFile(e.target.files[0]);
                        }}
                        className="flex-1"
                      />
                      {pdfUrl && !pdfFile && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive h-10"
                          onClick={() => setPdfUrl('')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {pdfUrl && !pdfFile && (
                      <p className="text-xs text-muted-foreground break-all">
                        PDF actual: <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{pdfUrl}</a>
                      </p>
                    )}
                    {pdfFile && (
                      <p className="text-xs text-amber-600 font-medium">
                        Nuevo archivo seleccionado: {pdfFile.name} (se subirá al guardar)
                      </p>
                    )}
                    <div className="space-y-1">
                      <Label htmlFor="pdfUrlInput" className="text-[10px] uppercase">O URL directa de PDF</Label>
                      <Input
                        id="pdfUrlInput"
                        value={pdfUrl}
                        onChange={(e) => setPdfUrl(e.target.value)}
                        placeholder="https://ejemplo.com/archivo.pdf"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t mt-4">
                  <Label className="text-base font-semibold">Banner del Modal</Label>
                  <p className="text-xs text-muted-foreground">Configura el banner que aparecerá al final del modal de este contenido (solo usuarios no premium)</p>

                  <div className="flex items-center space-x-2 rounded-lg border p-2 mt-2">
                    <Switch id="showBanner" checked={showBanner} onCheckedChange={setShowBanner} />
                    <Label htmlFor="showBanner" className="flex items-center gap-2">
                      {showBanner ? 'Mostrar Banner en Modal' : 'No Mostrar Banner'}
                    </Label>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Tipo de Banner</Label>
                      <RadioGroup value={bannerType} onValueChange={(v) => setBannerType(v as 'image' | 'script')} className="flex gap-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="image" id="banner-image" />
                          <Label htmlFor="banner-image">Imagen (URL)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="script" id="banner-script" />
                          <Label htmlFor="banner-script">Script HTML</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {bannerType === 'image' ? (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="bannerImageUrl">URL de la Imagen del Banner</Label>
                          <Input
                            id="bannerImageUrl"
                            value={bannerImageUrl}
                            onChange={(e) => setBannerImageUrl(e.target.value)}
                            placeholder="https://ejemplo.com/banner.jpg"
                          />
                          <p className="text-xs text-muted-foreground">
                            URL de la imagen que se mostrará como banner.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bannerClickUrl">URL de Destino (al hacer clic)</Label>
                          <Input
                            id="bannerClickUrl"
                            value={bannerClickUrl}
                            onChange={(e) => setBannerClickUrl(e.target.value)}
                            placeholder="https://ejemplo.com/destino"
                          />
                          <p className="text-xs text-muted-foreground">
                            URL que se abrirá cuando el usuario haga clic en el banner.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="bannerScript">Script HTML del Banner</Label>
                        <Textarea
                          id="bannerScript"
                          value={bannerScript}
                          onChange={(e) => setBannerScript(e.target.value)}
                          placeholder="<script>...</script> o <iframe>...</iframe>"
                          rows={5}
                          className="font-mono text-xs"
                        />
                        <p className="text-xs text-muted-foreground">
                          Pega aquí el código HTML/JS del banner (AdSense, etc).
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {type === 'content' && (
              <div className="space-y-6 pt-6 border-t">
                <h3 className="font-semibold text-lg">Contenido Interactivo</h3>

                <Accordion type="single" collapsible defaultValue="item-1">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>Editor de Contenido Explicativo</AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Título de la Portada (Splash)</Label>
                        <Input
                          placeholder="Título que aparece al abrir"
                          value={interactiveContent.splashTitle || ''}
                          onChange={(e) => handleInteractiveContentChange('splashTitle', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Título Explicativo</Label>
                        <Input
                          placeholder="Título para la sección de lectura"
                          value={interactiveContent.explanatory?.title || ''}
                          onChange={(e) => setInteractiveContent(prev => ({
                            ...prev,
                            explanatory: { ...prev.explanatory, title: e.target.value }
                          }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Código HTML</Label>
                        <Textarea
                          value={interactiveContent.explanatory?.htmlContent || ''}
                          onChange={(e) => setInteractiveContent(prev => ({
                            ...prev,
                            explanatory: { ...prev.explanatory, htmlContent: e.target.value }
                          }))}
                          placeholder="<div>...contenido HTML con CSS embebido...</div>"
                          rows={20}
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                          Edita el código HTML directamente. Incluye etiquetas &lt;style&gt; para CSS personalizado.
                        </p>
                      </div>

                      <div className="space-y-4 pt-4 border-t">
                        <div className="flex items-center justify-between">
                          <Label className="text-base font-semibold">Bloques de Contenido</Label>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" size="sm" variant="outline" className="gap-2">
                                <Plus className="w-4 h-4" /> Agregar Bloque
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 max-h-64 overflow-y-auto">
                              <DropdownMenuItem onClick={() => addBlock('title')}><Heading1 className="w-4 h-4 mr-2" /> Título</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => addBlock('subTitle')}><Heading2 className="w-4 h-4 mr-2" /> Subtítulo</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => addBlock('paragraph')}><Type className="w-4 h-4 mr-2" /> Párrafo</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => addBlock('image')}><ImageIcon className="w-4 h-4 mr-2" /> Imagen (URL)</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => addBlock('list')}><List className="w-4 h-4 mr-2" /> Lista</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => addBlock('table')}><Table className="w-4 h-4 mr-2" /> Tabla</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => addBlock('tip')}><Lightbulb className="w-4 h-4 mr-2" /> Tip / Consejo</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => addBlock('highlight')}><Star className="w-4 h-4 mr-2" /> Destacado</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => addBlock('info')}><Info className="w-4 h-4 mr-2" /> Información</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => addBlock('example')}><Layout className="w-4 h-4 mr-2" /> Ejemplo</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => addBlock('question')}><MessageSquare className="w-4 h-4 mr-2" /> Pregunta</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => addBlock('summary')}><AlignLeft className="w-4 h-4 mr-2" /> Resumen</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => addBlock('step')}><Layout className="w-4 h-4 mr-2" /> Paso a Paso</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => addBlock('divider')}><Layout className="w-4 h-4 mr-2" /> Divisor</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="space-y-4">
                          {(interactiveContent.explanatory?.blocks || []).length === 0 && (
                            <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/30">
                              <Layout className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                              <p className="text-sm text-muted-foreground">No hay bloques de contenido. Agrega uno arriba.</p>
                            </div>
                          )}

                          {(interactiveContent.explanatory?.blocks || []).map((block, index) => (
                            <Card key={index} className="relative overflow-hidden group border-muted shadow-sm hover:shadow-md transition-shadow">
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/40" />
                              <CardHeader className="p-3 pb-0 flex flex-row items-center gap-2 space-y-0 bg-muted/10">
                                <div className="text-muted-foreground/50">
                                  <GripVertical className="w-4 h-4" />
                                </div>
                                <Badge variant="outline" className="text-[10px] uppercase font-bold px-1.5 py-0 bg-white shadow-none">
                                  {block.type}
                                </Badge>
                                <div className="flex-grow" />
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveBlock(index, 'up')} disabled={index === 0}>
                                    <ArrowUp className="w-4 h-4" />
                                  </Button>
                                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveBlock(index, 'down')} disabled={index === (interactiveContent.explanatory?.blocks?.length || 0) - 1}>
                                    <ArrowDown className="w-4 h-4" />
                                  </Button>
                                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeBlock(index)}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </CardHeader>
                              <CardContent className="p-3 pt-2">
                                {block.type === 'list' ? (
                                  <div className="space-y-2">
                                    {(block.content as string[]).map((ln, i) => (
                                      <div key={i} className="flex gap-2">
                                        <Input
                                          value={ln}
                                          onChange={(e) => {
                                            const newContent = [...(block.content as string[])];
                                            newContent[i] = e.target.value;
                                            updateBlock(index, newContent);
                                          }}
                                          placeholder={`Elemento ${i + 1}`}
                                          className="text-sm h-8"
                                        />
                                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => {
                                          const newContent = (block.content as string[]).filter((_, idx) => idx !== i);
                                          updateBlock(index, newContent);
                                        }}>
                                          <X className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    ))}
                                    <Button type="button" size="sm" variant="ghost" className="w-full h-8 text-xs border-dashed border-2 mt-1" onClick={() => {
                                      updateBlock(index, [...(block.content as string[]), '']);
                                    }}>
                                      <Plus className="w-3 h-3 mr-1" /> Agregar Item
                                    </Button>
                                  </div>
                                ) : block.type === 'table' ? (
                                  <div className="space-y-3 overflow-x-auto pb-2">
                                    <div className="flex gap-2 mb-2">
                                      {(block.content as any).headers.map((h: string, i: number) => (
                                        <div key={i} className="flex-1 min-w-[100px] flex gap-1">
                                          <Input
                                            value={h}
                                            onChange={(e) => {
                                              const newTable = { ...(block.content as any) };
                                              newTable.headers[i] = e.target.value;
                                              updateBlock(index, newTable);
                                            }}
                                            className="text-xs h-7 font-bold bg-muted/50"
                                          />
                                          <Button type="button" size="icon" variant="ghost" className="h-7 w-5 p-0" onClick={() => {
                                            const newTable = { ...(block.content as any) };
                                            newTable.headers = newTable.headers.filter((_: any, idx: number) => idx !== i);
                                            newTable.rows = newTable.rows.map((r: any) => r.filter((_: any, idx: number) => idx !== i));
                                            updateBlock(index, newTable);
                                          }}>
                                            <X className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      ))}
                                      <Button type="button" size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => {
                                        const newTable = { ...(block.content as any) };
                                        newTable.headers.push(`Col ${newTable.headers.length + 1}`);
                                        newTable.rows = newTable.rows.map((r: any) => [...r, '']);
                                        updateBlock(index, newTable);
                                      }}>
                                        <Plus className="w-3 h-3" />
                                      </Button>
                                    </div>
                                    <div className="space-y-1">
                                      {(block.content as any).rows.map((row: string[], ri: number) => (
                                        <div key={ri} className="flex gap-2">
                                          {row.map((cell, ci) => (
                                            <Input
                                              key={ci}
                                              value={cell}
                                              onChange={(e) => {
                                                const newTable = { ...(block.content as any) };
                                                newTable.rows[ri][ci] = e.target.value;
                                                updateBlock(index, newTable);
                                              }}
                                              className="text-xs h-7 flex-1 min-w-[100px]"
                                            />
                                          ))}
                                          <Button type="button" size="icon" variant="ghost" className="h-7 w-5 p-0" onClick={() => {
                                            const newTable = { ...(block.content as any) };
                                            newTable.rows = newTable.rows.filter((_: any, idx: number) => idx !== ri);
                                            updateBlock(index, newTable);
                                          }}>
                                            <X className="w-3 h-3 text-destructive" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                    <Button type="button" size="sm" variant="ghost" className="w-full h-7 text-xs border-dashed border mt-1" onClick={() => {
                                      const newTable = { ...(block.content as any) };
                                      newTable.rows.push(new Array(newTable.headers.length).fill(''));
                                      updateBlock(index, newTable);
                                    }}>
                                      <Plus className="w-3 h-3 mr-1" /> Agregar Fila
                                    </Button>
                                  </div>
                                ) : block.type === 'image' ? (
                                  <div className="space-y-3">
                                    <div className="flex gap-2">
                                      <div className="flex-1">
                                        <Label className="text-[10px] uppercase text-muted-foreground mb-1 block">URL de la Imagen</Label>
                                        <Input
                                          value={block.content as string}
                                          onChange={(e) => updateBlock(index, e.target.value)}
                                          placeholder="https://..."
                                          className="text-sm h-8"
                                          disabled={uploadingBlocks.has(index)}
                                        />
                                      </div>
                                      <div className="shrink-0">
                                        <Label className="text-[10px] uppercase text-muted-foreground mb-1 block">O Subir Archivo</Label>
                                        <div className="relative">
                                          <Input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            id={`block-image-${index}`}
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file) handleImageBlockUpload(index, file);
                                            }}
                                            disabled={uploadingBlocks.has(index)}
                                          />
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="h-8 gap-2"
                                            asChild
                                            disabled={uploadingBlocks.has(index)}
                                          >
                                            <label htmlFor={`block-image-${index}`}>
                                              {uploadingBlocks.has(index) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                              {uploadingBlocks.has(index) ? 'Subiendo...' : 'Desde Dispositivo'}
                                            </label>
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <Textarea
                                    value={block.content as string}
                                    onChange={(e) => updateBlock(index, e.target.value)}
                                    placeholder="Escribe aquí el contenido..."
                                    className="min-h-[60px] text-sm resize-y"
                                  />
                                )}

                                {block.type === 'image' && block.content && (
                                  <div className="mt-2 relative aspect-video rounded-md overflow-hidden border bg-muted/50 max-h-40 flex items-center justify-center">
                                    <img
                                      src={block.content as string}
                                      alt="Preview"
                                      className={cn(
                                        "object-contain max-w-full max-h-full transition-opacity",
                                        uploadingBlocks.has(index) ? "opacity-30" : "opacity-100"
                                      )}
                                      onError={(e: any) => {
                                        e.target.src = 'https://placehold.co/400x225?text=Error+en+URL+de+Imagen';
                                      }}
                                    />
                                    {uploadingBlocks.has(index) && (
                                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/5">
                                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                        <span className="text-xs font-bold text-primary">Subiendo Imagen...</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>

                        <div className="space-y-4 pt-4 border-t opacity-50">
                          <Accordion type="single" collapsible>
                            <AccordionItem value="json-advanced" className="border-none">
                              <AccordionTrigger className="py-2 text-xs hover:no-underline">
                                <span className="flex items-center gap-2"><BrainCircuit className="w-3 h-3" /> JSON Avanzado (Cuidado)</span>
                              </AccordionTrigger>
                              <AccordionContent>
                                <Textarea
                                  value={JSON.stringify(interactiveContent.explanatory?.blocks || [], null, 2)}
                                  onChange={(e) => {
                                    try {
                                      const parsed = JSON.parse(e.target.value);
                                      setInteractiveContent(prev => ({
                                        ...prev,
                                        explanatory: { ...prev.explanatory, blocks: parsed }
                                      }));
                                    } catch (err) { /* silent typing */ }
                                  }}
                                  rows={10}
                                  className="font-mono text-[10px] bg-muted/30"
                                />
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )}

            {type === 'class' && (
              <div className="space-y-6 pt-6 border-t">
                <h3 className="font-semibold text-lg">Detalles de la Clase</h3>
                <div className="flex items-center space-x-2">
                  <Switch id="isLive" checked={classDetails.isLive} onCheckedChange={(checked) => handleClassDetailChange('isLive', checked)} />
                  <Label htmlFor="isLive">¿Es una clase en vivo?</Label>
                </div>

                {classDetails.isLive && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Fecha de la Clase</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !classDetails.classDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {classDetails.classDate ? format(new Date(classDetails.classDate), "PPP", { locale: es }) : <span>Elige una fecha</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={classDetails.classDate ? new Date(classDetails.classDate) : undefined}
                              onSelect={handleDateChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <Label>Hora de la Clase</Label>
                        <Input type="time" value={timeValue} onChange={handleTimeChange} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="classSubject">Materia / Tema</Label>
                        <Input
                          id="classSubject"
                          value={classDetails.classSubject || ''}
                          onChange={(e) => handleClassDetailChange('classSubject', e.target.value)}
                          placeholder="Ej: Matemáticas, Física..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Profesor a cargo</Label>
                        <Select
                          value={classDetails.professorId || ''}
                          onValueChange={(value) => {
                            const selected = professors.find(p => p.id === value);
                            if (selected) {
                              setClassDetails(prev => ({
                                ...prev,
                                professorId: selected.id,
                                professorName: selected.name,
                                professorAvatar: selected.avatarUrl
                              }));
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar Profesor" />
                          </SelectTrigger>
                          <SelectContent>
                            {professors.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                <div className="flex items-center gap-2">
                                  {p.avatarUrl && <img src={p.avatarUrl} alt={p.name} className="w-5 h-5 rounded-full object-cover" />}
                                  <span>{p.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="classDay">Día de la Clase</Label>
                        <Input
                          id="classDay"
                          value={classDetails.classDay || ''}
                          onChange={(e) => handleClassDetailChange('classDay', e.target.value)}
                          placeholder="Ej: Lunes, 15/12/2024..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="classTime">Hora de la Clase</Label>
                        <Input
                          id="classTime"
                          value={classDetails.classTime || ''}
                          onChange={(e) => handleClassDetailChange('classTime', e.target.value)}
                          placeholder="Ej: 18:00, 10:30 AM..."
                        />
                        <p className="text-xs text-muted-foreground">Formato de texto libre</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="classCost">Costo de la Clase</Label>
                        <Input
                          id="classCost"
                          type="number"
                          value={classDetails.classCost || ''}
                          onChange={(e) => handleClassDetailChange('classCost', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          min="0"
                          step="0.01"
                        />
                        <p className="text-xs text-muted-foreground">Costo en la moneda local</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="classDuration">Duración de la Clase</Label>
                        <Input
                          id="classDuration"
                          value={classDetails.classDuration || ''}
                          onChange={(e) => handleClassDetailChange('classDuration', e.target.value)}
                          placeholder="Ej: 2 horas, 90 mins"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="maxCapacity">Cupo Máximo</Label>
                        <Input
                          id="maxCapacity"
                          type="number"
                          value={classDetails.maxCapacity || ''}
                          onChange={(e) => handleClassDetailChange('maxCapacity', parseInt(e.target.value) || 0)}
                          placeholder="Ej: 50"
                          min="1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="availableSpots">Lugares Disponibles</Label>
                        <Input
                          id="availableSpots"
                          type="number"
                          value={classDetails.availableSpots || ''}
                          onChange={(e) => handleClassDetailChange('availableSpots', parseInt(e.target.value) || 0)}
                          placeholder="Ej: 20"
                          min="0"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {type === 'quiz' && (
              <div className="grid md:grid-cols-2 gap-6 pt-6 border-t">
                <div className="md:col-span-2">
                  <h3 className="font-semibold text-lg">Preguntas del Quiz</h3>
                </div>
                <div className="space-y-4 pr-4 border-r">
                  <h4 className="font-semibold text-muted-foreground">Estilos del Quiz</h4>
                  <div className="space-y-2">
                    <Label htmlFor="bgColor">Color de Fondo</Label>
                    <Input id="bgColor" type="color" value={quizDetails?.backgroundColor || '#ffffff'} onChange={(e) => handleQuizDetailChange('backgroundColor', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="textColor">Color de Texto</Label>
                    <Input id="textColor" type="color" value={quizDetails?.textColor || '#000000'} onChange={(e) => handleQuizDetailChange('textColor', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bgImage">URL de Imagen de Fondo</Label>
                    <Input id="bgImage" value={quizDetails?.backgroundImageUrl || ''} onChange={(e) => handleQuizDetailChange('backgroundImageUrl', e.target.value)} placeholder="https://..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bgOpacity">Opacidad de Fondo ({opacityValue.toFixed(0)}%)</Label>
                    <Slider
                      id="bgOpacity"
                      min={0}
                      max={100}
                      step={5}
                      defaultValue={[opacityValue]}
                      onValueChange={(value) => handleQuizDetailChange('backgroundImageOpacity', value[0] / 100)}
                      disabled={!quizDetails?.backgroundImageUrl}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <Button type="button" size="sm" variant="outline" onClick={addQuestion}>
                    <PlusCircle className="mr-2 h-4 w-4" />Añadir Pregunta
                  </Button>
                  <Accordion type="multiple" className="w-full space-y-4">
                    {(quizDetails?.questions || []).map((q, qIndex) => (
                      <AccordionItem value={q.id} key={q.id} className="border p-4 rounded-lg bg-muted/30">
                        <AccordionTrigger>
                          <span className="truncate flex-1 text-left">Pregunta {qIndex + 1}: {q.question}</span>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4 space-y-4">
                          <div className="space-y-2">
                            <Label>Texto de la Pregunta</Label>
                            <Textarea value={q.question} onChange={(e) => handleQuestionChange(qIndex, 'question', e.target.value)} />
                          </div>

                          <div className="space-y-2">
                            <Label>Imagen de la Pregunta (Opcional)</Label>
                            <div className="flex gap-2 items-center">
                              <Input
                                placeholder="URL de la imagen..."
                                value={q.imageUrl || ''}
                                onChange={(e) => handleQuestionChange(qIndex, 'imageUrl', e.target.value)}
                                className="flex-1 h-9"
                              />
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                id={`q-image-${qIndex}-${q.id}`}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleQuestionImageUpload(qIndex, file);
                                }}
                              />
                              <Button type="button" size="sm" variant="outline" asChild disabled={uploadingQuestions.has(qIndex)} className="h-9">
                                <label htmlFor={`q-image-${qIndex}-${q.id}`} className="cursor-pointer flex items-center gap-2">
                                  {uploadingQuestions.has(qIndex) ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                                  {uploadingQuestions.has(qIndex) ? 'Subiendo...' : 'Subir'}
                                </label>
                              </Button>
                            </div>
                            {q.imageUrl && (
                              <div className="relative w-full h-40 mt-2 rounded-md overflow-hidden border bg-background flex items-center justify-center">
                                <img src={q.imageUrl} alt="Pregunta" className="max-w-full max-h-full object-contain" />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  className="absolute top-1 right-1 h-6 w-6"
                                  onClick={() => handleQuestionChange(qIndex, 'imageUrl', '')}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label>Opciones (selecciona la correcta)</Label>
                            <RadioGroup value={q.options.findIndex(o => o.isCorrect).toString()} onValueChange={(val) => handleCorrectAnswerChange(qIndex, parseInt(val))}>
                              <div className="space-y-3">
                                {q.options.map((opt, oIndex) => (
                                  <div key={opt.id} className="flex flex-col gap-2 p-3 border rounded-lg bg-background/50">
                                    <div className="flex items-center gap-3">
                                      <RadioGroupItem value={oIndex.toString()} id={`${q.id}-${opt.id}`} />
                                      <Input value={opt.text} onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)} className="flex-1 h-9" placeholder={`Opción ${oIndex + 1}`} />

                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        id={`opt-image-${qIndex}-${oIndex}-${opt.id}`}
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleOptionImageUpload(qIndex, oIndex, file);
                                        }}
                                      />
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        asChild
                                        className="h-9 w-9 shrink-0"
                                        disabled={uploadingOptions.has(`${qIndex}_${oIndex}`)}
                                      >
                                        <label htmlFor={`opt-image-${qIndex}-${oIndex}-${opt.id}`} className="cursor-pointer">
                                          {uploadingOptions.has(`${qIndex}_${oIndex}`) ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <ImageIcon className="w-4 h-4" />}
                                        </label>
                                      </Button>

                                      <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removeOption(qIndex, oIndex)} disabled={q.options.length <= 2}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>

                                    {(opt.imageUrl || uploadingOptions.has(`${qIndex}_${oIndex}`)) && (
                                      <div className="relative w-24 h-24 ml-8 rounded-md overflow-hidden border bg-background flex items-center justify-center">
                                        {uploadingOptions.has(`${qIndex}_${oIndex}`) ? (
                                          <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-muted/20">
                                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                            <span className="text-[10px] font-bold text-primary">Subiendo...</span>
                                          </div>
                                        ) : (
                                          <>
                                            <img src={opt.imageUrl!} alt="Opción" className="max-w-full max-h-full object-contain" />
                                            <Button
                                              type="button"
                                              variant="destructive"
                                              size="icon"
                                              className="absolute top-0 right-0 h-5 w-5 rounded-none"
                                              onClick={() => {
                                                const newQuestions = [...(quizDetails?.questions || [])];
                                                newQuestions[qIndex].options[oIndex].imageUrl = '';
                                                handleQuizDetailChange('questions', newQuestions);
                                              }}
                                            >
                                              <X className="h-3 w-3" />
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </RadioGroup>
                          </div>

                          <div className="flex justify-between items-center mt-4 pt-2 border-t">
                            <Button type="button" size="sm" variant="ghost" onClick={() => addOption(qIndex)} disabled={q.options.length >= 4} className="h-8">
                              <PlusCircle className="mr-2 h-4 w-4" />Añadir Opción
                            </Button>
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeQuestion(qIndex)} className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="mr-2 h-4 w-4" />Eliminar Pregunta
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </div>
            )}
          </form>
        </div>
        <DialogFooter className="p-6 pt-4 border-t flex-shrink-0 bg-background">
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
          <Button type="submit" form="edit-content-form" disabled={isSubmitting}>{isSubmitting ? "Guardando..." : "Guardar Cambios"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
