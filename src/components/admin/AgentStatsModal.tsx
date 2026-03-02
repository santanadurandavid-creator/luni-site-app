
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Card, CardContent, CardHeader, CardTitle as CardTitleComponent } from '../ui/card';
import { Smile, Clock, Ticket } from 'lucide-react';
import type { User } from '@/lib/types';

interface AgentStats {
    avgCsat: number;
    avgHandleTime: number;
    totalTickets: number;
}

interface AgentStatsModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  agent: User;
  stats: AgentStats;
}

const StatCard = ({ title, value, icon: Icon }: { title: string, value: string, icon: React.ElementType }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitleComponent className="text-sm font-medium">{title}</CardTitleComponent>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
)

export function AgentStatsModal({ isOpen, setIsOpen, agent, stats }: AgentStatsModalProps) {
  if (!agent) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-[95vw] max-w-lg rounded-lg">
        <DialogHeader className="items-center text-center">
            <Avatar className="h-20 w-20 mb-4">
                <AvatarImage src={agent.avatar} />
                <AvatarFallback>{agent.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <DialogTitle className="font-headline text-2xl">{agent.name}</DialogTitle>
            <DialogDescription>
                Métricas de rendimiento para este agente.
            </DialogDescription>
        </DialogHeader>
        <div className="py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard title="CSAT Promedio" value={stats.avgCsat.toFixed(1)} icon={Smile} />
            <StatCard title="Tiempo Cierre Prom." value={`~${stats.avgHandleTime.toFixed(0)} min`} icon={Clock} />
            <StatCard title="Tickets Resueltos" value={stats.totalTickets.toString()} icon={Ticket} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
