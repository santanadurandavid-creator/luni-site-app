

'use client';

import { Send, CheckCheck, Redo, UserPlus, ChevronLeft } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import type { SupportTicket, User, CsatRating, SupportMessage } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { FormEvent, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "../ui/scroll-area";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { doc, onSnapshot, getDoc, collection, getDocs, query, where, limit } from "firebase/firestore";
import { getFirebaseServices } from "@/lib/firebase";
import { Textarea } from "../ui/textarea";
import { Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatConversationProps {
    ticket: SupportTicket;
    sender: 'user' | 'admin';
    currentUserId: string;
    onAssignClick?: () => void;
    onBack?: () => void;
}

const CsatSurvey = ({ ticket, onSubmit }: { ticket: SupportTicket, onSubmit: (rating: number, comment?: string) => Promise<void> }): JSX.Element => {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    if (ticket.csat) {
        return (
            <div className="p-4 rounded-lg bg-green-100 dark:bg-green-900/50 text-center text-sm text-green-800 dark:text-green-200">
                <p>Calificaste esta conversación con {ticket.csat.rating} estrella(s). ¡Gracias por tus comentarios!</p>
            </div>
        )
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (rating > 0 && !isSubmitting) {
            setIsSubmitting(true);
            try {
                await onSubmit(rating, comment);
                toast({ title: 'Gracias', description: 'Tu calificación ha sido enviada.' });
                // The component will re-render when ticket.csat is updated via onSnapshot
            } catch (error) {
                console.error('Error submitting CSAT rating:', error);
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudo enviar la calificación. Intenta de nuevo.' });
            } finally {
                setIsSubmitting(false);
            }
        }
    }

    return (
        <form onSubmit={handleSubmit} className="p-4 border rounded-lg bg-muted/50 space-y-3">
            <p className="text-center font-semibold text-sm">¿Cómo calificarías la atención recibida?</p>
            <div
                className="flex justify-center gap-1"
                onMouseLeave={() => setHoverRating(0)}
            >
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className={cn(
                            "h-7 w-7 cursor-pointer transition-all",
                            (hoverRating || rating) >= star ? "text-amber-400 fill-amber-400" : "text-gray-300"
                        )}
                        onMouseEnter={() => setHoverRating(star)}
                        onClick={() => setRating(star)}
                    />
                ))}
            </div>
            <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Deja un comentario (opcional)..."
                rows={2}
                disabled={isSubmitting}
            />
            <Button type="submit" size="sm" className="w-full" disabled={rating === 0 || isSubmitting}>
                {isSubmitting ? 'Enviando...' : 'Enviar Calificación'}
            </Button>
        </form>
    );
}

export function ChatConversation({ ticket: initialTicket, sender, currentUserId, onAssignClick, onBack }: ChatConversationProps) {
    const { user, sendSupportMessage, markTicketAsRead, resolveSupportTicket, reopenSupportTicket, submitTicketRating } = useAuth();
    const [message, setMessage] = useState('');
    const [ticket, setTicket] = useState(initialTicket);
    const [ticketUser, setTicketUser] = useState<User | null>(null);
    const [participants, setParticipants] = useState<Record<string, User>>({});
    const viewportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const { db } = getFirebaseServices();
        const ticketRef = doc(db, 'supportTickets', initialTicket.id);

        const fetchParticipantsData = async (messages: SupportMessage[]) => {
            const userIds = new Set<string>([initialTicket.userId]);
            messages.forEach(msg => userIds.add(msg.senderId));

            const newParticipants: Record<string, User> = {};
            const userPromises = Array.from(userIds).map(async (id) => {
                if (participants[id]) {
                    newParticipants[id] = participants[id];
                    return;
                }
                if (id === 'admin') return;

                const userRef = doc(db, 'users', id);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    newParticipants[id] = { id: userSnap.id, ...userSnap.data() } as User;
                }
            });
            await Promise.all(userPromises);

            const adminUserSnap = await getDocs(query(collection(db, 'users'), where('isAdmin', '==', true), limit(1)));
            if (!adminUserSnap.empty) {
                newParticipants['admin'] = { id: 'admin', ...adminUserSnap.docs[0].data() } as User;
            } else {
                newParticipants['admin'] = { name: 'Soporte', avatar: '', id: 'admin', email: '', examType: null, studyTime: {}, role: 'admin' };
            }

            setTicketUser(newParticipants[initialTicket.userId]);
            setParticipants(newParticipants);
        };

        const unsubscribe = onSnapshot(ticketRef, (doc) => {
            if (doc.exists()) {
                const newTicketData = { id: doc.id, ...doc.data() } as SupportTicket;
                setTicket(newTicketData);
                fetchParticipantsData(newTicketData.messages);

                if (sender === 'admin') {
                    markTicketAsRead(newTicketData.id);
                } else if (sender === 'user') {
                    const hasUnreadFromAdmin = newTicketData.messages.some(m => m.senderId === 'admin' && !m.readBy?.includes(currentUserId));
                    if (hasUnreadFromAdmin) {
                        markTicketAsRead(newTicketData.id);
                    }
                }
            }
        });

        return () => unsubscribe();
    }, [initialTicket.id, initialTicket.userId, sender, currentUserId, markTicketAsRead]);

    useEffect(() => {
        if (viewportRef.current) {
            viewportRef.current.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [ticket.messages]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!message.trim() || ticket.status === 'closed') return;

        const senderId = user?.isAdmin || user?.role === 'support' || user?.role === 'supervisor_support' ? 'admin' : currentUserId;
        await sendSupportMessage(ticket.id, message, senderId);
        setMessage('');
    }

    const otherParticipant = sender === 'admin'
        ? { name: ticketUser?.name || 'Usuario', avatar: ticketUser?.avatar }
        : { name: 'Soporte', avatar: participants['admin']?.avatar };

    return (
        <div className="flex flex-col h-full rounded-lg overflow-hidden">
            <header className="p-4 border-b flex items-center justify-between gap-4 flex-shrink-0 bg-background">
                <div className="flex items-center gap-4 overflow-hidden">
                    {onBack && (
                        <Button variant="ghost" size="icon" onClick={onBack} className="flex-shrink-0 -ml-2">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                    )}
                    <Avatar>
                        <AvatarImage src={otherParticipant.avatar || undefined} />
                        <AvatarFallback>{otherParticipant.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="overflow-hidden">
                        <h3 className="font-semibold truncate">{otherParticipant.name}</h3>
                        <p className="text-sm text-muted-foreground truncate">{ticket.subject}</p>
                    </div>
                </div>
                {sender === 'admin' && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {user?.isAdmin && onAssignClick && (
                            <Button size="sm" variant="outline" onClick={onAssignClick}><UserPlus className="mr-2 h-4 w-4" /> Asignar</Button>
                        )}
                        {ticket.status === 'open' ? (
                            <Button size="sm" variant="outline" onClick={() => resolveSupportTicket(ticket.id)}>
                                <CheckCheck className="mr-2 h-4 w-4" /> Marcar como Resuelto
                            </Button>
                        ) : (
                            <Button size="sm" variant="outline" onClick={() => reopenSupportTicket(ticket.id)}>
                                <Redo className="mr-2 h-4 w-4" /> Re-abrir Ticket
                            </Button>
                        )}
                    </div>
                )}
            </header>
            <ScrollArea className="flex-grow bg-muted/20" viewportRef={viewportRef}>
                <div className="p-4 space-y-4">
                    {ticket.messages.map((msg, index) => {
                        const isCurrentUserMsg = sender === 'admin' ? msg.senderId === 'admin' : msg.senderId === currentUserId;
                        const senderInfo = participants[msg.senderId] || { name: 'Soporte', avatar: '' };

                        return (
                            <div key={`${msg.senderId}-${msg.createdAt?.toMillis() || index}-${index}`} className={cn("flex items-end gap-2", isCurrentUserMsg ? "justify-end" : "justify-start")}>
                                {!isCurrentUserMsg && <Avatar className="h-8 w-8"><AvatarImage src={senderInfo.avatar || undefined} /><AvatarFallback>{senderInfo.name.charAt(0)}</AvatarFallback></Avatar>}
                                <div className={cn("max-w-xs md:max-w-md p-3 rounded-lg", isCurrentUserMsg ? "bg-primary text-primary-foreground" : "bg-muted")}>
                                    <p className="text-sm">{msg.text}</p>
                                    <p className={cn("text-xs mt-1 text-right", isCurrentUserMsg ? "text-primary-foreground/70" : "text-muted-foreground")}>
                                        {msg.createdAt ? format(msg.createdAt.toDate(), 'p', { locale: es }) : ''}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                    {ticket.status === 'closed' && sender === 'user' && (
                        <CsatSurvey ticket={ticket} onSubmit={(rating, comment) => submitTicketRating(ticket.id, rating, comment)} />
                    )}
                    {ticket.status === 'closed' && sender === 'admin' && ticket.csat && (
                        <div className="p-4 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-center text-sm text-amber-800 dark:text-amber-200">
                            <p className="font-semibold">Calificación del Usuario: {ticket.csat.rating} estrella(s)</p>
                            {ticket.csat.comment && <p className="italic mt-1">"{ticket.csat.comment}"</p>}
                        </div>
                    )}
                </div>
            </ScrollArea>
            <form onSubmit={handleSubmit} className="p-4 border-t flex items-center gap-2 flex-shrink-0 bg-background">
                <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={ticket.status === 'closed' ? "Este ticket está cerrado." : "Escribe tu mensaje..."}
                    autoComplete="off"
                    disabled={ticket.status === 'closed'}
                />
                <Button type="submit" size="icon" disabled={ticket.status === 'closed'}>
                    <Send className="h-4 w-4" />
                </Button>
            </form>
        </div>
    )
}
