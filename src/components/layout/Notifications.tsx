
'use client';

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button";
import { Bell, Check, Trash2, X, Eye } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Notification } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";
import { collection, doc, onSnapshot, query, setDoc, orderBy, writeBatch } from "firebase/firestore";
import { getFirebaseServices } from '@/lib/firebase';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

export function Notifications() {
    const { user, isLoading } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [readStatus, setReadStatus] = useState<Record<string, boolean>>({});
    const [deletedIds, setDeletedIds] = useState<Record<string, boolean>>({});
    const [modalUrl, setModalUrl] = useState<string | null>(null);
    const [modalTitle, setModalTitle] = useState<string>('');
    const [isExternalModal, setIsExternalModal] = useState(false);
    const [openPopover, setOpenPopover] = useState(false);
    const router = useRouter();

    const [popupNotification, setPopupNotification] = useState<Notification | null>(null);
    const popupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isLoading || !user) {
            setNotifications([]);
            setReadStatus({});
            setDeletedIds({});
            return;
        }

        const { db } = getFirebaseServices();

        const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
        const unsubscribeGlobal = onSnapshot(q, (snapshot) => {
            const globalNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification))
                .filter(n => !n.recipientIds || n.recipientIds.includes(user.id));

            const previousNotificationIds = notifications.map(n => n.id);
            const userNotifications = globalNotifications.filter(n => !n.recipientIds || n.recipientIds.includes(user.id));
            const unreadNotifications = userNotifications.filter(n => !readStatus[n.id] && !deletedIds[n.id]);
            const newNotifications = unreadNotifications.filter(n => !previousNotificationIds.includes(n.id));

            setNotifications(globalNotifications);

            if (newNotifications.length > 0) {
                const firstNew = newNotifications[0];
                const popupShownKey = `popup_shown_${firstNew.id}`;
                if (!localStorage.getItem(popupShownKey)) {
                    setPopupNotification(firstNew);
                    localStorage.setItem(popupShownKey, 'true');
                    if (popupTimeoutRef.current) {
                        clearTimeout(popupTimeoutRef.current);
                    }
                    popupTimeoutRef.current = setTimeout(() => {
                        setPopupNotification(null);
                    }, 10000);
                }
            }
        });

        const userReadNotifsRef = collection(db, 'users', user.id, 'readNotifications');
        const unsubscribeUserRead = onSnapshot(userReadNotifsRef, (snapshot) => {
            const status: Record<string, boolean> = {};
            snapshot.forEach(doc => {
                status[doc.id] = true;
            });
            setReadStatus(status);
        });

        const userDeletedNotifsRef = collection(db, 'users', user.id, 'deletedNotifications');
        const unsubscribeUserDeleted = onSnapshot(userDeletedNotifsRef, (snapshot) => {
            const ids: Record<string, boolean> = {};
            snapshot.forEach(doc => {
                ids[doc.id] = true;
            });
            setDeletedIds(ids);
        });

        return () => {
            unsubscribeGlobal();
            unsubscribeUserRead();
            unsubscribeUserDeleted();
        }
    }, [user, isLoading]);

    const filteredNotifications = notifications.filter(n => !deletedIds[n.id]);
    const unreadCount = filteredNotifications.filter(n => !readStatus[n.id]).length;

    const markAsRead = async (id: string) => {
        if (!user || readStatus[id]) return;
        const { db } = getFirebaseServices();
        const readNotifRef = doc(db, 'users', user.id, 'readNotifications', id);
        await setDoc(readNotifRef, { read: true, readAt: new Date() });
    }

    const markAllAsRead = async () => {
        if (!user) return;
        const { db } = getFirebaseServices();
        const batch = writeBatch(db);
        filteredNotifications.forEach(notif => {
            if (!readStatus[notif.id]) {
                const readNotifRef = doc(db, 'users', user.id, 'readNotifications', notif.id);
                batch.set(readNotifRef, { read: true, readAt: new Date() });
            }
        });
        await batch.commit();
    }

    const closePopup = () => {
        setPopupNotification(null);
        if (popupTimeoutRef.current) {
            clearTimeout(popupTimeoutRef.current);
        }
    };

    const viewPopupNotification = (notification: Notification) => {
        closePopup();
        if (notification.url) {
            try {
                if (notification.url.startsWith('/')) {
                    if (notification.url.includes('modal=premium_activation')) {
                        const url = new URL(notification.url, window.location.origin);
                        const days = url.searchParams.get('days');
                        const tokens = url.searchParams.get('tokens');
                        window.dispatchEvent(new CustomEvent('openPremiumActivationModal', { detail: { days, tokens } }));
                        return;
                    }

                    if (notification.url === '/profile?tab=retos' || notification.url.includes('tab=retos')) {
                        window.dispatchEvent(new CustomEvent('openChallengesModal', { detail: { tab: 'retos' } }));
                        return;
                    }
                    router.push(notification.url);
                    return;
                }

                const url = new URL(notification.url);
                if (url.hostname === 'wa.me' || url.hostname === 'api.whatsapp.com') {
                    window.open(notification.url, '_blank');
                    return;
                }
                if (url.hostname === 'luni.site' || url.hostname.endsWith('.luni.site')) {
                    window.location.href = notification.url;
                } else {
                    setModalUrl(notification.url);
                    setModalTitle(notification.title);
                    setIsExternalModal(true);
                }
            } catch (error) {
                // If URL is invalid but starts with /, try to navigate
                if (notification.url.startsWith('/')) {
                    router.push(notification.url);
                    return;
                }
                // Otherwise open modal
                setModalUrl(notification.url);
                setModalTitle(notification.title);
                setIsExternalModal(true);
            }
        }
    };

    const deleteNotification = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        e.preventDefault();
        if (!user) return;
        const { db } = getFirebaseServices();
        const deletedNotifRef = doc(db, 'users', user.id, 'deletedNotifications', id);
        await setDoc(deletedNotifRef, { deletedAt: new Date() });
    }

    const handleNotificationClick = (notification: Notification) => {
        markAsRead(notification.id);
        if (notification.url) {
            try {
                if (notification.url.startsWith('/')) {
                    if (notification.url.includes('modal=premium_activation')) {
                        const url = new URL(notification.url, window.location.origin);
                        const days = url.searchParams.get('days');
                        const tokens = url.searchParams.get('tokens');
                        window.dispatchEvent(new CustomEvent('openPremiumActivationModal', { detail: { days, tokens } }));
                        setOpenPopover(false);
                        return;
                    }

                    if (notification.url === '/profile?tab=retos') {
                        window.dispatchEvent(new CustomEvent('openChallengesModal', { detail: { tab: 'retos' } }));
                        setOpenPopover(false);
                        return;
                    }

                    router.push(notification.url);
                    setOpenPopover(false);
                    return;
                }

                const url = new URL(notification.url);
                if (url.hostname === 'wa.me' || url.hostname === 'api.whatsapp.com') {
                    window.open(notification.url, '_blank');
                    setOpenPopover(false);
                    return;
                }
                if (url.hostname === 'luni.site' || url.hostname.endsWith('.luni.site')) {
                    window.location.href = notification.url;
                } else {
                    setModalUrl(notification.url);
                    setModalTitle(notification.title);
                    setIsExternalModal(true);
                }
            } catch (error) {
                if (notification.url.startsWith('/')) {
                    router.push(notification.url);
                    setOpenPopover(false);
                    return;
                }
                setModalUrl(notification.url);
                setModalTitle(notification.title);
                setIsExternalModal(true);
            }
        }
    };

    const getNotificationImageSrc = (url: string) => {
        if (!url) return '';
        if (url.startsWith('/') && !url.startsWith('//')) return url;
        try {
            const urlObj = new URL(url);
            if (typeof window !== 'undefined' && urlObj.hostname === window.location.hostname) {
                return urlObj.pathname + urlObj.search;
            }
        } catch (e) { }
        return url;
    };

    const NotificationItem = ({ notification }: { notification: Notification }) => {
        const isRead = readStatus[notification.id];
        const imageSrc = notification.imageUrl ? getNotificationImageSrc(notification.imageUrl) : null;

        return (
            <div
                className={cn(
                    "p-4 border-b flex items-start gap-4 last:border-b-0 hover:bg-muted/50 transition-colors cursor-pointer",
                    !isRead && "bg-primary/10 dark:bg-primary/20"
                )}
                onClick={() => handleNotificationClick(notification)}
            >
                <div className="flex-shrink-0">
                    {imageSrc ? (
                        <div className="relative h-12 w-12">
                            <Image src={imageSrc} alt={notification.title} fill className="rounded-md object-cover" />
                        </div>
                    ) : (
                        <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center">
                            <Bell className="h-6 w-6 text-muted-foreground" />
                        </div>
                    )}
                </div>

                <div className="flex-grow">
                    <p className="font-semibold text-sm">{notification.title}</p>
                    <p className="text-xs text-muted-foreground">{notification.description}</p>
                </div>

                <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 group" onClick={(e) => deleteNotification(e, notification.id)} title="Eliminar notificación">
                    <Trash2 className="h-4 w-4 text-muted-foreground group-hover:text-destructive" />
                </Button>
            </div>
        );
    };

    return (
        <>
            <Popover open={openPopover} onOpenChange={setOpenPopover}>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                        <Bell />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                            </span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[90vw] sm:w-96 p-0" align="center" sideOffset={8} collisionPadding={10}>
                    <Card className="border-0 shadow-none">
                        <CardHeader className="border-b">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Notificaciones</CardTitle>
                                    <CardDescription>Tienes {unreadCount} notificaciones no leídas.</CardDescription>
                                </div>
                                {unreadCount > 0 && (
                                    <Button variant="ghost" size="sm" onClick={markAllAsRead}>Marcar todas como leídas</Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="max-h-96 overflow-y-auto">
                                {filteredNotifications.length > 0 ? filteredNotifications.map(notification => (
                                    <NotificationItem key={notification.id} notification={notification} />
                                )) : (
                                    <p className="text-sm text-muted-foreground text-center p-8">No hay notificaciones nuevas.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </PopoverContent>
            </Popover>

            {popupNotification && (
                <div className="fixed top-10 left-1/2 transform -translate-x-1/2 z-50 w-[85vw] max-w-md mx-4 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl shadow-lg flex items-center p-6 space-x-4 animate-in slide-in-from-top-4 duration-300">
                    {popupNotification.imageUrl ? (
                        <div className="relative h-12 w-12 flex-shrink-0 rounded-md overflow-hidden">
                            <Image src={getNotificationImageSrc(popupNotification.imageUrl)} alt={popupNotification.title} fill className="object-cover" />
                        </div>
                    ) : (
                        <Bell className="h-12 w-12 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1 text-left">
                        <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">{popupNotification.title}</p>
                        <p className="text-xs text-muted-foreground">{popupNotification.description}</p>
                    </div>
                    <div className="flex space-x-2">
                        <Button variant="ghost" size="icon" onClick={closePopup} title="Cerrar" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                            <X className="h-5 w-5" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => viewPopupNotification(popupNotification)} className="dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                            <Eye className="mr-1 h-4 w-4" />
                            Ver
                        </Button>
                    </div>
                </div>
            )}

            <Dialog open={!!modalUrl} onOpenChange={(isOpen) => !isOpen && (setModalUrl(null), setIsExternalModal(false))}>
                <DialogContent className={isExternalModal ? "w-[80vw] h-[80vh] max-w-4xl p-0" : "w-[95vw] h-[90vh] max-w-4xl"}>
                    {!isExternalModal && (
                        <DialogHeader>
                            <DialogTitle>{modalTitle}</DialogTitle>
                        </DialogHeader>
                    )}
                    {isExternalModal && (
                        <VisuallyHidden>
                            <DialogTitle>{modalTitle}</DialogTitle>
                        </VisuallyHidden>
                    )}
                    <div className={isExternalModal ? "w-full h-full" : "flex-1 h-full"}>
                        {modalUrl && (
                            <iframe
                                src={modalUrl}
                                className="w-full h-full border-0 rounded-md"
                                title={modalTitle}
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
