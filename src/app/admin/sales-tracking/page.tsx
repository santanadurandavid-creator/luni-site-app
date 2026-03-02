
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, DollarSign, Users, LineChart, ShoppingBag, Search, ChevronRight, User, Calendar, Coins, History, Crown } from 'lucide-react';
import { collection, query, where, orderBy, getDocs, onSnapshot } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sale, User as UserType } from '@/lib/types';

export default function SalesTrackingPage() {
    const { user: currentUser } = useAuth();
    const [salespeople, setSalespeople] = useState<UserType[]>([]);
    const [allSales, setAllSales] = useState<Sale[]>([]);
    const [allActions, setAllActions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'sales' | 'actions'>('sales');

    useEffect(() => {
        const { db } = getFirebaseServices();

        // Fetch all sales
        const salesUnsubscribe = onSnapshot(collection(db, 'sales'), (snapshot) => {
            const salesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Sale[];
            setAllSales(salesData);
        });

        // Fetch all staff actions (premium/tokens given)
        const actionsUnsubscribe = onSnapshot(collection(db, 'staff_actions'), (snapshot) => {
            const actionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllActions(actionsData);
        });

        // Fetch all users with role 'ventas' or 'admin'
        const usersUnsubscribe = onSnapshot(query(collection(db, 'users'), where('role', 'in', ['admin', 'ventas'])), (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserType[];
            setSalespeople(usersData);
            setIsLoading(false);
        });

        return () => {
            salesUnsubscribe();
            actionsUnsubscribe();
            usersUnsubscribe();
        };
    }, []);

    const salesStats = useMemo(() => {
        const stats: Record<string, any> = {};

        allSales.forEach(sale => {
            const sellerId = sale.sellerId;
            if (!sellerId) return;

            if (!stats[sellerId]) {
                stats[sellerId] = {
                    totalAmount: 0,
                    salesCount: 0,
                    uniqueBuyers: new Set(),
                    lastSaleAt: null,
                    items: [],
                    premiumGiven: 0,
                    tokensGiven: 0
                };
            }

            stats[sellerId].totalAmount += (sale.amount || 0);
            stats[sellerId].salesCount += 1;
            stats[sellerId].uniqueBuyers.add(sale.buyerId);

            const saleDate = sale.createdAt?.toDate ? sale.createdAt.toDate() : null;
            if (saleDate && (!stats[sellerId].lastSaleAt || saleDate > stats[sellerId].lastSaleAt)) {
                stats[sellerId].lastSaleAt = saleDate;
            }

            stats[sellerId].items.push(sale);
        });

        allActions.forEach(action => {
            const sellerId = action.staffId;
            if (!sellerId) return;

            if (!stats[sellerId]) {
                stats[sellerId] = {
                    totalAmount: 0,
                    salesCount: 0,
                    uniqueBuyers: new Set(),
                    lastSaleAt: null,
                    items: [],
                    premiumGiven: 0,
                    tokensGiven: 0
                };
            }

            if (action.type === 'premium') {
                stats[sellerId].premiumGiven += (action.value || 0);
            } else if (action.type === 'tokens') {
                stats[sellerId].tokensGiven += (action.value || 0);
            }
        });

        return stats;
    }, [allSales, allActions]);

    const filteredSalespeople = salespeople.filter(sp =>
        sp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sp.email?.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => {
        const amountA = salesStats[a.id]?.totalAmount || 0;
        const amountB = salesStats[b.id]?.totalAmount || 0;
        return amountB - amountA;
    });

    const selectedSeller = salespeople.find(s => s.id === selectedSellerId);
    const sellerSales = allSales.filter(s => s.sellerId === selectedSellerId)
        .sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : 0;
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : 0;
            return dateB - dateA;
        });

    const sellerActions = allActions.filter(a => a.staffId === selectedSellerId)
        .sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : 0;
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : 0;
            return dateB - dateA;
        });

    if (currentUser?.role !== 'admin') {
        return <div className="p-8 text-center">Acceso restringido. Solo administradores pueden ver esta página.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-headline text-slate-900">Seguimiento de Ventas</h1>
                    <p className="text-muted-foreground">Monitorea el rendimiento y las transacciones de cada vendedor.</p>
                </div>
                <div className="flex items-center gap-4">
                    <Card className="px-4 py-2 bg-emerald-50 border-emerald-100">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase">Ventas Totales Plataforma</p>
                        <p className="text-xl font-black text-emerald-700">
                            ${allSales.reduce((acc, s) => acc + (s.amount || 0), 0).toLocaleString()}
                        </p>
                    </Card>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left side: List of salespeople */}
                <Card className="lg:col-span-5 border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden flex flex-col h-[calc(100vh-200px)]">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-6 py-4">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Users className="h-5 w-5 text-primary" />
                                <CardTitle className="text-lg font-bold">Vendedores</CardTitle>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Buscar vendedor..."
                                    className="pl-9 rounded-xl h-10 bg-white"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-hidden">
                        <ScrollArea className="h-full px-6 py-4">
                            <div className="space-y-3">
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)
                                ) : filteredSalespeople.length > 0 ? (
                                    filteredSalespeople.map(sp => {
                                        const stats = salesStats[sp.id] || { totalAmount: 0, salesCount: 0, premiumGiven: 0, tokensGiven: 0 };
                                        const isSelected = selectedSellerId === sp.id;

                                        return (
                                            <div
                                                key={sp.id}
                                                onClick={() => setSelectedSellerId(sp.id)}
                                                className={`p-4 border rounded-2xl cursor-pointer transition-all hover:border-primary/50 group ${isSelected ? 'border-primary bg-primary/5 shadow-md' : 'bg-card border-slate-100 shadow-sm'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                                        <AvatarImage src={sp.avatar} />
                                                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                                            {sp.name?.charAt(0) || 'V'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-slate-800 truncate">{sp.name}</p>
                                                        <p className="text-[10px] text-muted-foreground truncate">{sp.email}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-black text-emerald-600">${stats.totalAmount.toLocaleString()}</p>
                                                        <div className="flex items-center gap-1 justify-end">
                                                            {stats.premiumGiven > 0 && <span className="text-[8px] px-1 bg-amber-100 text-amber-700 rounded font-bold">💎 {Math.round(stats.premiumGiven)}d</span>}
                                                            {stats.tokensGiven > 0 && <span className="text-[8px] px-1 bg-blue-100 text-blue-700 rounded font-bold">🪙 {stats.tokensGiven}</span>}
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase">{stats.salesCount} v.</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-10 text-muted-foreground italic">No se encontraron vendedores.</div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Right side: Seller details and history */}
                <div className="lg:col-span-7 space-y-6">
                    {selectedSeller ? (
                        <>
                            <Card className="border-none shadow-lg shadow-slate-200/50 rounded-3xl overflow-hidden bg-white">
                                <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-8 py-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-16 w-16 border-4 border-white/20 shadow-xl">
                                                <AvatarImage src={selectedSeller.avatar} />
                                                <AvatarFallback className="bg-white/10 text-white text-xl font-bold">
                                                    {selectedSeller.name?.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <h2 className="text-2xl font-bold font-headline">{selectedSeller.name}</h2>
                                                <p className="text-slate-300 text-sm">{selectedSeller.email}</p>
                                            </div>
                                        </div>
                                        <Badge className="bg-emerald-500 text-white hover:bg-emerald-600 px-3 py-1 text-xs font-black">
                                            Vendedor Activo
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-8">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div className="flex items-center gap-2 text-slate-500 mb-1">
                                                <DollarSign className="h-4 w-4" />
                                                <span className="text-[10px] font-bold uppercase">Monto Total</span>
                                            </div>
                                            <p className="text-xl font-black text-slate-900">${(salesStats[selectedSeller.id]?.totalAmount || 0).toLocaleString()}</p>
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div className="flex items-center gap-2 text-slate-500 mb-1">
                                                <ShoppingBag className="h-4 w-4" />
                                                <span className="text-[10px] font-bold uppercase">N° Ventas</span>
                                            </div>
                                            <p className="text-xl font-black text-slate-900">{salesStats[selectedSeller.id]?.salesCount || 0}</p>
                                        </div>
                                        <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                                            <div className="flex items-center gap-2 text-amber-600 mb-1">
                                                <Crown className="h-4 w-4" />
                                                <span className="text-[10px] font-bold uppercase">Días Premium</span>
                                            </div>
                                            <p className="text-xl font-black text-amber-700">{Math.round(salesStats[selectedSeller.id]?.premiumGiven || 0)}d</p>
                                        </div>
                                        <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                                            <div className="flex items-center gap-2 text-blue-600 mb-1">
                                                <Coins className="h-4 w-4" />
                                                <span className="text-[10px] font-bold uppercase">Tokens Dados</span>
                                            </div>
                                            <p className="text-xl font-black text-blue-700">{salesStats[selectedSeller.id]?.tokensGiven || 0}</p>
                                        </div>
                                    </div>

                                    <div className="mt-6 flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/10">
                                        <div className="flex items-center gap-3">
                                            <Calendar className="h-5 w-5 text-primary" />
                                            <div>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase">Última Actividad</p>
                                                <p className="font-bold text-slate-800">
                                                    {salesStats[selectedSeller.id]?.lastSaleAt ? format(salesStats[selectedSeller.id].lastSaleAt, "d 'de' MMMM, yyyy", { locale: es }) : 'Sin actividad reciente'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-xl shadow-sm border border-slate-100">
                                            <Users className="h-4 w-4 text-primary" />
                                            <span className="text-xs font-bold text-slate-700">{salesStats[selectedSeller.id]?.uniqueBuyers?.size || 0} Clientes Únicos</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden flex flex-col h-[calc(100vh-530px)]">
                                <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-8 py-2">
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => setActiveTab('sales')}
                                            className={cn(
                                                "h-12 px-4 text-sm font-bold border-b-2 transition-all",
                                                activeTab === 'sales' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-slate-600"
                                            )}
                                        >
                                            Historial de Ventas
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('actions')}
                                            className={cn(
                                                "h-12 px-4 text-sm font-bold border-b-2 transition-all",
                                                activeTab === 'actions' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-slate-600"
                                            )}
                                        >
                                            Acciones Administrativas (Gifts)
                                        </button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0 flex-1 overflow-hidden">
                                    <ScrollArea className="h-full p-8">
                                        <div className="space-y-4">
                                            {activeTab === 'sales' ? (
                                                sellerSales.length > 0 ? (
                                                    sellerSales.map((sale) => (
                                                        <div key={sale.id} className="p-5 border rounded-2xl bg-card hover:border-emerald-200 transition-all shadow-sm flex items-center justify-between group">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                                                    <ShoppingBag className="h-6 w-6 text-emerald-600" />
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <div className="flex items-center gap-2">
                                                                        <p className="font-bold text-slate-800 text-lg">{sale.buyerName}</p>
                                                                        <Badge variant="outline" className="text-[9px] font-black uppercase text-emerald-600 border-emerald-200">VENTA</Badge>
                                                                    </div>
                                                                    <p className="text-sm text-muted-foreground">{sale.item}</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-2xl font-black text-emerald-600">${(sale.amount || 0).toLocaleString()}</p>
                                                                <p className="text-xs text-muted-foreground font-medium mt-1">
                                                                    {sale.createdAt?.toDate ? format(sale.createdAt.toDate(), 'd MMM, yyyy - HH:mm', { locale: es }) : ''}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                                                        <ShoppingBag className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                                        <p className="text-slate-500 font-medium italic">Este vendedor no tiene ventas registradas.</p>
                                                    </div>
                                                )
                                            ) : (
                                                sellerActions.length > 0 ? (
                                                    sellerActions.map((action) => (
                                                        <div key={action.id} className="p-5 border rounded-2xl bg-card hover:border-amber-200 transition-all shadow-sm flex items-center justify-between group">
                                                            <div className="flex items-center gap-4">
                                                                <div className={cn(
                                                                    "w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform",
                                                                    action.type === 'premium' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                                                                )}>
                                                                    {action.type === 'premium' ? <Crown className="h-6 w-6" /> : <Coins className="h-6 w-6" />}
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <div className="flex items-center gap-2">
                                                                        <p className="font-bold text-slate-800 text-lg">{action.targetUserName}</p>
                                                                        <Badge variant="outline" className={cn(
                                                                            "text-[9px] font-black uppercase",
                                                                            action.type === 'premium' ? "text-amber-600 border-amber-200" : "text-blue-600 border-blue-200"
                                                                        )}>
                                                                            {action.type.toUpperCase()}
                                                                        </Badge>
                                                                    </div>
                                                                    <p className="text-sm text-muted-foreground">{action.description}</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className={cn(
                                                                    "text-2xl font-black",
                                                                    action.type === 'premium' ? "text-amber-600" : "text-blue-600"
                                                                )}>
                                                                    {action.type === 'premium' ? `${Math.round(action.value)}d` : `+${action.value}`}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground font-medium mt-1">
                                                                    {action.createdAt?.toDate ? format(action.createdAt.toDate(), 'd MMM, yyyy - HH:mm', { locale: es }) : ''}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                                                        <History className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                                        <p className="text-slate-500 font-medium italic">Este vendedor no ha otorgado accesos directos.</p>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-12 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200">
                            <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-6">
                                <Users className="h-10 w-10 text-slate-300" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Selecciona un Vendedor</h3>
                            <p className="text-slate-500 text-center max-w-sm">
                                Haz clic en un vendedor de la lista para ver su rendimiento detallado, monto acumulado y transacciones históricas.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
