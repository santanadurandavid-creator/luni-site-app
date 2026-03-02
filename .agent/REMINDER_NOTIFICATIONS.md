# Sistema de Notificaciones de Recordatorio

## Resumen
Se ha implementado un sistema de notificaciones de recordatorio que envía mensajes motivacionales a usuarios que no han abierto la app en un período de tiempo configurado.

## Características

### ✅ Detección de Inactividad
- Rastrea la última actividad del usuario (`lastActivity`)
- Se actualiza automáticamente cuando el usuario abre la app
- Se actualiza cada 5 minutos mientras la app está abierta

### ✅ Notificaciones Motivacionales
- Mensajes variados y aleatorios
- Imagen personalizada de Luni triste
- Notificaciones push nativas + in-app

### ✅ Configuración Flexible
- Tiempo de inactividad configurable
- Actualmente: **1 minuto** (para pruebas)
- Producción: **24 horas** (descomentar en el código)

## Archivos Creados/Modificados

### 1. API Endpoint
**Archivo**: `src/app/api/notifications/send-reminders/route.ts`

**Función**: Envía notificaciones a usuarios inactivos

**Configuración**:
```typescript
// PRUEBAS (actual)
const INACTIVITY_THRESHOLD = 60 * 1000; // 1 minuto

// PRODUCCIÓN (descomentar cuando esté listo)
// const INACTIVITY_THRESHOLD = 24 * 60 * 60 * 1000; // 24 horas
```

### 2. Rastreo de Actividad
**Archivo**: `src/contexts/AuthContext.tsx`

**Función**: Actualiza `lastActivity` del usuario

**Comportamiento**:
- Se actualiza al abrir la app
- Se actualiza cada 5 minutos mientras la app está abierta
- Se guarda en Firestore como timestamp

### 3. Imagen de Notificación
**Archivo**: `public/reminder-notification.jpg`

**Descripción**: Imagen de Luni triste con mensaje motivacional

## Mensajes de Notificación

El sistema selecciona aleatoriamente uno de estos mensajes:

1. **"¡Te extrañamos! 😢"**
   - "[Nombre], vuelve a estudiar y mejora tus posibilidades de aprobar tu examen."

2. **"¡No te rindas! 💪"**
   - "[Nombre], cada día de estudio te acerca más a tu meta. ¡Vuelve!"

3. **"¡Tu éxito te espera! 🎯"**
   - "[Nombre], sigue estudiando para aumentar tus posibilidades de quedar en tu examen."

4. **"¡Continúa tu racha! 🔥"**
   - "[Nombre], no pierdas el progreso que has logrado. ¡Sigue estudiando!"

## Cómo Funciona

### Flujo Completo

1. **Usuario abre la app**
   - `AuthContext` actualiza `lastActivity` en Firestore
   - Se guarda el timestamp actual

2. **Usuario cierra la app**
   - `lastActivity` permanece con el último timestamp

3. **Pasa el tiempo configurado (1 minuto para pruebas)**
   - El usuario no ha vuelto a abrir la app

4. **Se ejecuta el endpoint `/api/notifications/send-reminders`**
   - Busca usuarios con `lastActivity` anterior al umbral
   - Verifica que tengan `fcmToken` (pueden recibir push)
   - Selecciona un mensaje aleatorio
   - Envía notificación push nativa
   - Crea notificación in-app

5. **Usuario recibe notificación**
   - 🔔 Notificación push con imagen de Luni
   - 📬 Notificación in-app
   - Al hacer clic → Abre la app en la página principal

## Cómo Probar

### Opción 1: Manual (Recomendado para pruebas)

1. **Abrir la app**
   - Iniciar sesión con tu cuenta
   - Esperar que se actualice `lastActivity`

2. **Cerrar la app completamente**
   - Cerrar el navegador o pestaña
   - Esperar 1 minuto

3. **Ejecutar el endpoint manualmente**
   ```bash
   # Desde PowerShell o terminal
   curl -X POST http://localhost:3000/api/notifications/send-reminders
   
   # O desde el navegador
   # Abrir: http://localhost:3000/api/notifications/send-reminders
   ```

4. **Verificar notificación**
   - Deberías recibir notificación push (si tienes permisos)
   - Deberías ver notificación in-app al abrir la app

### Opción 2: Automatizado (Producción)

Para producción, necesitas configurar un cron job que ejecute el endpoint periódicamente.

#### Usando Firebase Scheduled Functions

1. **Crear función programada** (requiere plan Blaze de Firebase):

```typescript
// functions/src/index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const sendReminders = functions.pubsub
  .schedule('every 1 hours') // Ejecutar cada hora
  .timeZone('America/Mexico_City')
  .onRun(async (context) => {
    // Llamar al endpoint
    const response = await fetch('https://tu-dominio.com/api/notifications/send-reminders', {
      method: 'POST'
    });
    
    const result = await response.json();
    console.log('Reminders sent:', result);
    
    return null;
  });
```

#### Usando un servicio externo (EasyCron, Cron-job.org, etc.)

1. Configurar un cron job que haga POST a:
   ```
   https://tu-dominio.com/api/notifications/send-reminders
   ```

2. Frecuencia recomendada: Cada 1-6 horas

## Configuración para Producción

### 1. Cambiar el umbral de inactividad

En `src/app/api/notifications/send-reminders/route.ts`:

```typescript
// Comentar esta línea:
// const INACTIVITY_THRESHOLD = 60 * 1000; // 1 minuto

// Descomentar esta línea:
const INACTIVITY_THRESHOLD = 24 * 60 * 60 * 1000; // 24 horas
```

### 2. Configurar cron job

Opciones:
- Firebase Scheduled Functions (requiere plan Blaze)
- Servicio externo de cron jobs
- Cloud Scheduler de Google Cloud

### 3. Ajustar frecuencia

Recomendaciones:
- **Cada 6 horas**: Balance entre engagement y no ser molesto
- **Cada 12 horas**: Menos frecuente, más respetuoso
- **Cada 24 horas**: Una vez al día, muy conservador

## Estructura de Datos

### Campo en Firestore (users collection)

```typescript
{
  id: string,
  name: string,
  email: string,
  fcmToken: string, // Requerido para notificaciones push
  lastActivity: Timestamp, // Última vez que abrió la app
  // ... otros campos
}
```

## Respuesta del Endpoint

```json
{
  "success": true,
  "inactiveUsersCount": 5,
  "results": [
    {
      "userId": "user123",
      "success": true,
      "message": "Notification sent"
    },
    {
      "userId": "user456",
      "success": false,
      "error": "Invalid FCM token"
    }
  ]
}
```

## Consideraciones

### ✅ Ventajas
- Aumenta el engagement de usuarios
- Mensajes motivacionales personalizados
- Imagen atractiva y relevante
- No requiere intervención manual

### ⚠️ Consideraciones
- **No molestar**: No enviar notificaciones muy frecuentemente
- **Respeto al usuario**: Permitir desactivar notificaciones
- **Costos**: Las notificaciones push tienen límites en el plan gratuito
- **Permisos**: El usuario debe haber aceptado notificaciones push

### 🔒 Seguridad
- El endpoint es público pero solo envía notificaciones
- No expone datos sensibles
- Considera agregar autenticación si es necesario

## Métricas Sugeridas

Para medir el éxito del sistema:

1. **Tasa de retorno**
   - % de usuarios que vuelven después de recibir notificación

2. **Tiempo de respuesta**
   - Cuánto tardan en volver después de la notificación

3. **Engagement**
   - Actividad de usuarios que recibieron vs no recibieron

4. **Opt-out**
   - % de usuarios que desactivan notificaciones

## Mejoras Futuras

1. **Personalización por tipo de usuario**
   - Mensajes diferentes según el examen que preparan
   - Recordatorios de temas específicos

2. **Frecuencia adaptativa**
   - Más frecuente para usuarios muy inactivos
   - Menos frecuente para usuarios regulares

3. **A/B Testing**
   - Probar diferentes mensajes
   - Optimizar horarios de envío

4. **Segmentación**
   - Por nivel de progreso
   - Por proximidad al examen
   - Por plan (free vs premium)

5. **Preferencias de usuario**
   - Permitir configurar frecuencia
   - Permitir desactivar completamente
   - Elegir horarios preferidos

## Testing Checklist

- [ ] Verificar que `lastActivity` se actualiza al abrir la app
- [ ] Verificar que `lastActivity` se actualiza cada 5 minutos
- [ ] Cerrar app y esperar 1 minuto
- [ ] Ejecutar endpoint manualmente
- [ ] Verificar que llega notificación push
- [ ] Verificar que llega notificación in-app
- [ ] Verificar que la imagen se muestra correctamente
- [ ] Verificar que el mensaje es aleatorio
- [ ] Verificar que solo se envía a usuarios con `fcmToken`
- [ ] Verificar que no se envía a usuarios activos

## Soporte

Si hay problemas:

1. **Verificar logs del servidor**
   ```bash
   # Ver logs de Next.js
   npm run dev
   ```

2. **Verificar Firestore**
   - Comprobar que `lastActivity` existe en usuarios
   - Comprobar que `fcmToken` existe

3. **Verificar permisos de notificaciones**
   - En el navegador: Configuración → Permisos → Notificaciones

4. **Verificar service worker**
   - DevTools → Application → Service Workers
   - Debe estar activo `firebase-messaging-sw.js`
