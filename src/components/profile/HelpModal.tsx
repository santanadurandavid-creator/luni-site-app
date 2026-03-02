
'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { LifeBuoy, ChevronRight, MessageSquare, Loader2, Circle } from 'lucide-react';
import { Button } from '../ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState } from 'react';
import type { SupportTicket } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { ChatConversation } from '../shared/ChatConversation';
import { getFirebaseServices } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

interface HelpModalProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    initialTicketId?: string | null;
}

interface FaqItem {
    id: string;
    question: string;
    answer: string;
}

const FaqItems = () => {
    const [faqItems, setFaqItems] = useState<FaqItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const { db } = getFirebaseServices();
        const unsubscribe = onSnapshot(collection(db, 'faqs'), (snapshot) => {
            const faqs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as FaqItem));
            setFaqItems(faqs);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (isLoading) {
        return <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>;
    }

    if (faqItems.length === 0) {
        return <p className="text-center text-muted-foreground py-8">No hay preguntas frecuentes disponibles.</p>;
    }

    return (
        <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item) => (
                <AccordionItem value={`item-${item.id}`} key={item.id}>
                    <AccordionTrigger>{item.question}</AccordionTrigger>
                    <AccordionContent>{item.answer}</AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    );
};

const NewTicketView = ({ onTicketCreated }: { onTicketCreated: (ticketId: string) => void }) => {
    const { createSupportTicket } = useAuth();
    const [subject, setSubject] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim()) return;
        setIsSubmitting(true);
        const newTicketId = await createSupportTicket(subject);
        if (newTicketId) {
            onTicketCreated(newTicketId);
        }
        setIsSubmitting(false);
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 border rounded-lg space-y-4">
            <h3 className="font-semibold">¿Necesitas ayuda con algo más?</h3>
            <p className="text-sm text-muted-foreground">Describe tu problema o pregunta a continuación y nuestro equipo se pondrá en contacto contigo.</p>
            <Textarea
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ej: Tengo un problema con el pago de mi suscripción..."
                rows={4}
                required
            />
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear Ticket de Soporte
            </Button>
        </form>
    )
}

export function HelpModal({ isOpen, setIsOpen, initialTicketId }: HelpModalProps) {
    const { user, getSupportTickets } = useAuth();
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);

    useEffect(() => {
        if (isOpen) {
            const fetchTickets = async () => {
                setIsLoading(true);
                const userTickets = await getSupportTickets();
                setTickets(userTickets);
                setIsLoading(false);

                // Only open a specific ticket if initialTicketId is provided
                if (initialTicketId) {
                    const targetTicket = userTickets.find(t => t.id === initialTicketId);
                    if (targetTicket) {
                        setActiveTicket(targetTicket);
                    }
                } else {
                    // Always reset to main view when opening without a specific ticket
                    setActiveTicket(null);
                }
            };
            fetchTickets();
        } else {
            // Reset view immediately when closing
            setActiveTicket(null);
        }
    }, [isOpen, getSupportTickets, initialTicketId]);

    const handleTicketCreated = async (newTicketId: string) => {
        const userTickets = await getSupportTickets();
        setTickets(userTickets);
        const newTicket = userTickets.find(t => t.id === newTicketId);
        if (newTicket) setActiveTicket(newTicket);
    }

    const renderTicketList = () => (
        <div className="space-y-4">
            {isLoading ? (
                <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : tickets.length > 0 ? (
                <div className="space-y-2">
                    {tickets.map(ticket => {
                        const hasUnread = user && ticket.messages.some(m => m.senderId === 'admin' && (!m.readBy || !m.readBy.includes(user.id)));
                        return (
                            <button key={ticket.id} onClick={() => setActiveTicket(ticket)} className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors flex justify-between items-center">
                                <div>
                                    <p className="font-medium truncate">{ticket.subject}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Última actualización: {ticket.updatedAt ? format(ticket.updatedAt.toDate(), "d MMM, yyyy", { locale: es }) : ''}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {hasUnread && <Circle className="h-3 w-3 text-primary fill-primary" />}
                                    <Badge variant={ticket.status === 'open' ? 'default' : 'secondary'} className="capitalize">{ticket.status}</Badge>
                                </div>
                            </button>
                        )
                    })}
                </div>
            ) : (
                <p className="text-center text-muted-foreground py-8">No tienes tickets de soporte.</p>
            )}
            <NewTicketView onTicketCreated={handleTicketCreated} />
        </div>
    );

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="w-[95vw] max-w-lg rounded-lg max-h-[90vh] grid grid-rows-[auto_1fr] p-0">
                <DialogHeader className="p-6 pb-4 border-b">
                    <DialogTitle className="flex items-center gap-2">
                        <LifeBuoy />
                        Ayuda y Soporte
                    </DialogTitle>
                    <DialogDescription>
                        Encuentra respuestas a tus preguntas o contáctanos.
                    </DialogDescription>
                </DialogHeader>

                <div className="overflow-hidden">
                    {activeTicket && user ? (
                        <div className="h-full">
                            <ChatConversation
                                ticket={activeTicket}
                                sender="user"
                                currentUserId={user.id}
                                onBack={() => setActiveTicket(null)}
                            />
                        </div>
                    ) : (
                        <Tabs defaultValue="faq" className="w-full h-full flex flex-col">
                            <div className="px-6 pt-4">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="faq">Preguntas Frecuentes</TabsTrigger>
                                    <TabsTrigger value="chat">Soporte por Chat</TabsTrigger>
                                </TabsList>
                            </div>
                            <TabsContent value="faq" className="flex-grow overflow-y-auto px-6">
                                <div className="mt-4">
                                    <FaqItems />
                                </div>
                            </TabsContent>
                            <TabsContent value="chat" className="mt-4 flex-grow overflow-y-auto px-6">
                                {renderTicketList()}
                            </TabsContent>
                        </Tabs>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
