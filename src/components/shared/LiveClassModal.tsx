'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ContentItem, ChatMessage } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Star, Calendar, Clock, DollarSign, Send, X, MessageCircle, Users, User } from 'lucide-react';
import { collection, addDoc, orderBy, query, onSnapshot, serverTimestamp, where, getDoc, doc } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { ShareButton } from '@/components/shared/ShareButton';
import { RateClassModal } from '@/components/shared/RateClassModal';
import { cn } from '@/lib/utils';

interface LiveClassModalProps {
    item: ContentItem | null;
    onClose: () => void;
}

export function LiveClassModal({ item, onClose }: LiveClassModalProps) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [showChat, setShowChat] = useState(false);
    const [professorStats, setProfessorStats] = useState({ rating: 0, total: 0 });
    const scrollRef = useRef<HTMLDivElement>(null);

    const isUserRegistered = item?.classDetails?.registeredUsers?.includes(user?.id || '') || false;

    // Fetch Professor Rating
    useEffect(() => {
        if (item?.classDetails?.professorId) {
            const fetchRating = async () => {
                const { db } = getFirebaseServices();
                const docRef = doc(db, 'professors', item.classDetails!.professorId!);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const data = snap.data();
                    setProfessorStats({
                        rating: data.rating || 0,
                        total: data.totalRatings || 0
                    });
                }
            };
            fetchRating();
        }
    }, [item?.classDetails?.professorId]);

    // Load chat messages if user is registered
    useEffect(() => {
        if (!item?.id || !isUserRegistered) return;

        const { db } = getFirebaseServices();
        const messagesRef = collection(db, 'content', item.id, 'chatMessages');
        const q = query(messagesRef, orderBy('createdAt', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as ChatMessage));
            setMessages(msgs);
        });

        return () => unsubscribe();
    }, [item?.id, isUserRegistered]);

    // Handle mobile back button
    useEffect(() => {
        if (isUserRegistered && item) {
            // Push state to history to support back button closing
            const state = { modalOpen: 'live-class' };
            window.history.pushState(state, '', window.location.href);

            const handlePopState = (event: PopStateEvent) => {
                onClose();
            };

            window.addEventListener('popstate', handlePopState);

            return () => {
                window.removeEventListener('popstate', handlePopState);
            };
        }
    }, [isUserRegistered, item]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollRef.current && showChat) {
            setTimeout(() => {
                if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }, 100);
        }
    }, [messages, showChat]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollRef.current && showChat) {
            setTimeout(() => {
                if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }, 100);
        }
    }, [messages, showChat]);


    const [showRatingModal, setShowRatingModal] = useState(false);
    const [hasRated, setHasRated] = useState(false);

    // Check if user has already rated
    useEffect(() => {
        if (!item?.id || !user) return;

        const { db } = getFirebaseServices();
        // Simple check: query ratings where userId == user.id
        // Since subcollection queries are shallow, we can do this easily.
        const ratingsRef = collection(db, 'content', item.id, 'ratings');
        const q = query(ratingsRef, where('userId', '==', user.id));

        // Use onSnapshot to update real-time if they rate from another device or this modal
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setHasRated(!snapshot.empty);
        });

        return () => unsubscribe();
    }, [item?.id, user]);

    // Trigger Rating Modal when class finishes
    useEffect(() => {
        // Wait for onSnapshot to potentially set hasRated to true before showing modal
        // We can add a small delay or just rely on Firebase being fast enough.
        // Actually best is to not Trigger if we are unsure.
        // But let's just make sure we don't spam it.
        if (item?.classDetails?.status === 'finished' && isUserRegistered && !hasRated) {
            setShowRatingModal(true);
        }
    }, [item?.classDetails?.status, isUserRegistered, hasRated]);

    const handleSendMessage = async () => {
        // ... existing handleSendMessage ...
        if (!newMessage.trim() || !item?.id || !user) return;

        const { db } = getFirebaseServices();
        const messagesRef = collection(db, 'content', item.id, 'chatMessages');

        await addDoc(messagesRef, {
            senderId: user.id,
            senderName: user.name,
            senderAvatar: user.avatar,
            text: newMessage.trim(),
            createdAt: serverTimestamp(),
            readBy: [user.id]
        });

        setNewMessage('');
    };

    const handleWhatsAppRedirect = () => {
        if (!item) return;

        const phoneNumber = '5619764631';
        const subject = item.classDetails?.classSubject || item.subject || 'la clase';
        const day = item.classDetails?.classDay || 'el día programado';
        const time = item.classDetails?.classTime || 'la hora programada';

        const message = `Quiero unirme a la clase ${subject} del día ${day} y la hora ${time}`;
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

        window.open(whatsappUrl, '_blank');
    };

    if (!item) return null;

    // Chat Interface Component
    const ChatInterface = () => (
        <div className="flex flex-col h-full overflow-hidden">
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-3">
                    {messages.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                            Aún no hay mensajes. ¡Sé el primero en escribir!
                        </p>
                    ) : (
                        messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex gap-2 ${msg.senderId === user?.id ? 'flex-row-reverse' : 'flex-row'}`}
                            >
                                {msg.senderAvatar ? (
                                    <img
                                        src={msg.senderAvatar}
                                        alt={msg.senderName}
                                        className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                        <span className="text-xs font-bold text-primary">
                                            {msg.senderName?.[0]?.toUpperCase() || 'U'}
                                        </span>
                                    </div>
                                )}
                                <div className={`flex flex-col ${msg.senderId === user?.id ? 'items-end' : 'items-start'}`}>
                                    <p className="text-xs text-muted-foreground mb-1">{msg.senderName}</p>
                                    <div className={`rounded-lg px-3 py-2 max-w-[80%] ${msg.senderId === user?.id
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted border'
                                        }`}>
                                        <p className="text-sm break-words">{msg.text}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>

            <div className="p-3 border-t bg-background">
                <div className="flex gap-2">
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        placeholder="Escribe un mensaje..."
                        className="flex-1"
                    />
                    <Button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        size="icon"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );

    const isClassFinished = item?.classDetails?.status === 'finished';

    return (
        <>
            <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
                <DialogContent showCloseButton={false} className={cn(
                    "flex flex-col duration-500",
                    isUserRegistered && !isClassFinished
                        ? "w-screen h-screen max-w-none max-h-none m-0 p-0 rounded-none border-none bg-black"
                        : "w-[90vw] md:w-[90vw] lg:w-full max-w-md md:max-w-4xl lg:max-w-6xl h-[90vh] md:h-[85vh] lg:h-[80vh] p-0 gap-0 overflow-hidden border-none bg-zinc-900 shadow-2xl rounded-2xl transition-all"
                )}>
                    {isClassFinished ? (
                        <div className="relative w-full h-full flex flex-col items-center justify-center text-white p-6 text-center space-y-4">
                            <DialogHeader className="sr-only">
                                <DialogTitle>Clase Finalizada</DialogTitle>
                                <DialogDescription>Esta clase ha terminado</DialogDescription>
                            </DialogHeader>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-4 right-4 z-50 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
                                onClick={onClose}
                            >
                                <X className="w-5 h-5" />
                            </Button>

                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-2">
                                <Clock className="w-10 h-10 text-green-500" />
                            </div>
                            <h3 className="text-2xl font-bold">Clase Finalizada</h3>
                            <p className="text-white/70 max-w-xs">
                                Esta clase ha terminado. ¡Esperamos verte en las próximas sesiones!
                            </p>
                            {isUserRegistered && !hasRated && (
                                <p className="text-sm text-yellow-500 animate-pulse">
                                    Por favor califica la clase en la ventana emergente.
                                </p>
                            )}
                        </div>
                    ) : isUserRegistered ? (
                        // Fullscreen Video View
                        <>
                            <DialogHeader className="sr-only">
                                <DialogTitle>{item.title}</DialogTitle>
                                <DialogDescription>{item.subject}</DialogDescription>
                            </DialogHeader>
                            <div className="relative w-full h-full flex items-center justify-center bg-black">
                                {/* Top Bar Overlay - Covers "Powered by" branding */}
                                <div className="absolute top-0 left-0 w-full h-16 bg-black z-40 flex items-center px-4 shadow-lg shadow-black/50">
                                    <img
                                        src="/images/luni-logo.png"
                                        alt="App Logo"
                                        className="w-10 h-10 rounded-xl object-contain"
                                    />
                                    <h4 className="ml-3 text-white font-semibold text-lg hidden sm:block">
                                        Luni Class
                                    </h4>
                                </div>

                                {/* Close Button */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-4 right-4 z-50 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
                                    onClick={onClose}
                                >
                                    <X className="w-6 h-6" />
                                </Button>

                                {/* Video Container */}
                                <div className="w-full h-full">
                                    {item.contentUrl ? (
                                        item.contentUrl.includes('youtube.com') ||
                                            item.contentUrl.includes('youtu.be') ||
                                            item.contentUrl.includes('whereby.com') ||
                                            item.contentUrl.includes('jitsi') ||
                                            item.contentUrl.includes('meet.jit.si') ? (
                                            <iframe
                                                src={(() => {
                                                    if (item.contentUrl.includes('whereby.com')) {
                                                        const url = new URL(item.contentUrl);
                                                        url.searchParams.set('minimal', '');
                                                        url.searchParams.set('screenshare', 'off');
                                                        url.searchParams.set('chat', 'off');
                                                        url.searchParams.set('people', 'off');
                                                        url.searchParams.set('leaveButton', 'off');
                                                        url.searchParams.set('displayName', 'off');
                                                        url.searchParams.set('floatSelf', 'off');
                                                        url.searchParams.set('topToolbar', 'off');
                                                        url.searchParams.set('bottomToolbar', 'off');
                                                        return url.toString();
                                                    }
                                                    return item.contentUrl;
                                                })()}
                                                className="w-full h-full"
                                                allow="camera; microphone; fullscreen; display-capture; autoplay; encrypted-media"
                                                allowFullScreen
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <div className="text-center space-y-4 p-8">
                                                    <div className="bg-green-500/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto">
                                                        <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                    <h3 className="text-white text-2xl font-bold">Clase en Vivo</h3>
                                                    <a
                                                        href={item.contentUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-block bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-lg transition-colors text-lg"
                                                    >
                                                        🎥 Unirse a la Clase
                                                    </a>
                                                </div>
                                            </div>
                                        )
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white">
                                            <div className="text-center">
                                                <p className="text-lg mb-2">La clase aún no ha comenzado</p>
                                                <p className="text-sm text-gray-400">
                                                    El enlace de transmisión aparecerá aquí cuando inicie la clase
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Chat Toggle Button */}
                                <Button
                                    className="absolute bottom-8 right-8 z-50 rounded-full w-14 h-14 bg-primary hover:bg-primary/90 text-white shadow-lg flex items-center justify-center"
                                    onClick={() => setShowChat(true)}
                                >
                                    <MessageCircle className="w-7 h-7" />
                                </Button>
                            </div>
                        </>
                    ) : (
                        // Not Registered Registration View
                        <div className="relative w-full h-full bg-black text-white overflow-hidden flex flex-col">
                            <DialogHeader className="sr-only">
                                <DialogTitle>{item.title}</DialogTitle>
                                <DialogDescription>{item.subject || 'Detalles de la clase'}</DialogDescription>
                            </DialogHeader>

                            {/* Background Image - Full Size */}
                            <div className="absolute inset-0 z-0">
                                {item.imageUrl || item.classDetails?.professorAvatar ? (
                                    <img
                                        src={item.imageUrl || item.classDetails?.professorAvatar}
                                        alt={item.title}
                                        className="w-full h-full object-cover opacity-90"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                                        <Calendar className="w-20 h-20 opacity-20" />
                                    </div>
                                )}
                                {/* Strong Gradient for text readability - Lightened as requested */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                            </div>

                            {/* Close Button */}
                            <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                                <ShareButton
                                    itemId={item.id || ''}
                                    itemTitle={item.title}
                                    itemType="class"
                                    size="icon"
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md border border-white/10"
                                    onClick={onClose}
                                >
                                    <X className="w-6 h-6" />
                                </Button>
                            </div>

                            {/* Content Overlay - Pushed to bottom on all devices */}
                            <div className="relative z-10 h-full flex flex-col justify-end p-6 md:p-12 lg:p-20 lg:pb-12 space-y-8 max-w-7xl mx-auto w-full">
                                <div className="md:grid md:grid-cols-2 md:gap-16 md:items-center">
                                    {/* Left Column: Subject, Title, Professor */}
                                    <div className="space-y-6 md:space-y-8">
                                        {/* Title and Subject */}
                                        <div className="space-y-2 md:space-y-4">
                                            {item.subject && (
                                                <div className="inline-flex items-center px-4 md:px-6 py-1.5 md:py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sm md:text-base font-bold tracking-wide mb-1">
                                                    {item.subject}
                                                </div>
                                            )}
                                            <h2 className="text-3xl md:text-5xl lg:text-7xl font-black text-white leading-none tracking-tighter drop-shadow-2xl">
                                                {item.title}
                                            </h2>
                                        </div>

                                        {/* Professor Section */}
                                        {item.classDetails?.professorName && (
                                            <div className="flex flex-col gap-1 bg-black/40 backdrop-blur-xl p-5 md:p-8 rounded-3xl border border-white/10 w-full">
                                                <div className="flex items-center gap-4 md:gap-6">
                                                    {item.classDetails.professorAvatar ? (
                                                        <img
                                                            src={item.classDetails.professorAvatar}
                                                            alt={item.classDetails.professorName}
                                                            className="w-14 h-14 md:w-24 md:h-24 rounded-full object-cover border-2 border-white/50 shadow-2xl"
                                                        />
                                                    ) : (
                                                        <div className="w-14 h-14 md:w-24 md:h-24 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-xl border-2 border-white/50">
                                                            {item.classDetails.professorName.charAt(0)}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="flex flex-col">
                                                            <p className="text-[10px] md:text-xs text-white/70 uppercase tracking-widest font-bold leading-none mb-2">Impartida por:</p>
                                                            <p className="text-2xl md:text-4xl font-black text-white leading-tight">{item.classDetails.professorName}</p>
                                                            {item.classDetails.classDuration && (
                                                                <p className="text-xs md:text-base text-white/60 flex items-center gap-2 mt-3 bg-white/5 w-fit px-3 py-1 rounded-full border border-white/5">
                                                                    <Clock className="w-4 h-4 text-primary" />
                                                                    {item.classDetails.classDuration}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right Column: Details Grid and Button */}
                                    <div className="space-y-8 md:pt-10">
                                        {/* Details Grid */}
                                        <div className="grid grid-cols-2 gap-3 md:gap-4">
                                            {item.classDetails?.classDay && (
                                                <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 md:p-6 border border-white/10 flex items-center gap-4 transition-transform hover:scale-[1.02]">
                                                    <Calendar className="w-6 h-6 md:w-8 md:h-8 text-primary shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] uppercase text-white/50 font-bold leading-none mb-1">Día</p>
                                                        <p className="font-bold text-white truncate text-sm md:text-xl">{item.classDetails.classDay}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {item.classDetails?.classTime && (
                                                <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 md:p-6 border border-white/10 flex items-center gap-4 transition-transform hover:scale-[1.02]">
                                                    <Clock className="w-6 h-6 md:w-8 md:h-8 text-primary shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] uppercase text-white/50 font-bold leading-none mb-1">Hora</p>
                                                        <p className="font-bold text-white truncate text-sm md:text-xl">{item.classDetails.classTime}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {item.classDetails?.maxCapacity !== undefined && (
                                                <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 md:p-6 border border-white/10 flex items-center gap-4 transition-transform hover:scale-[1.02]">
                                                    <Users className="w-6 h-6 md:w-8 md:h-8 text-blue-400 shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] uppercase text-white/50 font-bold leading-none mb-1">Cupo</p>
                                                        <p className="font-bold text-white truncate text-sm md:text-xl">{item.classDetails.maxCapacity}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {item.classDetails?.availableSpots !== undefined && (
                                                <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 md:p-6 border border-white/10 flex items-center gap-4 transition-transform hover:scale-[1.02]">
                                                    <User className="w-6 h-6 md:w-8 md:h-8 text-orange-400 shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] uppercase text-white/50 font-bold leading-none mb-1">Lugares</p>
                                                        <p className="font-bold text-white truncate text-sm md:text-xl">{item.classDetails.availableSpots}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Professor Rating & Action Button */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-center md:justify-start gap-1">
                                                {professorStats.total > 0 ? (
                                                    <>
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <Star
                                                                key={star}
                                                                className={cn(
                                                                    "w-5 h-5",
                                                                    star <= Math.round(professorStats.rating) ? "fill-yellow-400 text-yellow-400" : "fill-white/10 text-white/20"
                                                                )}
                                                            />
                                                        ))}
                                                        <span className="ml-2 text-white/80 font-medium text-sm">({professorStats.rating.toFixed(1)})</span>
                                                    </>
                                                ) : (
                                                    <div className="flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full border border-white/5">
                                                        <Star className="w-4 h-4 text-white/50" />
                                                        <span className="text-sm text-white/70 font-medium">Profesor Nuevo</span>
                                                    </div>
                                                )}
                                            </div>

                                            <Button
                                                onClick={handleWhatsAppRedirect}
                                                size="lg"
                                                className="w-full text-lg font-black py-8 rounded-2xl bg-white text-black hover:bg-white/90 shadow-2xl hover:scale-[1.02] transition-all transform active:scale-95"
                                            >
                                                <Star className="mr-3 h-6 w-6 fill-black" />
                                                Inscribirse Ahora
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Separate Chat Modal */}
            <Dialog open={showChat} onOpenChange={setShowChat}>
                <DialogContent className="fixed !bottom-0 !left-0 !top-auto !translate-x-0 !translate-y-0 w-full h-[40vh] !max-w-none rounded-t-xl rounded-b-none border-t border-x-0 border-b-0 bg-background p-0 gap-0 shadow-xl z-50 transition-transform duration-300 ease-in-out data-[state=open]:slide-in-from-bottom-full md:!w-[40%] md:!left-1/2 md:!translate-x-[-50%] md:border-x md:!bottom-[5%] md:rounded-b-xl md:border-b overflow-hidden">
                    <DialogHeader className="p-4 border-b flex-shrink-0">
                        <DialogTitle>Chat de la clase</DialogTitle>
                    </DialogHeader>
                    <ChatInterface />
                </DialogContent>
            </Dialog>

            {/* Rating Modal */}
            {item && !hasRated && (
                <RateClassModal
                    isOpen={showRatingModal}
                    setIsOpen={setShowRatingModal}
                    classItem={item}
                    onRatingSubmitted={() => setHasRated(true)}
                />
            )}
        </>
    );
}
