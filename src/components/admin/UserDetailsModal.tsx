'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { User } from '@/lib/types';
import { safeToDate } from '@/lib/utils';
import {
  Calendar,
  Trophy,
  MessageSquare,
  Clock,
  User as UserIcon,
  Mail,
  Phone,
  Shield,
  Star,
  Crown,
  Ban,
  Users,
  FileText,
  BarChart3,
  Target,
  Award,
  Eye,
  TrendingUp
} from 'lucide-react';
import { format, isFuture, differenceInDays, differenceInHours } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface UserDetailsModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  user: User;
}

export function UserDetailsModal({ isOpen, setIsOpen, user }: UserDetailsModalProps) {

  const isPremium = user.premiumUntil && isFuture(safeToDate(user.premiumUntil)!);
  const premiumTimeRemaining = user.premiumUntil ? (() => {
    const now = new Date();
    const endDate = safeToDate(user.premiumUntil);
    if (!endDate || !isFuture(endDate)) return null;
    const daysLeft = differenceInDays(endDate, now);
    const hoursLeft = differenceInHours(endDate, now);
    if (daysLeft > 0) return `${daysLeft} día${daysLeft !== 1 ? 's' : ''}`;
    else if (hoursLeft > 0) return `${hoursLeft} hora${hoursLeft !== 1 ? 's' : ''}`;
    else return 'Menos de 1 hora';
  })() : null;

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'supervisor_support': return 'secondary';
      case 'content_creator': return 'default';
      case 'support': return 'outline';
      default: return 'default';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'supervisor_support': return 'Supervisor Soporte';
      case 'content_creator': return 'Creador de Contenido';
      case 'support': return 'Soporte';
      default: return 'Normal';
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span>{user.name}</span>
                  {user.isAdmin && <Shield className="h-4 w-4 text-red-500" />}
                  {isPremium && <Star className="h-4 w-4 text-amber-500" />}
                  {user.banDetails?.isBanned && <Ban className="h-4 w-4 text-destructive" />}
                </div>
                <p className="text-sm text-muted-foreground font-normal">{user.email}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="academic">Académico</TabsTrigger>
              <TabsTrigger value="premium">Premium</TabsTrigger>
              <TabsTrigger value="exam">Examen</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <UserIcon className="h-5 w-5" />
                      Información Personal
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{user.email}</span>
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{user.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <Badge variant={getRoleBadgeColor(user.role || 'normal')}>
                        {getRoleLabel(user.role || 'normal')}
                      </Badge>
                    </div>
                    {user.examType && (
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Área: {user.examType}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Estadísticas Generales
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Quizzes completados:</span>
                      <Badge variant="secondary">{user.quizzesCompleted || 0}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Quizzes calificatorios:</span>
                      <Badge variant="secondary">{user.qualifyingQuizzesCount || 0}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Beneficios premium:</span>
                      <Badge variant="secondary">{user.premiumBenefitCount || 0}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Exámenes tomados:</span>
                      <Badge variant="secondary">{user.examsTakenThisPeriod || 0}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {user.banDetails?.isBanned && (
                <Card className="border-destructive/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                      <Ban className="h-5 w-5" />
                      Estado de Bloqueo
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm">
                      <strong>Razón:</strong> {user.banDetails.reason || 'No especificada'}
                    </p>
                    {user.banDetails.bannedUntil && (
                      <p className="text-sm">
                        <strong>Hasta:</strong> {new Date(user.banDetails.bannedUntil.seconds * 1000).toLocaleDateString('es-ES')}
                      </p>
                    )}
                    {user.banDetails.bannedAt && (
                      <p className="text-sm text-muted-foreground">
                        Bloqueado el: {new Date(user.banDetails.bannedAt.seconds * 1000).toLocaleDateString('es-ES')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="academic" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Tiempo de Estudio
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {user.studyTime && Object.keys(user.studyTime).length > 0 ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          {Object.entries(user.studyTime).map(([subject, seconds]) => (
                            <div key={subject} className="flex justify-between">
                              <span className="text-sm">{subject}:</span>
                              <Badge variant="outline">
                                {Math.floor(seconds / 3600)}h {Math.floor((seconds % 3600) / 60)}m
                              </Badge>
                            </div>
                          ))}
                        </div>
                        <div className="h-32">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={Object.entries(user.studyTime)
                                  .filter(([subject]) => subject.toLowerCase() !== 'general')
                                  .map(([subject, seconds]) => ({
                                    name: subject,
                                    value: Math.round(seconds / 60),
                                    tiempo: Math.round(seconds / 60)
                                  }))}
                                cx="50%"
                                cy="50%"
                                innerRadius={30}
                                outerRadius={50}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {Object.entries(user.studyTime)
                                  .filter(([subject]) => subject.toLowerCase() !== 'general')
                                  .map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
                                  ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Sin tiempo de estudio registrado</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Exámenes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Exámenes tomados:</span>
                          <Badge variant="secondary">{user.examResults?.length || 0}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Examen diagnóstico:</span>
                          <Badge variant={user.hasTakenDiagnosticExam ? "default" : "outline"}>
                            {user.hasTakenDiagnosticExam ? "Completado" : "Pendiente"}
                          </Badge>
                        </div>
                        {user.diagnosticExamResult && (
                          <div className="flex justify-between">
                            <span className="text-sm">Puntuación diagnóstico:</span>
                            <Badge variant="secondary">{user.diagnosticExamResult.score}%</Badge>
                          </div>
                        )}
                      </div>

                      {user.examResults && user.examResults.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Resultados de Exámenes:</h4>
                          <div className="max-h-32 overflow-y-auto space-y-1">
                            {user.examResults.slice(0, 5).map((result, index) => (
                              <div key={result.resultId || index} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                                <div className="flex-1">
                                  <p className="text-xs font-medium truncate">{result.examName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {result.correctAnswers}/{result.totalQuestions} correctas
                                  </p>
                                </div>
                                <Badge variant={result.score >= 70 ? "default" : result.score >= 50 ? "secondary" : "destructive"} className="text-xs">
                                  {result.score}%
                                </Badge>
                              </div>
                            ))}
                            {user.examResults.length > 5 && (
                              <p className="text-xs text-muted-foreground text-center">
                                ... y {user.examResults.length - 5} más
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {user.ratings && user.ratings.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Calificaciones y Comentarios
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {user.ratings.map((rating, index) => (
                        <div key={index} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${i < rating.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {format(
                                rating.date instanceof Date ? rating.date :
                                  rating.date?.toDate ? rating.date.toDate() :
                                    new Date(rating.date),
                                'd MMM yyyy',
                                { locale: es }
                              )}
                            </span>
                          </div>
                          {rating.comment && (
                            <p className="text-sm">{rating.comment}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="premium" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Crown className="h-5 w-5" />
                    Estado Premium
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isPremium ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-amber-500" />
                        <span className="font-medium">Usuario Premium Activo</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Plan:</p>
                          <Badge variant="secondary" className="mt-1">
                            {user.premiumPlan === '10-day' ? '10 Días (1 Examen)' :
                              user.premiumPlan === '30-day' ? '30 Días (3 Exámenes)' :
                                user.premiumPlan === '60-day' ? '60 Días (6 Exámenes)' :
                                  user.premiumPlan === 'permanent' ? 'Permanente' :
                                    user.premiumPlan === 'trial' ? 'Prueba' :
                                      user.premiumPlan === 'custom' ? 'Personalizado' : 'Sin Plan'}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Expira:</p>
                          <p className="text-sm font-medium">
                            {format(safeToDate(user.premiumUntil)!, 'd MMM yyyy', { locale: es })}
                          </p>
                        </div>
                      </div>
                      {premiumTimeRemaining && (
                        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                          <Clock className="h-4 w-4 text-amber-600" />
                          <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                            {premiumTimeRemaining} restante{premiumTimeRemaining.includes('hora') ? '' : 's'}
                          </span>
                        </div>
                      )}
                      <div className="text-center">
                        <p className="text-2xl font-bold text-amber-600">{user.examTokens || 0}</p>
                        <p className="text-xs text-muted-foreground">Tokens de Examen</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Crown className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">Usuario sin acceso premium</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {user.referredBy || user.referrals?.length ? (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Sistema de Referidos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {user.referredBy && (
                      <div>
                        <p className="text-sm text-muted-foreground">Referido por:</p>
                        <p className="text-sm font-medium">{user.referredBy}</p>
                      </div>
                    )}
                    {user.referrals && user.referrals.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground">Usuarios referidos:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {user.referrals.map((refId, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {refId}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : null}
            </TabsContent>

            <TabsContent value="exam" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Información de Examen - {user.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {user.examDate?.toDate() && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">Fecha del Examen:</span>
                        </div>
                        <p className="text-sm text-muted-foreground ml-6">
                          {format(user.examDate.toDate(), 'PPP', { locale: es })}
                        </p>
                      </div>

                      {user.examDateChangesCount !== undefined && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-orange-500" />
                            <span className="font-medium">Cambios de Fecha:</span>
                          </div>
                          <p className="text-sm text-muted-foreground ml-6">
                            {user.examDateChangesCount} cambios realizados
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {user.lastExamDateChange?.toDate() && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-purple-500" />
                        <span className="font-medium">Último Cambio:</span>
                      </div>
                      <p className="text-sm text-muted-foreground ml-6">
                        {format(user.lastExamDateChange.toDate(), 'PPP p', { locale: es })}
                      </p>
                    </div>
                  )}

                  {(user.examScore || user.examFeedback) && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <h4 className="font-medium flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-green-500" />
                          Retroalimentación del Examen
                        </h4>

                        {user.examScore && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Puntaje:</span>
                            <Badge variant="secondary" className="text-lg px-3 py-1">
                              {user.examScore}
                            </Badge>
                          </div>
                        )}

                        {user.examFeedback && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4 text-blue-500" />
                              <span className="text-sm font-medium">Comentarios del Examen:</span>
                            </div>
                            <div className="bg-muted p-3 rounded-lg">
                              <p className="text-sm text-muted-foreground">
                                {user.examFeedback}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {user.ratings && user.ratings.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <h4 className="font-medium flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-blue-500" />
                          Comentarios y Calificaciones
                        </h4>
                        <div className="space-y-3 max-h-40 overflow-y-auto">
                          {user.ratings.map((rating, index) => (
                            <div key={index} className="border rounded-lg p-3 bg-muted/30">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-4 w-4 ${i < rating.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
                                    />
                                  ))}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {format(
                                    rating.date instanceof Date ? rating.date :
                                      rating.date?.toDate ? rating.date.toDate() :
                                        new Date(rating.date),
                                    'd MMM yyyy',
                                    { locale: es }
                                  )}
                                </span>
                              </div>
                              {rating.comment && (
                                <p className="text-sm">{rating.comment}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {!user.examDate && !user.examScore && !user.examFeedback && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No hay información de examen registrada</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>


    </>
  );
}
