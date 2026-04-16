# Arquitectura de ProVideoGen

## Visión General

ProVideoGen es una plataforma de generación automática de videos cortos para redes sociales, asistida por inteligencia artificial. El flujo de usuario sigue un proceso lineal: tema → guión → formato → imágenes → video → descarga.

## Stack Tecnológico

**Frontend:** React 19 + Tailwind CSS 4 + shadcn/ui  
**Backend:** Express 4 + tRPC 11 + Node.js  
**Base de Datos:** MySQL/TiDB  
**Generación de IA:** OpenAI GPT-4 (guiones), Manus Image Generation (imágenes)  
**Ensamblado de Video:** Remotion (composición de video) + FFmpeg (renderizado final)  
**Almacenamiento:** S3 (videos generados)

## Esquema de Base de Datos

### Tabla: `projects`
Almacena los proyectos de video del usuario.

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | INT | Clave primaria, auto-incrementada |
| `userId` | INT | Referencia a la tabla `users` |
| `title` | VARCHAR(255) | Título del proyecto |
| `description` | TEXT | Descripción del tema/contenido |
| `status` | ENUM | Estado: `draft`, `generating`, `completed`, `failed` |
| `format` | ENUM | Formato: `tiktok`, `instagram_reels_9_16`, `instagram_reels_1_1`, `youtube_shorts` |
| `template` | ENUM | Plantilla: `corporate`, `modern`, `minimalist` |
| `scriptContent` | JSON | Guión estructurado por escenas |
| `sceneImages` | JSON | URLs de imágenes generadas por escena |
| `videoUrl` | VARCHAR(512) | URL del video final en S3 |
| `duration` | INT | Duración del video en segundos |
| `createdAt` | TIMESTAMP | Fecha de creación |
| `updatedAt` | TIMESTAMP | Fecha de última actualización |

### Tabla: `scenes`
Almacena las escenas de cada proyecto.

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | INT | Clave primaria, auto-incrementada |
| `projectId` | INT | Referencia a la tabla `projects` |
| `sceneNumber` | INT | Número de escena (orden) |
| `title` | VARCHAR(255) | Título de la escena |
| `description` | TEXT | Descripción de la escena |
| `imageUrl` | VARCHAR(512) | URL de la imagen generada |
| `imagePrompt` | TEXT | Prompt usado para generar la imagen |
| `subtitles` | TEXT | Subtítulos de la escena |
| `duration` | INT | Duración en segundos |
| `createdAt` | TIMESTAMP | Fecha de creación |

### Tabla: `templates`
Almacena las plantillas de estilo visual predefinidas.

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | INT | Clave primaria, auto-incrementada |
| `name` | VARCHAR(100) | Nombre de la plantilla |
| `type` | ENUM | Tipo: `corporate`, `modern`, `minimalist` |
| `config` | JSON | Configuración: colores, fuentes, efectos |
| `createdAt` | TIMESTAMP | Fecha de creación |

## Flujo de Datos

```
Usuario describe tema
    ↓
Backend genera guión con LLM (OpenAI)
    ↓
Usuario selecciona formato y plantilla
    ↓
Backend genera imágenes por escena (Manus Image Generation)
    ↓
Backend ensambla video con Remotion
    ↓
Backend renderiza y sube a S3
    ↓
Usuario descarga o visualiza en plataforma
```

## Componentes Frontend Principales

- **Dashboard:** Panel de control con historial de proyectos y estadísticas
- **ScriptEditor:** Editor de guiones con asistencia de IA
- **FormatSelector:** Selector de formato y plataforma destino
- **TemplateLibrary:** Biblioteca de plantillas de estilo visual
- **ImageGenerator:** Generador de imágenes por escena
- **VideoAssembly:** Ensamblado y renderizado de video
- **VideoPlayer:** Reproductor integrado con descarga

## Procedimientos tRPC

### Proyectos
- `projects.create(description, format, template)` → Crea nuevo proyecto
- `projects.list()` → Lista proyectos del usuario
- `projects.getById(projectId)` → Obtiene detalles de un proyecto
- `projects.update(projectId, data)` → Actualiza un proyecto
- `projects.duplicate(projectId)` → Duplica un proyecto
- `projects.delete(projectId)` → Elimina un proyecto

### Guiones
- `scripts.generate(description)` → Genera guión con LLM
- `scripts.update(projectId, scriptContent)` → Actualiza guión manualmente

### Imágenes
- `images.generate(projectId)` → Genera imágenes para todas las escenas
- `images.regenerateScene(projectId, sceneNumber)` → Regenera imagen de una escena

### Videos
- `videos.assemble(projectId)` → Ensambla video con Remotion
- `videos.getDownloadUrl(projectId)` → Obtiene URL de descarga

## Consideraciones de Diseño

- **Elegancia Visual:** Paleta de colores sofisticada, tipografía cuidada, espaciado generoso
- **Flujo Lineal:** Cada paso del proceso guía al usuario de manera clara y lógica
- **Feedback en Tiempo Real:** Indicadores de progreso durante generación de IA y ensamblado
- **Gestión de Errores:** Manejo graceful de fallos en generación de IA o renderizado
- **Optimización:** Caché de guiones generados, reutilización de imágenes, compresión de video
