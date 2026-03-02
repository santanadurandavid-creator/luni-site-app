'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Users, Pencil, Star, History } from 'lucide-react';
import { getFirebaseServices } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Professor } from '@/lib/types';
import { ManageProfessorModal } from '@/components/admin/ManageProfessorModal';
import { ProfessorHistoryModal } from '@/components/admin/ProfessorHistoryModal';

export default function ProfessorsPage() {
    const [professors, setProfessors] = useState<Professor[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProfessor, setSelectedProfessor] = useState<Professor | null>(null);

    // History Modal State
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyProfessor, setHistoryProfessor] = useState<Professor | null>(null);

    useEffect(() => {
        const { db } = getFirebaseServices();
        const q = query(collection(db, 'professors'), orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data: Professor[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Professor));
            setProfessors(data);
        });

        return () => unsubscribe();
    }, []);

    const handleEdit = (professor: Professor) => {
        setSelectedProfessor(professor);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setSelectedProfessor(null);
        setIsModalOpen(true);
    };

    const handleHistory = (professor: Professor) => {
        setHistoryProfessor(professor);
        setIsHistoryModalOpen(true);
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Users className="w-8 h-8" />
                        Gestión de Profesores
                    </h1>
                    <p className="text-muted-foreground mt-1">Administra los perfiles de los profesores y sus calificaciones.</p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Profesor
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {professors.map((professor) => (
                    <div key={professor.id} className="bg-card border rounded-xl p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <img
                                    src={professor.avatarUrl}
                                    alt={professor.name}
                                    className="w-16 h-16 rounded-full object-cover border-2 border-primary/10"
                                />
                                <div>
                                    <h3 className="font-bold text-lg">{professor.name}</h3>
                                    <div className="flex items-center gap-1 text-yellow-500 text-sm font-medium">
                                        <Star className="w-4 h-4 fill-current" />
                                        {professor.rating?.toFixed(1) || '5.0'}
                                        <span className="text-muted-foreground text-xs ml-1">({professor.totalRatings || 0} reviews)</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => handleHistory(professor)} title="Ver Historial">
                                    <History className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(professor)} title="Editar">
                                    <Pencil className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <ManageProfessorModal
                isOpen={isModalOpen}
                setIsOpen={setIsModalOpen}
                professorToEdit={selectedProfessor}
                onClose={() => setSelectedProfessor(null)}
            />

            <ProfessorHistoryModal
                isOpen={isHistoryModalOpen}
                setIsOpen={setIsHistoryModalOpen}
                professorId={historyProfessor?.id || null}
                professorName={historyProfessor?.name || null}
            />
        </div>
    );
}
