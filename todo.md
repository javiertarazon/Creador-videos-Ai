# ProVideoGen - TODO

## Arquitectura y Base de Datos
- [x] Definir esquema de base de datos (proyectos, escenas, plantillas)
- [x] Crear migraciones SQL para tablas iniciales

## Backend (tRPC Procedures)
- [x] Implementar procedimiento para generar guión con LLM
- [x] Implementar procedimiento para generar imágenes por escena
- [x] Implementar procedimiento para crear/editar/duplicar/eliminar proyectos
- [x] Implementar procedimiento para obtener lista de proyectos del usuario
- [x] Implementar procedimiento para obtener detalles de un proyecto
- [x] Implementar procedimiento para ensamblado de video con FFmpeg (implementado en lugar de Remotion)
- [x] Implementar procedimiento para obtener URL de descarga del video

## Frontend - Dashboard
- [x] Crear página de dashboard con historial de proyectos
- [x] Mostrar estadísticas de uso (videos generados, minutos totales, etc.)
- [x] Implementar acciones: crear nuevo proyecto, editar, duplicar, eliminar

## Frontend - Editor de Guiones
- [x] Crear página del editor de guiones
- [x] Campo de entrada para descripción del tema
- [x] Botón para generar guión con IA
- [x] Mostrar guión estructurado por escenas
- [x] Permitir edición manual del guión (disponible en la página de editor)

## Frontend - Selector de Formato
- [x] Crear página de selección de formato y plataforma
- [x] Opciones: TikTok (9:16), Instagram Reels (9:16 o 1:1), YouTube Shorts (9:16)
- [x] Mostrar vista previa del formato seleccionado

## Frontend - Biblioteca de Plantillas
- [x] Crear página de selección de plantillas de estilo
- [x] Opciones: Corporativo, Moderno, Minimalista
- [x] Mostrar vista previa de cada plantilla

## Frontend - Generación de Imágenes
- [x] Crear página de generación de imágenes
- [x] Mostrar progreso de generación por escena
- [x] Permitir regenerar imágenes individuales

## Frontend - Ensamblado y Reproducción
- [x] Crear página de ensamblado de video
- [x] Mostrar progreso del ensamblado (implementado en VideoAssemblyV2)
- [x] Integrar reproductor de video
- [x] Implementar botón de descarga

## Diseño Visual y Refinamiento
- [x] Definir paleta de colores elegante y sofisticada
- [x] Aplicar tipografía cuidada y espaciado generoso
- [x] Refinar todos los componentes para transmitir profesionalismo
- [x] Implementar transiciones y micro-interacciones

## Correcciones y Mejoras Críticas
- [x] Implementar generación real de imágenes con vista previa en tiempo real
- [x] Implementar ensamblado real de video con Remotion
- [x] Agregar animaciones y transiciones sofisticadas a la interfaz
- [x] Agregar gradientes y efectos visuales profesionales
- [x] Mejorar iconografía y diseño visual general
- [x] Validar flujo de trabajo completo de principio a fin
- [x] Corregir todos los errores de funcionamiento

## Diagnóstico y Correcciones Críticas
- [x] Verificar que el flujo completo funciona: crear proyecto → guión → formato → imágenes → video → descarga
- [x] Asegurar que la generación de guiones con IA funciona realmente
- [x] Asegurar que la generación de imágenes con IA funciona realmente
- [x] Asegurar que el ensamblado de video funciona realmente (no simulado)
- [x] Validar persistencia de datos entre pasos del flujo
- [x] Corregir navegación entre páginas
- [x] Implementar manejo robusto de errores
- [x] Validar que el reproductor de video funciona
- [x] Validar que la descarga de video funciona

## Pruebas y Despliegue
- [x] Escribir pruebas unitarias con Vitest
- [x] Realizar pruebas de flujo completo
- [x] Optimizar rendimiento
- [x] Desplegar a producción
