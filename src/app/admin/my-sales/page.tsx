'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, DollarSign, Users, LineChart, ShoppingBag, Plus, Search, CheckCircle, Trash2, AlertTriangle, X } from 'lucide-react';
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sale, User as UserType } from '@/lib/types';

export default function MySalesPage() {
    const { user: currentUser } = useAuth();
    const { toast } = useToast();
    const [sales, setSales] = useState<Sale[]>([]);
    const [allUsers, setAllUsers] = useState<UserType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({ totalAmount: 0, totalUsers: 0 });

    // Modal states
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [saleItem, setSaleItem] = useState('');
    const [saleAmount, setSaleAmount] = useState('');
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [saleToDelete, setSaleToDelete] = useState<{ id: string; buyerName: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteInput, setDeleteInput] = useState('');

    const fetchSales = async () => {
        if (!currentUser) return;
        setIsLoading(true);
        try {
            const { db } = getFirebaseServices();
            const salesRef = collection(db, 'sales');
            const q = query(
                salesRef,
                where('sellerId', '==', currentUser.id),
                orderBy('createdAt', 'desc')
            );

            const querySnapshot = await getDocs(q);
            const salesList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt
            })) as Sale[];

            const totalAmount = salesList.reduce((sum, s) => sum + (s.amount || 0), 0);
            const uniqueUsers = new Set(salesList.map(s => s.buyerId)).size;

            setSales(salesList);
            setStats({ totalAmount, totalUsers: uniqueUsers });
        } catch (error) {
            console.error("Error fetching personal sales:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const { db } = getFirebaseServices();
            const usersRef = collection(db, 'users');
            const snapshot = await getDocs(usersRef);
            const usersList = snapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name || 'Sin nombre',
                email: doc.data().email || 'Sin email'
            }));
            setAllUsers(usersList as UserType[]);
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    useEffect(() => {
        fetchSales();
        fetchUsers();
    }, [currentUser]);

    const handleRegisterSale = async () => {
        if (!selectedUserId || !saleItem || !saleAmount || parseFloat(saleAmount) <= 0) {
            toast({
                variant: 'destructive',
                title: 'Campos incompletos',
                description: 'Por favor selecciona un usuario y completa los detalles de la venta.'
            });
            return;
        }

        setIsSaving(true);
        try {
            const { db } = getFirebaseServices();
            const selectedUser = allUsers.find(u => u.id === selectedUserId);

            await addDoc(collection(db, 'sales'), {
                sellerId: currentUser?.id,
                sellerName: currentUser?.name || 'Vendedor',
                buyerId: selectedUserId,
                buyerName: selectedUser?.name || 'Comprador',
                buyerEmail: selectedUser?.email || '',
                amount: parseFloat(saleAmount),
                item: saleItem,
                createdAt: serverTimestamp(),
            });

            toast({
                title: 'Venta registrada',
                description: `Se registró con éxito la venta para ${selectedUser?.name}.`
            });

            // Reset modal state
            setIsRegisterModalOpen(false);
            setSelectedUserId('');
            setSaleItem('');
            setSaleAmount('');
            setUserSearchTerm('');

            // Refresh sales list
            fetchSales();
        } catch (error) {
            console.error("Error registering sale:", error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudo registrar la venta. Intenta de nuevo.'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteSale = (saleId: string, buyerName: string) => {
        setSaleToDelete({ id: saleId, buyerName });
        setDeleteInput('');
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteSale = async () => {
        if (!saleToDelete || deleteInput !== 'eliminar') return;

        setIsDeleting(true);
        try {
            const { db } = getFirebaseServices();
            await deleteDoc(doc(db, 'sales', saleToDelete.id));

            toast({
                title: 'Venta eliminada',
                description: `La venta para ${saleToDelete.buyerName} ha sido eliminada exitosamente.`
            });

            // Refresh sales list
            fetchSales();
            setIsDeleteModalOpen(false);
            setSaleToDelete(null);
            setDeleteInput('');
        } catch (error) {
            console.error("Error deleting sale:", error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudo eliminar la venta. Intenta de nuevo.'
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredUsers = allUsers.filter(u =>
        u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearchTerm.toLowerCase())
    ).slice(0, 50); // Limit to 50 for performance

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] space-y-6 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold font-headline">Mis Ventas Logradas</h1>
                    <p className="text-muted-foreground">Aquí puedes ver el resumen de tus ventas y el total acumulado.</p>
                </div>
                <Button
                    onClick={() => setIsRegisterModalOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-11 px-6 shadow-lg shadow-emerald-600/20"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Registrar Venta
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 shrink-0">
                <Card className="bg-emerald-50/50 border-emerald-200 shadow-none">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-700">Monto Total</CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-24" />
                        ) : (
                            <div className="text-3xl font-bold text-emerald-600">${stats.totalAmount.toLocaleString()}</div>
                        )}
                        <p className="text-xs text-emerald-600/70 mt-1">Ingresos totales generados</p>
                    </CardContent>
                </Card>

                <Card className="bg-blue-50/50 border-blue-200 shadow-none">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-700">Clientes Únicos</CardTitle>
                        <Users className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-24" />
                        ) : (
                            <div className="text-3xl font-bold text-blue-600">{stats.totalUsers}</div>
                        )}
                        <p className="text-xs text-blue-600/70 mt-1">Usuarios distintos con compras</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="flex-1 min-h-0 border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden flex flex-col">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-8 py-4 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
                            <LineChart className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold font-headline">Historial de Ventas</CardTitle>
                            <CardDescription className="text-[11px]">Lista detallada de todas tus transacciones registradas.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-hidden">
                    <ScrollArea className="h-full px-8 py-6">
                        <div className="space-y-4">
                            {isLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="h-20 bg-muted/50 rounded-2xl animate-pulse" />
                                ))
                            ) : sales.length > 0 ? (
                                sales.map((sale) => (
                                    <div key={sale.id} className="p-5 border rounded-2xl bg-card hover:border-emerald-200 transition-all shadow-sm flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <ShoppingBag className="h-6 w-6 text-emerald-600" />
                                            </div>
                                            <div className="flex flex-col">
                                                <p className="font-bold text-slate-800 text-lg">{sale.buyerName}</p>
                                                <p className="text-sm text-muted-foreground">{sale.item}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="text-2xl font-black text-emerald-600">${sale.amount}</p>
                                                <p className="text-xs text-muted-foreground font-medium mt-1">
                                                    {sale.createdAt?.toDate ? format(sale.createdAt.toDate(), 'd MMMM, yyyy - HH:mm', { locale: es }) : ''}
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteSale(sale.id!, sale.buyerName)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                title="Eliminar venta"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                                    <ShoppingBag className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                    <p className="text-slate-500 font-medium italic">Aún no has registrado ninguna venta.</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Registration Modal */}
            <Dialog open={isRegisterModalOpen} onOpenChange={setIsRegisterModalOpen}>
                <DialogContent className="max-w-md p-0 overflow-hidden border-none bg-background rounded-3xl shadow-2xl">
                    <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600" />
                    <DialogHeader className="p-8 pb-0">
                        <DialogTitle className="text-2xl font-bold font-headline flex items-center gap-2">
                            <ShoppingBag className="h-6 w-6 text-emerald-600" />
                            Registrar Venta
                        </DialogTitle>
                        <DialogDescription>Completa los detalles de la venta realizada.</DialogDescription>
                    </DialogHeader>

                    <div className="p-8 space-y-6">
                        <div className="space-y-3">
                            <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground ml-1">Seleccionar Cliente</Label>
                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por nombre o email..."
                                    value={userSearchTerm}
                                    onChange={(e) => setUserSearchTerm(e.target.value)}
                                    className="h-11 pl-10 rounded-xl bg-slate-50 border-none focus-visible:ring-emerald-500"
                                />
                            </div>

                            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                <SelectTrigger className="h-12 rounded-xl border-slate-200">
                                    <SelectValue placeholder="Elegir usuario de la lista..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {filteredUsers.length > 0 ? (
                                        filteredUsers.map(u => (
                                            <SelectItem key={u.id} value={u.id} className="rounded-lg">
                                                <div className="flex flex-col items-start py-0.5">
                                                    <span className="font-bold">{u.name}</span>
                                                    <span className="text-[10px] text-muted-foreground">{u.email}</span>
                                                </div>
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center text-xs text-muted-foreground">No se encontraron usuarios</div>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground ml-1">Producto / Servicio</Label>
                            <Input
                                placeholder="Ej: Premium Anual"
                                value={saleItem}
                                onChange={(e) => setSaleItem(e.target.value)}
                                className="h-12 rounded-xl border-slate-200 focus-visible:ring-emerald-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground ml-1">Costo de la Venta (MXN)</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={saleAmount}
                                    onChange={(e) => setSaleAmount(e.target.value)}
                                    className="h-14 pl-10 text-xl font-bold rounded-xl border-slate-200 focus-visible:ring-emerald-500"
                                />
                            </div>
                        </div>

                        <Button
                            className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02]"
                            onClick={handleRegisterSale}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <span className="flex items-center gap-2">
                                    <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                                    Guardando...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5" />
                                    Confirmar Registro
                                </span>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal - Updated to exact style from screenshot */}
            <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <AlertDialogContent className="max-w-[400px] rounded-[32px] p-8 border-none bg-white shadow-2xl">
                    <AlertDialogHeader className="space-y-3 text-left">
                        <AlertDialogTitle className="text-2xl font-bold font-headline text-slate-900 leading-tight">
                            ¿Estás seguro de que quieres eliminar?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-500 text-sm font-medium leading-relaxed">
                            Esta acción es permanente y no se puede deshacer. Para confirmar, escribe <span className="font-bold text-slate-700">eliminar</span> debajo.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="py-4">
                        <Input
                            value={deleteInput}
                            onChange={(e) => setDeleteInput(e.target.value.toLowerCase())}
                            placeholder="eliminar"
                            className="h-14 bg-slate-50/50 border-slate-100 rounded-2xl px-6 text-base focus-visible:ring-red-200 transition-all font-medium"
                        />
                    </div>

                    <AlertDialogFooter className="flex-row justify-end gap-3 mt-2">
                        <AlertDialogCancel className="h-12 px-6 rounded-2xl border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all mt-0">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                confirmDeleteSale();
                            }}
                            disabled={deleteInput !== 'eliminar' || isDeleting}
                            className={cn(
                                "h-12 px-6 rounded-2xl font-bold transition-all shadow-lg",
                                deleteInput === 'eliminar'
                                    ? "bg-red-400 hover:bg-red-500 text-white shadow-red-200"
                                    : "bg-red-200 text-white shadow-none cursor-not-allowed"
                            )}
                        >
                            {isDeleting ? "Borrando..." : "Confirmar y Eliminar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
