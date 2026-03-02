

'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MessageSquare, Loader2, Circle, UserPlus, CheckCheck, Redo, Shield, User, Clock } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import type { SupportTicket, User as UserType } from "@/lib/types";
import { getFirebaseServices } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, doc, getDoc, updateDoc, where, getDocs, limit } from "firebase/firestore";
import { formatDistanceToNow, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatConversation } from "@/components/shared/ChatConversation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader, DialogContent, DialogTitle as DialogTitleComponent, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DynamicAgentStatsModal } from "@/components/shared/dynamic";
import { Badge } from "@/components/ui/badge";


interface TicketWithUserData extends SupportTicket {
    userName: string;
    userAvatar?: string;
}

const AssignTicketModal = ({ ticket, supportUsers, isOpen, setIsOpen }: { ticket: TicketWithUserData, supportUsers: UserType[], isOpen: boolean, setIsOpen: (open: boolean) => void }) => {
    const [selectedSupportId, setSelectedSupportId] = useState(ticket.assignedTo || '');
    const { toast } = useToast();

    const handleAssign = async () => {
        try {
            const { db } = getFirebaseServices();
            await updateDoc(doc(db, 'supportTickets', ticket.id), {
                assignedTo: selectedSupportId
            });
            toast({ title: 'Ticket Asignado', description: 'El ticket ha sido asignado correctamente.' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo asignar el ticket.' });
        } finally {
            setIsOpen(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitleComponent>Asignar Ticket</DialogTitleComponent>
                    <DialogDescription>Asigna este ticket a un miembro del equipo de soporte.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Select value={selectedSupportId} onValueChange={setSelectedSupportId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccionar usuario de soporte..." />
                        </SelectTrigger>
                        <SelectContent>
                            {supportUsers.map(user => (
                                <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="ghost">Cancelar</Button></DialogClose>
                    <Button onClick={handleAssign}>Asignar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

interface AgentStats {
    avgCsat: number;
    avgHandleTime: number;
    totalTickets: number;
}


const AgentsView = ({ onAgentClick }: { onAgentClick: (agent: UserType, stats: AgentStats) => void}) => {
    const [agents, setAgents] = useState<UserType[]>([]);
    const [stats, setStats] = useState<Record<string, AgentStats>>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const { db } = getFirebaseServices();
        const agentsQuery = query(collection(db, 'users'), where('role', 'in', ['support', 'admin', 'supervisor_support']));
        const ticketsQuery = query(collection(db, 'supportTickets'), where('status', '==', 'closed'));
        
        const unsubAgents = onSnapshot(agentsQuery, (snapshot) => {
            setAgents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserType)));
        });

        const unsubTickets = onSnapshot(ticketsQuery, (snapshot) => {
            const tickets = snapshot.docs.map(doc => doc.data() as SupportTicket);
            const agentStats: Record<string, { csatScores: number[], handleTimes: number[], ticketCount: number }> = {};

            tickets.forEach(ticket => {
                if (ticket.assignedTo) {
                    if (!agentStats[ticket.assignedTo]) {
                        agentStats[ticket.assignedTo] = { csatScores: [], handleTimes: [], ticketCount: 0 };
                    }
                    agentStats[ticket.assignedTo].ticketCount++;
                    if (ticket.csat) {
                        agentStats[ticket.assignedTo].csatScores.push(ticket.csat.rating);
                    }
                    if (ticket.createdAt && ticket.updatedAt) {
                        const handleTime = differenceInMinutes(ticket.updatedAt.toDate(), ticket.createdAt.toDate());
                        agentStats[ticket.assignedTo].handleTimes.push(handleTime);
                    }
                }
            });
            
            const finalStats: Record<string, AgentStats> = {};
            Object.keys(agentStats).forEach(agentId => {
                const data = agentStats[agentId];
                const avgCsat = data.csatScores.length > 0 ? data.csatScores.reduce((a, b) => a + b, 0) / data.csatScores.length : 0;
                const avgHandleTime = data.handleTimes.length > 0 ? data.handleTimes.reduce((a, b) => a + b, 0) / data.handleTimes.length : 0;
                finalStats[agentId] = { avgCsat, avgHandleTime, totalTickets: data.ticketCount };
            });

            setStats(finalStats);
            setIsLoading(false);
        });

        return () => {
            unsubAgents();
            unsubTickets();
        };
    }, []);

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    if (agents.length === 0) {
        return <p className="text-center text-muted-foreground py-4">No hay agentes de soporte.</p>;
    }

    return (
        <div className="space-y-2 p-4">
            {agents.map(agent => (
                 <button 
                    key={agent.id} 
                    className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors flex items-center gap-3"
                    onClick={() => onAgentClick(agent, stats[agent.id] || { avgCsat: 0, avgHandleTime: 0, totalTickets: 0 })}
                >
                    <Avatar><AvatarImage src={agent.avatar} /><AvatarFallback>{agent.name.charAt(0)}</AvatarFallback></Avatar>
                    <div className="flex-1">
                        <p className="font-semibold">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">{agent.email}</p>
                    </div>
                     {agent.isAdmin && <Badge><Shield className="mr-2 h-3 w-3"/>Admin</Badge>}
                </button>
            ))}
        </div>
    );
};


export default function AdminSupportPage() {
    const { user } = useAuth();
    const [tickets, setTickets] = useState<TicketWithUserData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<TicketWithUserData | null>(null);
    const [userCache, setUserCache] = useState<Record<string, UserType>>({});
    const [supportUsers, setSupportUsers] = useState<UserType[]>([]);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isAgentStatsModalOpen, setIsAgentStatsModalOpen] = useState(false);
    const [selectedAgentStats, setSelectedAgentStats] = useState<{ agent: UserType, stats: AgentStats} | null>(null);

    useEffect(() => {
        if (!user || !user.role) {
            setIsLoading(false);
            return;
        }

        const { db } = getFirebaseServices();
        let q;
        
        if (user.role === 'support') {
            q = query(collection(db, "supportTickets"), where('assignedTo', 'in', [null, user.id]), where('status', '==', 'open'), orderBy("updatedAt", "desc"));
        } else if (user.role === 'supervisor_support' || user.role === 'admin') {
             q = query(collection(db, "supportTickets"), orderBy("updatedAt", "desc"));
        } else {
            setIsLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const ticketsPromise = snapshot.docs.map(async (ticketDoc) => {
                const ticket = { id: ticketDoc.id, ...ticketDoc.data() } as SupportTicket;
                
                let ticketUser = userCache[ticket.userId];
                if (!ticketUser) {
                    const userRef = doc(db, 'users', ticket.userId);
                    const userSnap = await getDoc(userRef);
                    if(userSnap.exists()){
                        ticketUser = {id: userSnap.id, ...userSnap.data()} as UserType;
                        setUserCache(prev => ({...prev, [ticket.userId]: ticketUser}));
                    }
                }
                
                return {
                    ...ticket,
                    userName: ticketUser?.name || 'Usuario Eliminado',
                    userAvatar: ticketUser?.avatar,
                };
            });
            const resolvedTickets = await Promise.all(ticketsPromise);
            
            setTickets(resolvedTickets);

            if (selectedTicket) {
                const updatedSelected = resolvedTickets.find(t => t.id === selectedTicket.id);
                setSelectedTicket(updatedSelected || null);
            }
            
            setIsLoading(false);
        });

        const usersQuery = collection(db, 'users');
        const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
            const allUsers = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}) as UserType);
            setSupportUsers(allUsers.filter(u => u.role === 'support' || u.isAdmin || u.role === 'supervisor_support'));
        });

        return () => {
            unsubscribe();
            unsubscribeUsers();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.role, user?.id]);
    
    const handleAgentClick = (agent: UserType, stats: AgentStats) => {
        setSelectedAgentStats({ agent, stats });
        setIsAgentStatsModalOpen(true);
    };

    const openTickets = useMemo(() => tickets.filter(t => t.status === 'open'), [tickets]);
    const closedTickets = useMemo(() => tickets.filter(t => t.status === 'closed'), [tickets]);
    
    const canViewClosed = user?.role === 'admin' || user?.role === 'supervisor_support';
    const canViewAgents = user?.role === 'admin' || user?.role === 'supervisor_support';


    const handleTicketSelect = (ticket: TicketWithUserData) => {
        setSelectedTicket(ticket);
    };
      
    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    if (user && !user.isAdmin && user.role !== 'support' && user.role !== 'supervisor_support') {
        return <p>No tienes acceso a esta sección.</p>;
    }
    
    const TicketList = ({ list }: { list: TicketWithUserData[] }) => (
        <ScrollArea className="h-full px-4">
            {list.length > 0 ? list.map(ticket => {
                const hasUnread = user && ticket.messages.some(m => m.senderId !== 'admin' && !m.readBy?.includes('admin'));
                return (
                    <button key={ticket.id} onClick={() => handleTicketSelect(ticket)} className={cn("w-full text-left p-3 rounded-lg border flex items-start gap-3 transition-colors mb-2", selectedTicket?.id === ticket.id ? 'bg-muted' : 'hover:bg-muted')}>
                        <Avatar className="mt-1">
                            <AvatarImage src={ticket.userAvatar} />
                            <AvatarFallback>{ticket.userName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 overflow-hidden">
                            <p className="font-semibold text-sm">{ticket.userName}</p>
                            <p className="text-xs text-muted-foreground truncate">{ticket.lastMessage}</p>
                            <div className="text-xs text-muted-foreground whitespace-nowrap mt-1">
                                {ticket.updatedAt ? formatDistanceToNow(ticket.updatedAt.toDate(), { locale: es, addSuffix: true }) : 'Ahora mismo'}
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            {hasUnread && <Circle className="h-2.5 w-2.5 text-primary fill-primary" />}
                        </div>
                    </button>
                )
            }) : <p className="text-muted-foreground text-center py-4">No hay tickets en esta sección.</p>}
        </ScrollArea>
    );

    const tabsGridClass = cn(
        'grid w-full', {
        'grid-cols-1': !canViewClosed && !canViewAgents,
        'grid-cols-2': (canViewClosed && !canViewAgents) || (!canViewClosed && canViewAgents),
        'grid-cols-3': canViewClosed && canViewAgents,
    });


    return (
        <div className="grid grid-cols-1 md:grid-cols-[350px_1fr] gap-6 h-[calc(100vh-8rem)]">
             <Card className="h-full flex flex-col col-span-1">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare />
                        Tickets de Soporte
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-grow p-0 overflow-hidden">
                    <Tabs defaultValue="open" className="h-full flex flex-col">
                         <TabsList className={tabsGridClass}>
                            <TabsTrigger value="open">Abiertos ({openTickets.length})</TabsTrigger>
                            {canViewClosed && <TabsTrigger value="closed">Cerrados ({closedTickets.length})</TabsTrigger>}
                            {canViewAgents && <TabsTrigger value="agents">Agentes</TabsTrigger>}
                        </TabsList>
                        <TabsContent value="open" className="flex-grow overflow-hidden">
                            <TicketList list={openTickets} />
                        </TabsContent>
                        <TabsContent value="closed" className="flex-grow overflow-hidden">
                            {canViewClosed && <TicketList list={closedTickets} />}
                        </TabsContent>
                        <TabsContent value="agents" className="flex-grow overflow-hidden">
                            {canViewAgents && <AgentsView onAgentClick={handleAgentClick} />}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <div className="h-full col-span-1 overflow-hidden">
                 {selectedTicket && user ? (
                     <Card className="h-full">
                        <ChatConversation 
                            ticket={selectedTicket}
                            sender="admin"
                            currentUserId="admin" // All support/admin users act as 'admin'
                            onAssignClick={() => setIsAssignModalOpen(true)}
                        />
                     </Card>
                ) : (
                    <Card className="h-full flex items-center justify-center bg-muted/20">
                        <div className="text-center text-muted-foreground">
                            <MessageSquare className="mx-auto h-12 w-12 mb-4"/>
                            <p className="font-semibold">Selecciona una conversación</p>
                            <p className="text-sm">Elige un ticket de la lista para ver los mensajes.</p>
                        </div>
                    </Card>
                )}
            </div>

            {selectedTicket && isAssignModalOpen && (
                <AssignTicketModal
                    ticket={selectedTicket}
                    supportUsers={supportUsers}
                    isOpen={isAssignModalOpen}
                    setIsOpen={setIsAssignModalOpen}
                />
            )}
            
            {selectedAgentStats && (
                <DynamicAgentStatsModal
                    isOpen={isAgentStatsModalOpen}
                    setIsOpen={setIsAgentStatsModalOpen}
                    agent={selectedAgentStats.agent}
                    stats={selectedAgentStats.stats}
                />
            )}
        </div>
    )
}
