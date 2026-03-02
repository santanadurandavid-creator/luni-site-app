'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    ClipboardList,
    Plus,
    Clock,
    CheckCircle2,
    AlertCircle,
    Calendar,
    User as UserIcon,
    MoreVertical,
    Trash2,
    CheckCircle,
    MessageSquare,
    BarChart3,
    Search,
    Filter,
    ArrowRight,
    TrendingUp
} from 'lucide-react';
import {
    collection,
    query,
    where,
    orderBy,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    deleteDoc,
    serverTimestamp,
    onSnapshot
} from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { StaffTask, User as UserType, TaskStatus, TaskPriority, UserRole } from '@/lib/types';
import { Progress } from '@/components/ui/progress';

export default function TasksPage() {
    const { user: currentUser } = useAuth();
    const { toast } = useToast();
    const [tasks, setTasks] = useState<StaffTask[]>([]);
    const [staffUsers, setStaffUsers] = useState<UserType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');

    // Admin states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSavingTask, setIsSavingTask] = useState(false);
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        assignedToId: '',
        priority: 'medium' as TaskPriority,
        dueDate: ''
    });

    // Staff states
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<StaffTask | null>(null);
    const [reportText, setReportText] = useState('');
    const [reportProgress, setReportProgress] = useState(0);

    const isAdmin = currentUser?.role === 'admin';

    useEffect(() => {
        if (!currentUser) return;

        const { db } = getFirebaseServices();
        const tasksRef = collection(db, 'staff_tasks');

        // Define query based on role
        let q;
        if (isAdmin) {
            q = query(tasksRef, orderBy('createdAt', 'desc'));
        } else {
            q = query(
                tasksRef,
                where('assignedToId', '==', currentUser.id),
                orderBy('createdAt', 'desc')
            );
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as StaffTask[];
            setTasks(tasksData);
            setIsLoading(false);
        });

        // If admin, also fetch staff users
        if (isAdmin) {
            const fetchStaff = async () => {
                const usersRef = collection(db, 'users');
                const staffQuery = query(usersRef, where('role', 'in', ['ventas', 'content_creator']));
                const staffSnapshot = await getDocs(staffQuery);
                const staffData = staffSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserType[];
                setStaffUsers(staffData);
            };
            fetchStaff();
        }

        return () => unsubscribe();
    }, [currentUser, isAdmin]);

    const handleCreateTask = async () => {
        if (!newTask.title || !newTask.description || !newTask.assignedToId) {
            toast({
                variant: 'destructive',
                title: 'Campos incompletos',
                description: 'Por favor completa el título, descripción y asigna a alguien.'
            });
            return;
        }

        setIsSavingTask(true);
        try {
            const { db } = getFirebaseServices();
            const assignedUser = staffUsers.find(u => u.id === newTask.assignedToId);

            await addDoc(collection(db, 'staff_tasks'), {
                title: newTask.title,
                description: newTask.description,
                assignedToId: newTask.assignedToId,
                assignedToName: assignedUser?.name || 'Usuario',
                assignedToRole: assignedUser?.role || 'normal',
                createdById: currentUser?.id,
                createdByName: currentUser?.name || 'Administrador',
                status: 'pending',
                priority: newTask.priority,
                progress: 0,
                dueDate: newTask.dueDate ? new Date(newTask.dueDate) : null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            toast({
                title: 'Tarea asignada',
                description: `Se ha asignado la tarea a ${assignedUser?.name}.`
            });

            setIsCreateModalOpen(false);
            setNewTask({ title: '', description: '', assignedToId: '', priority: 'medium', dueDate: '' });
        } catch (error) {
            console.error("Error creating task:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear la tarea.' });
        } finally {
            setIsSavingTask(false);
        }
    };

    const handleUpdateTask = async () => {
        if (!selectedTask) return;

        setIsSavingTask(true);
        try {
            const { db } = getFirebaseServices();
            const taskRef = doc(db, 'staff_tasks', selectedTask.id);

            const isCompleted = reportProgress === 100;
            const newStatus = isCompleted ? 'completed' : 'in_progress';

            await updateDoc(taskRef, {
                report: reportText,
                progress: reportProgress,
                status: newStatus,
                updatedAt: serverTimestamp()
            });

            toast({
                title: 'Tarea actualizada',
                description: isCompleted ? 'Has marcado la tarea como completada.' : 'Se ha guardado el avance de la tarea.'
            });

            setIsReportModalOpen(false);
            setSelectedTask(null);
            setReportText('');
            setReportProgress(0);
        } catch (error) {
            console.error("Error updating task:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar la tarea.' });
        } finally {
            setIsSavingTask(false);
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm('¿Estás seguro de eliminar esta tarea?')) return;

        try {
            const { db } = getFirebaseServices();
            await deleteDoc(doc(db, 'staff_tasks', taskId));
            toast({ title: 'Tarea eliminada' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la tarea.' });
        }
    };

    const filteredTasks = useMemo(() => {
        if (activeTab === 'all') return tasks;
        return tasks.filter(t => t.status === activeTab);
    }, [tasks, activeTab]);

    const stats = useMemo(() => {
        return {
            total: tasks.length,
            pending: tasks.filter(t => t.status === 'pending').length,
            inProgress: tasks.filter(t => t.status === 'in_progress').length,
            completed: tasks.filter(t => t.status === 'completed').length
        };
    }, [tasks]);

    const getStatusBadge = (status: TaskStatus) => {
        switch (status) {
            case 'pending': return <Badge variant="outline" className="text-amber-600 bg-amber-50 border-amber-200">Pendiente</Badge>;
            case 'in_progress': return <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200">En Proceso</Badge>;
            case 'completed': return <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200">Completada</Badge>;
            case 'cancelled': return <Badge variant="destructive">Cancelada</Badge>;
            default: return null;
        }
    };

    const getPriorityBadge = (priority: TaskPriority) => {
        switch (priority) {
            case 'low': return <Badge variant="outline">Baja</Badge>;
            case 'medium': return <Badge variant="outline" className="text-slate-600 bg-slate-50 border-slate-200">Media</Badge>;
            case 'high': return <Badge variant="outline" className="text-orange-600 bg-orange-50 border-orange-200">Alta</Badge>;
            case 'urgent': return <Badge variant="destructive" className="animate-pulse">Urgente</Badge>;
            default: return null;
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] space-y-6 overflow-hidden">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold font-headline text-slate-900 flex items-center gap-3">
                        <ClipboardList className="h-8 w-8 text-primary" />
                        Gestión de Tareas
                    </h1>
                    <p className="text-muted-foreground">
                        {isAdmin ? 'Asigna y monitorea las actividades del equipo de trabajo.' : 'Revisa tus tareas asignadas y reporta tus avances.'}
                    </p>
                </div>
                {isAdmin && (
                    <Button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl h-12 px-6 shadow-lg shadow-primary/20"
                    >
                        <Plus className="h-5 w-5 mr-2" />
                        Nueva Tarea
                    </Button>
                )}
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
                <Card className="bg-slate-50 border-none shadow-sm">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                            <ClipboardList className="h-5 w-5 text-slate-400" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase">Totales</p>
                            <p className="text-xl font-black text-slate-900">{stats.total}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-amber-50 border-none shadow-sm">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                            <Clock className="h-5 w-5 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-amber-600 uppercase">Pendientes</p>
                            <p className="text-xl font-black text-amber-700">{stats.pending}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-blue-50 border-none shadow-sm">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                            <BarChart3 className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-blue-600 uppercase">En Proceso</p>
                            <p className="text-xl font-black text-blue-700">{stats.inProgress}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-emerald-50 border-none shadow-sm">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-emerald-600 uppercase">Completadas</p>
                            <p className="text-xl font-black text-emerald-700">{stats.completed}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Task List Section */}
            <Card className="flex-1 min-h-0 border-none shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden flex flex-col bg-white">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-8 py-4 shrink-0 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all", activeTab === 'all' ? "bg-white shadow-sm text-primary" : "text-slate-400 hover:text-slate-600")}
                        >
                            Todas
                        </button>
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all", activeTab === 'pending' ? "bg-white shadow-sm text-amber-600" : "text-slate-400 hover:text-slate-600")}
                        >
                            Pendientes
                        </button>
                        <button
                            onClick={() => setActiveTab('in_progress')}
                            className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all", activeTab === 'in_progress' ? "bg-white shadow-sm text-blue-600" : "text-slate-400 hover:text-slate-600")}
                        >
                            En Proceso
                        </button>
                        <button
                            onClick={() => setActiveTab('completed')}
                            className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all", activeTab === 'completed' ? "bg-white shadow-sm text-emerald-600" : "text-slate-400 hover:text-slate-600")}
                        >
                            Completadas
                        </button>
                    </div>
                </CardHeader>

                <CardContent className="p-0 flex-1 overflow-hidden">
                    <ScrollArea className="h-full px-8 py-6">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {isLoading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <Skeleton key={i} className="h-48 rounded-3xl" />
                                ))
                            ) : filteredTasks.length > 0 ? (
                                filteredTasks.map((task) => (
                                    <Card key={task.id} className="group relative border-slate-100 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 rounded-[2rem] overflow-hidden bg-white">
                                        <CardHeader className="pb-3 border-b border-slate-50">
                                            <div className="flex justify-between items-start mb-2">
                                                {getPriorityBadge(task.priority)}
                                                {getStatusBadge(task.status)}
                                            </div>
                                            <CardTitle className="text-lg font-black text-slate-800 line-clamp-1">{task.title}</CardTitle>
                                            <CardDescription className="text-xs line-clamp-2 min-h-[2rem]">{task.description}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="pt-4 space-y-4">
                                            {/* Progress bar */}
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                                                    <span>Progreso</span>
                                                    <span>{task.progress}%</span>
                                                </div>
                                                <Progress value={task.progress} className="h-2 rounded-full" />
                                            </div>

                                            {/* Assignment Info */}
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-2 bg-slate-50/50 p-2 rounded-xl border border-slate-100/50">
                                                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-slate-100 shadow-sm">
                                                        <UserIcon className="h-4 w-4 text-slate-400" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">Asignado a</p>
                                                        <p className="text-xs font-bold text-slate-700 truncate">{task.assignedToName}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 bg-slate-50/50 p-2 rounded-xl border border-slate-100/50">
                                                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-slate-100 shadow-sm">
                                                        <Calendar className="h-4 w-4 text-slate-400" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">Fecha Límite</p>
                                                        <p className="text-xs font-bold text-slate-700 truncate">
                                                            {task.dueDate?.toDate ? format(task.dueDate.toDate(), 'd MMM, yyyy', { locale: es }) : 'Sin fecha'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Report indicator */}
                                            {task.report && (
                                                <div className="p-2.5 bg-primary/5 rounded-2xl border border-primary/10">
                                                    <div className="flex items-center gap-1.5 mb-1 text-primary">
                                                        <MessageSquare className="h-3 w-3" />
                                                        <span className="text-[10px] font-black uppercase">Último Reporte</span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-600 line-clamp-2 italic">"{task.report}"</p>
                                                </div>
                                            )}
                                        </CardContent>
                                        <div className="p-4 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
                                            {isAdmin ? (
                                                <>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold">
                                                        <Clock className="h-3 w-3" />
                                                        {task.createdAt?.toDate ? format(task.createdAt.toDate(), 'd MMM', { locale: es }) : ''}
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                                                        onClick={() => handleDeleteTask(task.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button
                                                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-9 rounded-xl text-xs gap-2"
                                                    onClick={() => {
                                                        setSelectedTask(task);
                                                        setReportText(task.report || '');
                                                        setReportProgress(task.progress || 0);
                                                        setIsReportModalOpen(true);
                                                    }}
                                                >
                                                    <TrendingUp className="h-4 w-4" />
                                                    Actualizar Avance
                                                </Button>
                                            )}
                                        </div>
                                    </Card>
                                ))
                            ) : (
                                <div className="col-span-full py-20 text-center">
                                    <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                                        <ClipboardList className="h-10 w-10 text-slate-200" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 mb-2">No hay tareas encontradas</h3>
                                    <p className="text-slate-400 max-w-sm mx-auto">
                                        {isAdmin ? 'Aún no has asignado ninguna tarea a tu equipo.' : 'No tienes tareas asignadas por el momento. ¡Buen trabajo!'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Admin: Create Task Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="max-w-md p-0 overflow-hidden border-none bg-background rounded-[2.5rem] shadow-2xl">
                    <div className="h-1.5 w-full bg-primary" />
                    <DialogHeader className="px-8 pt-8 pb-0">
                        <DialogTitle className="text-2xl font-black font-headline flex items-center gap-3">
                            <Plus className="h-6 w-6 text-primary" />
                            Asignar Nueva Tarea
                        </DialogTitle>
                        <DialogDescription>Define la actividad para un miembro del equipo.</DialogDescription>
                    </DialogHeader>

                    <div className="p-8 space-y-5">
                        <div className="space-y-2">
                            <Label className="font-black text-[10px] uppercase tracking-wider text-slate-400 ml-1">Miembro del Equipo</Label>
                            <Select value={newTask.assignedToId} onValueChange={(val) => setNewTask({ ...newTask, assignedToId: val })}>
                                <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-primary/20">
                                    <SelectValue placeholder="Selecciona un usuario..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl">
                                    {staffUsers.map(user => (
                                        <SelectItem key={user.id} value={user.id}>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={user.avatar} />
                                                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <span className="font-bold">{user.name}</span>
                                                <Badge className="text-[8px] h-4 bg-slate-100 text-slate-500 hover:bg-slate-100">{user.role}</Badge>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-black text-[10px] uppercase tracking-wider text-slate-400 ml-1">Título de la Actividad</Label>
                            <Input
                                placeholder="Ej: Subir 5 nuevos videos de matemáticas"
                                value={newTask.title}
                                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                className="h-12 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="font-black text-[10px] uppercase tracking-wider text-slate-400 ml-1">Descripción Detallada</Label>
                            <Textarea
                                placeholder="Explica qué se debe hacer..."
                                value={newTask.description}
                                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                className="min-h-[100px] rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="font-black text-[10px] uppercase tracking-wider text-slate-400 ml-1">Prioridad</Label>
                                <Select value={newTask.priority} onValueChange={(val: any) => setNewTask({ ...newTask, priority: val })}>
                                    <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-none">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl">
                                        <SelectItem value="low">Baja</SelectItem>
                                        <SelectItem value="medium">Media</SelectItem>
                                        <SelectItem value="high">Alta</SelectItem>
                                        <SelectItem value="urgent">Urgente</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="font-black text-[10px] uppercase tracking-wider text-slate-400 ml-1">Fecha Límite</Label>
                                <Input
                                    type="date"
                                    value={newTask.dueDate}
                                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                                    className="h-12 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                        </div>

                        <Button
                            className="w-full h-14 rounded-[1.5rem] bg-primary hover:bg-primary/90 text-white font-black text-lg shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] mt-4"
                            onClick={handleCreateTask}
                            disabled={isSavingTask}
                        >
                            {isSavingTask ? 'Creando...' : 'Asignar Tarea'}
                            <ArrowRight className="h-5 w-5 ml-2" />
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Staff: Report/Update Task Modal */}
            <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
                <DialogContent className="max-w-md p-0 overflow-hidden border-none bg-background rounded-[2.5rem] shadow-2xl">
                    <div className="h-1.5 w-full bg-blue-500" />
                    <DialogHeader className="px-8 pt-8 pb-0">
                        <DialogTitle className="text-2xl font-black font-headline flex items-center gap-3">
                            <TrendingUp className="h-6 w-6 text-blue-500" />
                            Reportar Avance
                        </DialogTitle>
                        <DialogDescription>Actualiza el estado de tu tarea asignada.</DialogDescription>
                    </DialogHeader>

                    <div className="p-8 space-y-6">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Tarea</p>
                            <p className="font-bold text-slate-800">{selectedTask?.title}</p>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-end">
                                <Label className="font-black text-[10px] uppercase tracking-wider text-slate-400 ml-1">Progreso Actual</Label>
                                <span className="text-2xl font-black text-blue-600">{reportProgress}%</span>
                            </div>
                            <Input
                                type="range"
                                min="0"
                                max="100"
                                value={reportProgress}
                                onChange={(e) => setReportProgress(parseInt(e.target.value))}
                                className="h-6 accent-blue-600"
                            />
                            <div className="flex justify-between text-[10px] font-bold text-slate-400">
                                <span>0%</span>
                                <span>25%</span>
                                <span>50%</span>
                                <span>75%</span>
                                <span>100%</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-black text-[10px] uppercase tracking-wider text-slate-400 ml-1">Reporte / Comentarios</Label>
                            <Textarea
                                placeholder="Escribe un breve resumen de lo que has hecho..."
                                value={reportText}
                                onChange={(e) => setReportText(e.target.value)}
                                className="min-h-[120px] rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>

                        <Button
                            className={cn(
                                "w-full h-14 rounded-[1.5rem] text-white font-black text-lg shadow-xl transition-all hover:scale-[1.02]",
                                reportProgress === 100 ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20" : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
                            )}
                            onClick={handleUpdateTask}
                            disabled={isSavingTask}
                        >
                            {isSavingTask ? 'Guardando...' : reportProgress === 100 ? 'Marcar como Completada' : 'Guardar Avance'}
                            {reportProgress === 100 ? <CheckCircle className="h-5 w-5 ml-2" /> : <ArrowRight className="h-5 w-5 ml-2" />}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
