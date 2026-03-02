'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { Pie, PieChart, Cell } from 'recharts';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/contexts/LanguageContext';


const chartColors = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'
];

interface WeeklyData {
  startDate: string;
  endDate: string;
  data: { materia: string; tiempo: number }[];
  totalTime: number;
}

export function WeeklyStudyDistribution() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [period, setPeriod] = React.useState<'week' | 'month'>('week');
  const [selectedWeek, setSelectedWeek] = React.useState<WeeklyData | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);


  const generateData = React.useMemo(() => {
    if (!user || !user.studyTime) return [];

    const now = new Date();
    const periods: WeeklyData[] = [];
    const subjects = Object.keys(user.studyTime);
    const totalTime = Object.values(user.studyTime).reduce((acc, time) => acc + time, 0);
    const numPeriods = 1; // Only current period
    const timePerPeriod = totalTime / numPeriods;

    for (let i = 0; i < numPeriods; i++) {
      let startDate: Date;
      let endDate: Date;

      if (period === 'week') {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 6); // Start of the week
        endDate = new Date(now); // End of the week
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1); // First day of the month
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of the month
      }

      const data = subjects.map((materia) => ({
        materia,
        tiempo: Math.round((user.studyTime[materia]) / 60) // Show data for current period
      }));

      periods.push({
        startDate: startDate.toLocaleDateString(),
        endDate: endDate.toLocaleDateString(),
        data,
        totalTime: Math.round(totalTime / 60)
      });
    }

    return periods;
  }, [user, period]);

  const handleCardClick = (week: WeeklyData) => {
    setSelectedWeek(week);
    setIsModalOpen(true);
  };



  const chartConfig = React.useMemo(() => {
    if (!selectedWeek) return {};
    const config: any = {
      tiempo: {
        label: 'Tiempo (mins)',
      }
    };
    selectedWeek.data.forEach((item, index) => {
      config[item.materia] = {
        label: item.materia,
        color: chartColors[index % chartColors.length]
      };
    });
    return config;
  }, [selectedWeek]);

  if (!user || !user.studyTime || Object.keys(user.studyTime).length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Distribución por {period === 'week' ? 'Semana' : 'Mes'}</h3>
        <Select value={period} onValueChange={(value: 'week' | 'month') => setPeriod(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Por Semana</SelectItem>
            <SelectItem value="month">Por Mes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {generateData.map((week: WeeklyData, index: number) => (
          <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleCardClick(week)}>
            <CardHeader>
              <CardTitle className="text-sm">{week.startDate} - {week.endDate}</CardTitle>
              <CardDescription>Total: {week.totalTime} mins</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Click para ver detalles</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Distribución de Estudio: {selectedWeek?.startDate} - {selectedWeek?.endDate}</DialogTitle>
          </DialogHeader>
          {selectedWeek && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-lg font-semibold">Tiempo Total: {selectedWeek.totalTime} minutos</p>
              </div>
              <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[300px]">
                <PieChart>
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={selectedWeek.data}
                    dataKey="tiempo"
                    nameKey="materia"
                    innerRadius={60}
                    strokeWidth={5}
                  >
                    {selectedWeek.data.map((entry) => (
                      <Cell key={entry.materia} fill={chartConfig[entry.materia]?.color} />
                    ))}
                  </Pie>
                  <ChartLegend
                    content={({ payload }) => (
                      <ul className="flex flex-wrap gap-2 p-0 m-0 list-none">
                        {payload?.map((entry: any, index: number) => (
                          <li
                            key={`legend-item-${entry.dataKey}-${index}`}
                            className="flex items-center gap-1 text-sm"
                            style={{ color: entry.color }}
                          >
                            <span
                              className="inline-block w-3 h-3 rounded-sm"
                              style={{ backgroundColor: entry.color }}
                            />
                            {entry.value}
                          </li>
                        ))}
                      </ul>
                    )}
                  />
                </PieChart>
              </ChartContainer>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
