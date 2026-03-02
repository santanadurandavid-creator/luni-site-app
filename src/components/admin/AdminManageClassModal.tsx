'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, arrayUnion, arrayRemove, getDocs, where, serverTimestamp } from 'firebase/firestore';
import { Mic, MicOff, Send, Sparkles, Loader2, MessageSquare, Users, Settings, Star, StopCircle, Info } from 'lucide-react';
import type { ContentItem, User, ClassRating } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { getFirebaseServices } from '@/lib/firebase';

interface ChatMessage {
    id?: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    message: string;
    timestamp: any;
}

interface AdminManageClassModalProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    classItem: ContentItem | null;
}

export function AdminManageClassModal({ isOpen, setIsOpen, classItem }: AdminManageClassModalProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [mutedUsers, setMutedUsers] = useState<string[]>([]);
    const [connectedUsers, setConnectedUsers] = useState<User[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<string[]>([]);
    const [showAnalysisModal, setShowAnalysisModal] = useState(false);
    const [ratings, setRatings] = useState<ClassRating[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    // Cargar mensajes del chat en tiempo real
    useEffect(() => {
        if (!isOpen || !classItem?.id) return;

        const { db } = getFirebaseServices();
        const messagesRef = collection(db, `classChats/${classItem.id}/messages`);
        const q = query(messagesRef, orderBy('timestamp', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs: ChatMessage[] = [];
            snapshot.forEach((doc) => {
                msgs.push({ id: doc.id, ...doc.data() } as ChatMessage);
            });
            setMessages(msgs);

            // Auto-scroll al final
            setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
            }, 100);
        });

        // Cargar lista de usuarios silenciados
        setMutedUsers(classItem.classDetails?.mutedUsers || []);

        // Listen for ratings
        const ratingsRef = collection(db, 'content', classItem.id, 'ratings');
        const ratingsQuery = query(ratingsRef, orderBy('createdAt', 'desc'));
        const unsubscribeRatings = onSnapshot(ratingsQuery, (snapshot) => {
            const fetchedRatings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassRating));
            setRatings(fetchedRatings);
        });

        return () => {
            unsubscribe();
            unsubscribeRatings();
        };
    }, [isOpen, classItem]);

    // Cargar usuarios conectados (inscritos)
    useEffect(() => {
        if (!isOpen || !classItem?.classDetails?.registeredUsers) return;

        const fetchUsers = async () => {
            const { db } = getFirebaseServices();
            const userIds = classItem.classDetails!.registeredUsers!;

            if (userIds.length === 0) {
                setConnectedUsers([]);
                return;
            }

            const userPromises: Promise<User[]>[] = [];
            for (let i = 0; i < userIds.length; i += 30) {
                const chunk = userIds.slice(i, i + 30);
                const usersQuery = query(collection(db, 'users'), where('id', 'in', chunk));
                userPromises.push(getDocs(usersQuery).then(snapshot =>
                    snapshot.docs.map(doc => doc.data() as User)
                ));
            }

            try {
                const userChunks = await Promise.all(userPromises);
                const fetchedUsers = userChunks.flat();
                setConnectedUsers(fetchedUsers);
            } catch (error) {
                console.error('Error fetching users:', error);
            }
        };

        fetchUsers();
    }, [isOpen, classItem]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !classItem?.id) return;

        try {
            const { db, auth } = getFirebaseServices();
            const messagesRef = collection(db, `classChats/${classItem.id}/messages`);

            await addDoc(messagesRef, {
                userId: auth.currentUser?.uid || 'admin',
                userName: 'Administrador',
                userAvatar: auth.currentUser?.photoURL || '',
                message: newMessage,
                timestamp: new Date()
            });

            setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
            toast({
                title: 'Error',
                description: 'No se pudo enviar el mensaje',
                variant: 'destructive'
            });
        }
    };

    const handleToggleMute = async (userId: string) => {
        if (!classItem?.id) return;

        try {
            const { db } = getFirebaseServices();
            const classRef = doc(db, 'content', classItem.id);

            const isMuted = mutedUsers.includes(userId);

            if (isMuted) {
                await updateDoc(classRef, {
                    'classDetails.mutedUsers': arrayRemove(userId)
                });
                setMutedUsers(prev => prev.filter(id => id !== userId));
                toast({ title: 'Chat activado', description: 'El usuario puede escribir nuevamente' });
            } else {
                await updateDoc(classRef, {
                    'classDetails.mutedUsers': arrayUnion(userId)
                });
                setMutedUsers(prev => [...prev, userId]);
                toast({ title: 'Chat silenciado', description: 'El usuario no puede escribir' });
            }
        } catch (error) {
            console.error('Error toggling mute:', error);
            toast({
                title: 'Error',
                description: 'No se pudo cambiar el estado',
                variant: 'destructive'
            });
        }
    };

    const handleMuteAll = async () => {
        if (!classItem?.id || !classItem.classDetails?.registeredUsers) return;

        try {
            const { db } = getFirebaseServices();
            const classRef = doc(db, 'content', classItem.id);

            const allUserIds = classItem.classDetails.registeredUsers;

            await updateDoc(classRef, {
                'classDetails.mutedUsers': allUserIds
            });

            setMutedUsers(allUserIds);
            toast({ title: 'Todos silenciados', description: 'Ningún usuario puede escribir' });
        } catch (error) {
            console.error('Error muting all:', error);
            toast({
                title: 'Error',
                description: 'No se pudo silenciar a todos',
                variant: 'destructive'
            });
        }
    };

    const handleUnmuteAll = async () => {
        if (!classItem?.id) return;

        try {
            const { db } = getFirebaseServices();
            const classRef = doc(db, 'content', classItem.id);

            await updateDoc(classRef, {
                'classDetails.mutedUsers': []
            });

            setMutedUsers([]);
            toast({ title: 'Todos activos', description: 'Todos los usuarios pueden escribir' });
        } catch (error) {
            console.error('Error unmuting all:', error);
            toast({
                title: 'Error',
                description: 'No se pudo activar a todos',
                variant: 'destructive'
            });
        }
    };

    const handleAnalyzeDoubts = async () => {
        if (!classItem?.id || messages.length === 0) {
            toast({
                title: 'Sin mensajes',
                description: 'No hay mensajes para analizar',
                variant: 'destructive'
            });
            return;
        }

        setIsAnalyzing(true);

        try {
            const response = await fetch('/api/admin/analyze-class-doubts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    classId: classItem.id,
                    classTitle: classItem.title,
                    messages: messages.map(m => ({
                        userName: m.userName,
                        message: m.message
                    }))
                })
            });

            const data = await response.json();

            if (data.success && data.doubts) {
                setAnalysisResult(data.doubts);
                setShowAnalysisModal(true);
            } else {
                throw new Error(data.error || 'Error en análisis');
            }
        } catch (error) {
            console.error('Error analyzing doubts:', error);
            toast({
                title: 'Error',
                description: 'No se pudo analizar las dudas',
                variant: 'destructive'
            });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getStreamUrl = () => {
        if (!classItem?.contentUrl) return '';

        // Para Whereby, agregar parámetros para ocultar UI
        if (classItem.contentUrl.includes('whereby.com')) {
            const url = new URL(classItem.contentUrl);
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

        return classItem.contentUrl;
    };

    const handleFinishClass = async () => {
        if (!classItem?.id) return;
        try {
            const { db } = getFirebaseServices();
            const classRef = doc(db, 'content', classItem.id);
            await updateDoc(classRef, {
                'classDetails.status': 'finished',
                'classDetails.isLive': false,
                'classDetails.finishedAt': serverTimestamp()
            });
            toast({ title: 'Clase Finalizada', description: 'La clase ha sido marcada como terminada.' });
        } catch (error) {
            console.error('Error finishing class:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo finalizar la clase.' });
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-full w-full h-full max-h-full p-0 gap-0 border-0 rounded-none md:max-w-[95vw] md:max-h-[90vh] md:rounded-lg md:border flex flex-col">
                    {/* Header - oculto en móvil, visible en desktop */}
                    <DialogHeader className="hidden md:flex px-6 pt-6 pb-4 border-b shrink-0">
                        <DialogTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            Gestionar Clase: {classItem?.title}
                        </DialogTitle>
                    </DialogHeader>

                    {/* Layout: columna en móvil, grid en desktop */}
                    <div className="flex-1 flex flex-col md:grid md:grid-cols-3 md:gap-4 md:p-6 min-h-0">
                        {/* Video section - pantalla completa en móvil */}
                        <div className="w-full h-[40vh] md:h-auto md:col-span-2 flex flex-col min-h-0 shrink-0 md:shrink relative">
                            <div className="flex-1 bg-black relative">
                                {classItem?.contentUrl ? (
                                    <>
                                        <iframe
                                            src={getStreamUrl()}
                                            className="w-full h-full"
                                            allow="camera; microphone; fullscreen; display-capture; autoplay; encrypted-media"
                                            allowFullScreen
                                            id="class-video-iframe"
                                        />
                                        {/* Botón fullscreen flotante */}
                                        <button
                                            onClick={() => {
                                                const iframe = document.getElementById('class-video-iframe') as HTMLIFrameElement;
                                                if (iframe.requestFullscreen) {
                                                    iframe.requestFullscreen();
                                                }
                                            }}
                                            className="absolute bottom-4 right-4 bg-black/70 hover:bg-black/90 text-white p-3 rounded-lg backdrop-blur-sm transition-all z-10"
                                            title="Pantalla completa"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                            </svg>
                                        </button>
                                    </>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-white">
                                        <div className="text-center p-4">
                                            <p className="text-base md:text-lg mb-2">No hay transmisión configurada</p>
                                            <p className="text-xs md:text-sm text-gray-400">
                                                Configura la URL del stream en la edición de la clase
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Control panel - resto de la pantalla en móvil */}
                        <div className="flex-1 flex flex-col bg-background md:bg-muted/30 md:rounded-lg overflow-hidden min-h-0">
                            <Tabs defaultValue="chat" className="flex-1 flex flex-col min-h-0">
                                <TabsList className="grid w-full grid-cols-3 shrink-0 rounded-none md:rounded-lg">
                                    <TabsTrigger value="chat">
                                        <MessageSquare className="h-4 w-4 mr-2" />
                                        Chat ({messages.length})
                                    </TabsTrigger>
                                    <TabsTrigger value="users">
                                        <Users className="h-4 w-4 mr-2" />
                                        Usuarios ({connectedUsers.length})
                                    </TabsTrigger>
                                    <TabsTrigger value="ratings">
                                        <Star className="h-4 w-4 mr-2" />
                                        Calificaciones ({ratings.length})
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 mt-0">
                                    <div className="p-2 md:p-3 border-b bg-background shrink-0">
                                        <div className="flex gap-1 md:gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={handleMuteAll}
                                                className="flex-1 text-xs md:text-sm"
                                            >
                                                <MicOff className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                                                <span className="hidden sm:inline">Silenciar todos</span>
                                                <span className="sm:hidden">Todos</span>
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={handleUnmuteAll}
                                                className="flex-1 text-xs md:text-sm"
                                            >
                                                <Mic className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                                                <span className="hidden sm:inline">Activar todos</span>
                                                <span className="sm:hidden">Todos</span>
                                            </Button>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="default"
                                            onClick={handleAnalyzeDoubts}
                                            disabled={isAnalyzing || messages.length === 0}
                                            className="w-full mt-2 text-xs md:text-sm"
                                        >
                                            {isAnalyzing ? (
                                                <>
                                                    <Loader2 className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2 animate-spin" />
                                                    Analizando...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                                                    <span className="hidden sm:inline">Analizar Dudas con IA</span>
                                                    <span className="sm:hidden">IA Dudas</span>
                                                </>
                                            )}
                                        </Button>
                                    </div>

                                    <ScrollArea className="flex-1 p-2 md:p-4" ref={scrollRef}>
                                        <div className="space-y-2 md:space-y-3">
                                            {messages.length === 0 ? (
                                                <p className="text-center text-muted-foreground text-xs md:text-sm py-4 md:py-8">
                                                    No hay mensajes aún
                                                </p>
                                            ) : (
                                                messages.map((msg) => (
                                                    <div key={msg.id} className="flex gap-2">
                                                        {msg.userAvatar ? (
                                                            <img src={msg.userAvatar} alt={msg.userName} className="w-6 h-6 md:w-8 md:h-8 rounded-full shrink-0" />
                                                        ) : (
                                                            <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                                <span className="text-xs font-semibold">{msg.userName.charAt(0).toUpperCase()}</span>
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs md:text-sm font-semibold">{msg.userName}</span>
                                                                {mutedUsers.includes(msg.userId) && (
                                                                    <Badge variant="destructive" className="text-xs">Silenciado</Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-xs md:text-sm break-words">{msg.message}</p>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </ScrollArea>

                                    <div className="p-2 md:p-3 border-t bg-background shrink-0">
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="Escribe un mensaje..."
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                                className="text-sm"
                                            />
                                            <Button size="icon" onClick={handleSendMessage} disabled={!newMessage.trim()}>
                                                <Send className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="users" className="flex-1 min-h-0 mt-0">
                                    <ScrollArea className="h-full p-2 md:p-4">
                                        <div className="space-y-2">
                                            {connectedUsers.length === 0 ? (
                                                <p className="text-center text-muted-foreground text-xs md:text-sm py-4 md:py-8">
                                                    No hay usuarios inscritos
                                                </p>
                                            ) : (
                                                connectedUsers.map((user) => {
                                                    const isMuted = mutedUsers.includes(user.id);
                                                    return (
                                                        <div key={user.id} className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-background rounded-lg">
                                                            {user.avatar ? (
                                                                <img src={user.avatar} alt={user.name} className="w-8 h-8 md:w-10 md:h-10 rounded-full" />
                                                            ) : (
                                                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                                    <span className="text-xs md:text-sm font-semibold">{user.name.charAt(0).toUpperCase()}</span>
                                                                </div>
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-semibold text-xs md:text-sm truncate">{user.name}</p>
                                                                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                variant={isMuted ? 'default' : 'outline'}
                                                                onClick={() => handleToggleMute(user.id)}
                                                                className="text-xs"
                                                            >
                                                                {isMuted ? (
                                                                    <>
                                                                        <Mic className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                                                                        <span className="hidden md:inline">Activar</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <MicOff className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                                                                        <span className="hidden md:inline">Silenciar</span>
                                                                    </>
                                                                )}
                                                            </Button>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </ScrollArea>
                                </TabsContent>

                                <TabsContent value="ratings" className="flex-1 min-h-0 mt-0">
                                    <div className="p-2 border-b">
                                        <Button
                                            variant="destructive"
                                            className="w-full"
                                            onClick={handleFinishClass}
                                            disabled={classItem?.classDetails?.status === 'finished'}
                                        >
                                            <StopCircle className="mr-2 h-4 w-4" />
                                            {classItem?.classDetails?.status === 'finished' ? 'Clase Finalizada' : 'Finalizar Clase'}
                                        </Button>
                                    </div>
                                    <ScrollArea className="h-full p-2 md:p-4">
                                        {ratings.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                                                <Info className="h-8 w-8 text-muted-foreground mb-2" />
                                                <p className="text-muted-foreground text-sm">Aún no hay calificaciones para esta clase.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {ratings.map((rating) => (
                                                    <div key={rating.id} className="bg-muted/30 p-4 rounded-lg border space-y-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                                                                {rating.userAvatar ? (
                                                                    <img src={rating.userAvatar} alt={rating.userName} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span className="text-xs font-bold">{rating.userName.charAt(0)}</span>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-sm">{rating.userName}</p>
                                                                <p className="text-xs text-muted-foreground">Alumno</p>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                                            <div className="flex justify-between">
                                                                <span>Enseñanza:</span>
                                                                <div className="flex text-yellow-500"><Star className="w-3 h-3 fill-current" /> {rating.ratings.teachingQuality}</div>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span>Claridad:</span>
                                                                <div className="flex text-yellow-500"><Star className="w-3 h-3 fill-current" /> {rating.ratings.topicClarity}</div>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span>Material:</span>
                                                                <div className="flex text-yellow-500"><Star className="w-3 h-3 fill-current" /> {rating.ratings.supportMaterial}</div>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span>General:</span>
                                                                <div className="flex text-yellow-500"><Star className="w-3 h-3 fill-current" /> {rating.ratings.generalExperience}</div>
                                                            </div>
                                                        </div>

                                                        {rating.comment && (
                                                            <div className="bg-background p-3 rounded text-sm text-foreground/90 italic">
                                                                "{rating.comment}"
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </ScrollArea>
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>
                </DialogContent>
            </Dialog >

            {/* Modal de resultados de análisis IA */}
            < Dialog open={showAnalysisModal} onOpenChange={setShowAnalysisModal} >
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-yellow-500" />
                            Análisis de Dudas con IA
                        </DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh]">
                        <div className="space-y-4 p-1">
                            {analysisResult.length === 0 ? (
                                <p className="text-muted-foreground text-center py-8">No se encontraron dudas</p>
                            ) : (
                                <>
                                    <p className="text-sm text-muted-foreground">
                                        La IA identificó las siguientes dudas comunes entre los estudiantes:
                                    </p>
                                    {analysisResult.map((doubt, index) => (
                                        <div key={index} className="p-4 bg-muted/50 rounded-lg border">
                                            <div className="flex items-start gap-3">
                                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                                                    {index + 1}
                                                </div>
                                                <p className="flex-1 text-sm">{doubt}</p>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </ScrollArea>
                    <div className="flex justify-end">
                        <Button onClick={() => setShowAnalysisModal(false)}>Cerrar</Button>
                    </div>
                </DialogContent>
            </Dialog >
        </>
    );
}
