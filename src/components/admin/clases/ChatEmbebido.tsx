
'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { getFirebaseServices } from "@/lib/firebase";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { arrayUnion, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { Send, MicOff } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from 'uuid';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ChatEmbebidoProps {
    classId: string;
    isMuted?: boolean;
}

export function ChatEmbebido({ classId, isMuted = false }: ChatEmbebidoProps) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const viewportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const { db } = getFirebaseServices();
        const classRef = doc(db, 'content', classId);
        const unsubscribe = onSnapshot(classRef, (doc) => {
            if (doc.exists()) {
                setMessages(doc.data().classDetails?.chatMessages || []);
            }
        });

        return () => unsubscribe();
    }, [classId]);
     
    useEffect(() => {
        if (viewportRef.current) {
            viewportRef.current.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages]);

    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || isMuted) return;

        const messageData: ChatMessage = {
            id: uuidv4(),
            senderId: user.id,
            senderName: user.name,
            senderAvatar: user.avatar,
            text: newMessage,
            createdAt: new Date(),
        };

        const { db } = getFirebaseServices();
        const classRef = doc(db, 'content', classId);
        await updateDoc(classRef, {
            "classDetails.chatMessages": arrayUnion(messageData)
        });
        
        setNewMessage('');
    }

    return (
        <div className="h-full flex flex-col">
            <ScrollArea className="flex-grow p-4" viewportRef={viewportRef}>
                 <div className="space-y-4">
                    {messages.map((msg) => (
                        <div key={msg.id} className={cn(
                            "flex items-end gap-2 w-full", 
                            msg.senderId === user?.id ? "justify-end" : "justify-start"
                        )}>
                            {msg.senderId !== user?.id && (
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={msg.senderAvatar} />
                                    <AvatarFallback>{msg.senderName ? msg.senderName.charAt(0) : '?'}</AvatarFallback>
                                </Avatar>
                            )}
                             <div className={cn(
                                "max-w-xs md:max-w-sm p-3 rounded-lg", 
                                msg.senderId === user?.id ? "bg-primary text-primary-foreground" : "bg-muted"
                            )}>
                                {msg.senderId !== user?.id && <p className="text-xs font-semibold mb-1">{msg.senderName}</p>}
                                <p className="text-sm">{msg.text}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
            <div className="p-4 border-t flex-shrink-0 bg-background">
                 {isMuted && (
                    <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm text-center mb-2 flex items-center justify-center gap-2">
                        <MicOff className="h-4 w-4" />
                        <div>
                            <p className="font-semibold">Has sido silenciado por el maestro.</p>
                            <p className="text-xs">No puedes enviar mensajes en este momento.</p>
                        </div>
                    </div>
                )}
                 <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <Input 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={isMuted ? "No puedes enviar mensajes" : "Escribe un mensaje..."}
                        autoComplete="off"
                        disabled={isMuted}
                    />
                    <Button type="submit" size="icon" disabled={isMuted || !newMessage.trim()}>
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>
        </div>
    )
}
