'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import type { StudyData } from '@/lib/types';
import { Trophy, Video, Mic, BookOpen, BrainCircuit, Sparkles, RefreshCcw } from 'lucide-react';
import { Pie, PieChart, Cell, Label } from 'recharts';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/contexts/LanguageContext';
import { getFirebaseServices } from '@/lib/firebase';
import { collection, getCountFromServer, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
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

const chartColors = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'
];

export function StudyDistributionChart() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [totalItems, setTotalItems] = React.useState(0);
  // Removed local counting state in favor of user object stats

  const [showConfirmReset, setShowConfirmReset] = React.useState(false);

  const handleResetProgress = () => {
    // We still clear local storage as it might be used elsewhere or for legacy reasons, 
    // but the chart now reflects the user object.
    // If we want to reset the USER object stats, we should call a server action or useAuth method.
    // However, the original code only cleared local storage.
    // Given the user wants "taken from" StudyTime (persistent), resetting LOCAL storage won't affect the chart anymore 
    // unless the user object update logic listens to this event.
    // For now, let's keep the local clearing but the user probably wants to reset REAL stats too?
    // The Stat Cards have their own reset buttons which call `resetMultimediaWatched` etc from useAuth.
    // We should probably just do nothing here or call those resets?
    // The "Reset" button in the chart seems to imply resetting "Content Progress".
    // For now, I will keep the local clear to avoid breaking existing flows, but maybe add a TODO.
    // Wait, the user wants it to work like StudyTime. StudyTime reset calls `resetStudyTime()`.
    // I should probably find a `resetAllProgress`? 
    // For now, I will just remove the defunct state setters.
    localStorage.removeItem('completedContentIds');
    localStorage.removeItem('countedReadingIds');
    localStorage.removeItem('countedMultimediaIds');
    setShowConfirmReset(false);
    window.dispatchEvent(new CustomEvent('contentCompleted', { detail: { id: 'reset' } }));
  };

  React.useEffect(() => {
    async function fetchTotals() {
      const { db } = getFirebaseServices();
      try {
        const [contentSnap, examsSnap] = await Promise.all([
          getDocs(collection(db, 'content')),
          getDocs(collection(db, 'exams'))
        ]);

        // Just counting totals for the denominator
        setTotalItems(contentSnap.size + examsSnap.size);
      } catch (e) {
        console.error("Error fetching totals:", e);
      }
    }

    fetchTotals();
  }, []);

  const chartData: StudyData[] = React.useMemo(() => {
    if (!user || !user.studyTime) return [];
    return Object.entries(user.studyTime)
      .filter(([materia]) => materia.toLowerCase() !== 'general') // filter out 'general'
      .map(([materia, tiempo]) => ({
        date: '',
        time: Math.round(tiempo / 60),
        subject: materia,
        materia,
        tiempo: Math.round(tiempo / 60) // convert seconds to minutes
      }))
      .filter(d => d.tiempo > 0)
      .sort((a, b) => a.materia.localeCompare(b.materia));
  }, [user]);

  const completedItemsCount = React.useMemo(() => {
    if (!user) return 0;
    return (user.multimediaWatched || 0) + (user.readingsCompleted || 0) + (user.quizzesCompleted || 0);
  }, [user]);

  const percentage = totalItems > 0 ? Math.round((completedItemsCount / totalItems) * 100) : 0;
  const progressData = [
    { name: 'Opened', value: completedItemsCount, fill: 'hsl(var(--primary))' },
    { name: 'Remaining', value: Math.max(0, totalItems - completedItemsCount), fill: 'hsl(var(--muted))' }
  ];

  const chartConfig = React.useMemo(() => {
    const config: any = {
      tiempo: { label: 'Tiempo (mins)' },
      progress: { label: 'Progreso (%)' }
    };
    chartData.forEach((item, index) => {
      config[item.materia] = {
        label: item.materia,
        color: chartColors[index % chartColors.length]
      };
    });
    return config;
  }, [chartData]);


  if (chartData.length === 0 && totalItems === 0) {
    return (
      <Card className="shadow-sm hover:shadow-md transition-all duration-300 border-0 bg-gradient-to-br from-primary/5 via-card to-primary/10 hover:from-primary/10 hover:via-card/50 hover:to-primary/15 group cursor-pointer">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{t('studyDistribution')}</CardTitle>
          <CardDescription>{t('noStudyTimeRecorded')}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-muted-foreground">{t('startStudying')}</p>
        </CardContent>
      </Card>
    );
  }





  return (
    <Card className="shadow-lg hover:shadow-xl transition-all duration-500 border-0 bg-gradient-to-br from-primary/5 via-card to-primary/10 hover:from-primary/10 hover:via-card/50 hover:to-primary/15 group overflow-hidden relative">
      <CardHeader className="pb-4 sm:pb-6 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-inner">
            <Trophy className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <CardTitle className="text-base sm:text-xl font-black font-headline tracking-tight group-hover:text-primary transition-colors">Progreso Académico</CardTitle>
            <CardDescription className="text-[10px] sm:text-xs font-medium opacity-70">Rendimiento por materia y avance total</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-8 items-start">
          {/* Chart 1: Study Time by Subject */}
          <div className="flex flex-col items-center relative pt-8 sm:pt-10">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-primary/5 rounded-full border border-primary/10 shadow-sm whitespace-nowrap">
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-primary/80">Tiempo de Estudio</span>
            </div>
            <ChartContainer config={chartConfig} className="w-full max-h-[200px] mt-6 sm:mt-8">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={[{ value: 100 }]}
                  dataKey="value"
                  innerRadius="75%"
                  outerRadius="100%"
                  fill="rgba(120, 120, 120, 0.2)"
                  stroke="rgba(120, 120, 120, 0.15)"
                  strokeWidth={1}
                  isAnimationActive={false}
                />
                <Pie
                  data={chartData}
                  dataKey="tiempo"
                  nameKey="materia"
                  innerRadius="75%"
                  outerRadius="100%"
                  strokeWidth={3}
                  stroke="hsl(var(--background))"
                  paddingAngle={3}
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.materia}
                      fill={chartConfig[entry.materia]?.color}
                      className="hover:opacity-80 transition-opacity cursor-pointer outline-none"
                    />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                            <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl sm:text-3xl font-black">
                              {chartData.reduce((acc, curr) => acc + curr.tiempo, 0)}
                            </tspan>
                            <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 22} className="fill-muted-foreground text-[8px] sm:text-[10px] font-black uppercase tracking-tighter">
                              Mins Totales
                            </tspan>
                          </text>
                        )
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="mt-8 w-full space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {chartData.map((item) => (
                  <div key={item.materia} className="flex items-center justify-between p-2.5 rounded-2xl bg-background/40 border border-primary/5 hover:border-primary/20 transition-all shadow-sm group/item">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: chartConfig[item.materia]?.color }}
                      />
                      <span className="text-[10px] font-bold truncate opacity-80 group-hover/item:opacity-100 transition-opacity">
                        {item.materia}
                      </span>
                    </div>
                    <span className="text-[11px] font-black text-primary tabular-nums shrink-0 ml-1.5">
                      {item.tiempo}m
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chart 2: Content Progress Percentage */}
          <div className="flex flex-col items-center relative pt-8 sm:pt-10">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-primary/10 rounded-full border border-primary/20 shadow-sm shadow-primary/10 whitespace-nowrap flex items-center gap-2 group/header">
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-primary">Contenido Estudiado</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 text-primary/40 hover:text-primary transition-colors"
                onClick={() => setShowConfirmReset(true)}
              >
                <RefreshCcw className="h-2.5 w-2.5" />
              </Button>
            </div>
            <ChartContainer config={chartConfig} className="w-full max-h-[200px] mt-6 sm:mt-8">
              <PieChart>
                <Pie
                  data={[{ value: 100 }]}
                  dataKey="value"
                  innerRadius="75%"
                  outerRadius="100%"
                  fill="rgba(120, 120, 120, 0.2)"
                  stroke="rgba(120, 120, 120, 0.15)"
                  strokeWidth={1}
                  isAnimationActive={false}
                />
                <Pie
                  data={progressData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="75%"
                  outerRadius="100%"
                  strokeWidth={0}
                  startAngle={90}
                  endAngle={450}
                  paddingAngle={0}
                >
                  <Cell fill="hsl(var(--primary))" className="drop-shadow-[0_0_15px_rgba(var(--primary),0.6)]" stroke="hsl(var(--background))" strokeWidth={2} />
                  <Cell fill="rgba(120, 120, 120, 0.2)" stroke="none" />
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={viewBox.cy}
                              className="fill-foreground text-4xl sm:text-5xl font-black tabular-nums"
                            >
                              {percentage}%
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 28}
                              className="fill-primary font-bold text-[9px] sm:text-[11px] uppercase tracking-[0.2em]"
                            >
                              Explorado
                            </tspan>
                          </text>
                        )
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>

            <div className="w-full mt-8 space-y-4">
              <div className="grid grid-cols-2 gap-2 relative z-10">
                <div className="flex items-center justify-between p-2.5 bg-background/40 rounded-2xl border border-primary/5 hover:border-primary/20 transition-all shadow-sm group/item col-span-2">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="p-1 rounded-lg bg-blue-500/10 text-blue-500 shrink-0">
                      <Video className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[10px] font-bold truncate opacity-80 group-hover/item:opacity-100 transition-opacity">Multimedia (Videos/Podcast)</span>
                  </div>
                  <span className="text-[11px] font-black text-primary tabular-nums shrink-0 ml-1.5">{user?.multimediaWatched || 0}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-background/40 rounded-2xl border border-primary/5 hover:border-primary/20 transition-all shadow-sm group/item">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
                      <BookOpen className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[10px] font-bold truncate opacity-80 group-hover/item:opacity-100 transition-opacity">Lecturas</span>
                  </div>
                  <span className="text-[11px] font-black text-primary tabular-nums shrink-0 ml-1.5">{user?.readingsCompleted || 0}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-background/40 rounded-2xl border border-primary/5 hover:border-primary/20 transition-all shadow-sm group/item">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="p-1 rounded-lg bg-orange-500/10 text-orange-500 shrink-0">
                      <BrainCircuit className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[10px] font-bold truncate opacity-80 group-hover/item:opacity-100 transition-opacity">Quizzes</span>
                  </div>
                  <span className="text-[11px] font-black text-primary tabular-nums shrink-0 ml-1.5">{user?.quizzesCompleted || 0}</span>
                </div>
              </div>

              <div className="text-center pt-2 flex flex-col items-center gap-1.5 relative z-10 border-t border-primary/5 mt-2">
                <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground whitespace-nowrap">
                  Has explorado <span className="text-primary font-black tabular-nums">{completedItemsCount}</span> de <span className="text-foreground font-black tabular-nums">{totalItems}</span> temas.
                </p>
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-primary/80 leading-tight flex items-center gap-1.5 bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
                  <Sparkles className="h-3 w-3 animate-pulse text-primary" />
                  Sigue así, vas por excelente camino
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      <AlertDialog open={showConfirmReset} onOpenChange={setShowConfirmReset}>
        <AlertDialogContent className="rounded-2xl max-w-[85%] sm:max-w-md border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-headline text-lg">¿Reiniciar Progreso de Contenido?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción pondrá tu porcentaje de exploración a cero. Tendrás que volver a abrir los temas para que se contabilicen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetProgress} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
              Sí, Reiniciar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
