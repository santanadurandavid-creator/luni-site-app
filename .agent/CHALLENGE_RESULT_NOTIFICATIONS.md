# Notificaciones de Resultados de Retos

## Resumen
Se ha implementado un sistema de notificaciones que informa a los usuarios sobre el resultado de un reto cuando ambos participantes han terminado de responder. Esto resuelve el problema donde un usuario cierra el modal después de terminar y no recibe información sobre quién ganó hasta que revisa el historial.

## Problema Anterior
1. Usuario A termina el reto y ve "Esperando al oponente..."
2. Usuario A cierra el modal
3. Usuario B termina el reto
4. Usuario A **NO recibe notificación** del resultado
5. Usuario A solo puede ver el resultado en el historial

## Solución Implementada
Cuando el segundo usuario termina el reto, **ambos usuarios reciben notificaciones** con el resultado:
- ✅ Notificación Push Nativa
- ✅ Notificación In-App
- ✅ Imagen de Luni
- ✅ Deep linking al modal de retos

## Flujo Completo

### Escenario: Usuario A vs Usuario B

#### 1. Usuario A termina primero
- Usuario A ve pantalla: "¡Has terminado! Tu puntuación: X/10"
- Usuario A ve: "Esperando al oponente..."
- Usuario A hace clic en "Cerrar y esperar notificación"
- Modal se cierra

#### 2. Usuario B termina después
**Cuando Usuario B responde la última pregunta:**

**Usuario A recibe** (el que ya había terminado):
- 🔔 **Notificación Push Nativa**
  - Si ganó: "¡Victoria!"
  - Si perdió: "Derrota"
  - Si empató: "¡Empate!"
  - Descripción: Resultado con puntuación (ej: "¡Ganaste el duelo de Matemáticas! 8 - 6")
  - 🖼️ Imagen: Logo de Luni
  - 🔗 Al hacer clic → Abre modal de retos con resultados

- 📬 **Notificación In-App**
  - Mismo título y descripción
  - Tipo: 
    - `success` (verde) si ganó
    - `error` (rojo) si perdió
    - `info` (azul) si empató
  - 🖼️ Imagen: Logo de Luni
  - 🔗 Al hacer clic → Abre modal de retos con resultados

**Usuario B ve** (el que acaba de terminar):
- Toast inmediato con el resultado
- Pantalla de resultados finales en el modal
- Puede cerrar el modal cuando quiera

## Detalles Técnicos

### Archivo Modificado
`src/components/profile/DuelModal.tsx`

### Lógica Implementada
```typescript
// Cuando un usuario termina la última pregunta
if (currentQuestionIndex >= challenge.questions.length - 1) {
    // Marcar como completado
    await updateDoc(doc(db, 'challenges', challenge.id), {
        [`${participantField}.completedAt`]: serverTimestamp()
    });

    // Si el oponente YA había terminado
    if (opponentParticipant.completedAt) {
        // 1. Determinar ganador
        const winnerId = ...;
        
        // 2. Actualizar reto como completado
        await updateDoc(doc(db, 'challenges', challenge.id), {
            status: 'completed',
            winnerId,
            completedAt: serverTimestamp()
        });

        // 3. Enviar notificaciones al oponente
        // - Notificación push nativa
        // - Notificación in-app
    }
}
```

### Tipos de Notificación por Resultado

#### Victoria
- **Título**: "¡Victoria!"
- **Descripción**: "¡Ganaste el duelo de [Guía]! [Tu puntuación] - [Puntuación oponente]"
- **Tipo**: `success` (verde)
- **Ejemplo**: "¡Ganaste el duelo de Matemáticas! 8 - 6"

#### Derrota
- **Título**: "Derrota"
- **Descripción**: "Perdiste el duelo de [Guía]. [Tu puntuación] - [Puntuación oponente]"
- **Tipo**: `error` (rojo)
- **Ejemplo**: "Perdiste el duelo de Matemáticas. 6 - 8"

#### Empate
- **Título**: "¡Empate!"
- **Descripción**: "Empate en el duelo de [Guía]. [Puntuación] - [Puntuación]"
- **Tipo**: `info` (azul)
- **Ejemplo**: "Empate en el duelo de Matemáticas. 7 - 7"

## Características

### ✅ Notificaciones Bidireccionales
- Ambos usuarios reciben notificación del resultado
- El que termina primero recibe notificación cuando el segundo termina
- El que termina segundo ve el resultado inmediatamente en el modal

### ✅ Información Completa
- Título claro (Victoria/Derrota/Empate)
- Puntuación final de ambos jugadores
- Nombre de la guía del duelo
- Imagen de Luni para branding consistente

### ✅ Deep Linking
- Todas las notificaciones usan `/profile?tab=retos`
- Al hacer clic, se abre el modal de retos directamente
- El usuario puede ver los detalles completos del resultado

### ✅ Colores Apropiados
- Verde para victoria (celebración)
- Rojo para derrota (motivación para mejorar)
- Azul para empate (neutral)

## Experiencia de Usuario Mejorada

### Antes
1. Usuario termina reto
2. Cierra modal
3. **No sabe cuándo el oponente termina**
4. **No recibe notificación del resultado**
5. Debe revisar historial manualmente

### Ahora
1. Usuario termina reto
2. Cierra modal con botón "Cerrar y esperar notificación"
3. **Recibe notificación push cuando el oponente termina** 🔔
4. **Notificación muestra el resultado inmediatamente** ✨
5. Hace clic en notificación → Ve resultados completos en modal

## Testing

### Probar Notificación de Victoria
1. Usuario A y Usuario B inician duelo
2. Usuario A termina primero con 8 puntos
3. Usuario A cierra el modal
4. Usuario B termina con 6 puntos
5. **Verificar**: Usuario A recibe notificación "¡Victoria! 8 - 6"
6. Usuario A hace clic → Modal de retos se abre con resultados

### Probar Notificación de Derrota
1. Usuario A y Usuario B inician duelo
2. Usuario A termina primero con 5 puntos
3. Usuario A cierra el modal
4. Usuario B termina con 7 puntos
5. **Verificar**: Usuario A recibe notificación "Derrota 5 - 7"
6. Usuario A hace clic → Modal de retos se abre con resultados

### Probar Notificación de Empate
1. Usuario A y Usuario B inician duelo
2. Usuario A termina primero con 7 puntos
3. Usuario A cierra el modal
4. Usuario B termina con 7 puntos
5. **Verificar**: Usuario A recibe notificación "¡Empate! 7 - 7"
6. Usuario A hace clic → Modal de retos se abre con resultados

## Integración con Sistema Existente

### Compatible con:
- ✅ Deep linking implementado anteriormente
- ✅ Notificaciones de nuevo reto
- ✅ Notificaciones de reto aceptado/rechazado
- ✅ Imagen de Luni en todas las notificaciones
- ✅ Service worker para notificaciones push
- ✅ Componente Notifications para notificaciones in-app

### Archivos Relacionados
- `src/components/profile/DuelModal.tsx` - Lógica de notificaciones de resultado
- `src/components/profile/ChallengesModal.tsx` - Notificaciones de reto/aceptar/rechazar
- `firebase-messaging-sw.js` - Service worker para push notifications
- `src/components/layout/Notifications.tsx` - Notificaciones in-app
- `src/components/profile/ProfileHeaderCard.tsx` - Listeners de deep linking

## Notas Importantes

1. **Solo el usuario que terminó primero recibe notificación**
   - El que termina segundo ya está viendo el modal con los resultados
   - No necesita notificación adicional

2. **Las notificaciones se envían inmediatamente**
   - No hay delay
   - El usuario recibe la notificación en cuanto el oponente termina

3. **Funciona incluso si la app está cerrada**
   - Las notificaciones push nativas funcionan en background
   - El usuario puede estar en otra app o con el navegador cerrado

4. **Imagen consistente**
   - Todas las notificaciones de retos usan la imagen de Luni
   - Branding uniforme en toda la experiencia de retos

## Mejoras Futuras Posibles

1. Sonido personalizado para notificación de victoria
2. Vibración diferente según el resultado (victoria/derrota/empate)
3. Estadísticas en la notificación (racha de victorias, etc.)
4. Botón "Revancha" en la notificación
5. Compartir resultado en redes sociales desde la notificación
