# Plan de Implementación - Funciones Pendientes ProVideoGen

## Fase 1: Remotion Integration
- [ ] Instalar Remotion y dependencias (ffmpeg, sharp)
- [ ] Crear composición Remotion con estructura base
- [ ] Implementar animaciones de texto (fade-in, slide-in, typewriter)
- [ ] Implementar transiciones entre escenas (fade, slide, zoom)
- [ ] Implementar efectos de zoom/pan sobre imágenes
- [ ] Integrar subtítulos animados en composición
- [ ] Crear procedimiento tRPC para renderizar video con Remotion
- [ ] Actualizar VideoAssemblyV2 para usar Remotion

## Fase 2: Editor Manual de Guiones
- [ ] Crear componente ScriptEditorManual
- [ ] Implementar edición de texto por escena
- [ ] Implementar reordenamiento de escenas (drag-drop)
- [ ] Implementar ajuste de duraciones
- [ ] Implementar agregar/eliminar escenas
- [ ] Integrar en flujo: después de generar guión, opción de editar
- [ ] Guardar cambios en base de datos

## Fase 3: TTS + Música
- [ ] Integrar OpenAI TTS para narración
- [ ] Crear procedimiento tRPC para generar narración
- [ ] Crear biblioteca de música libre de derechos (Freepik, Pixabay)
- [ ] Implementar selector de música por escena
- [ ] Integrar narración y música en composición Remotion

## Fase 4: Subtítulos Animados + Vista Previa
- [ ] Implementar subtítulos karaoke (word-by-word)
- [ ] Implementar subtítulos fade-in
- [ ] Integrar subtítulos en composición Remotion
- [ ] Crear vista previa en tiempo real (usando Remotion Player)
- [ ] Optimizar rendimiento de preview

## Fase 5: Multi-Formato + Pruebas
- [ ] Implementar exportación multi-formato
- [ ] Generar TikTok (9:16) + Instagram (9:16 y 1:1) + YouTube (9:16) en paralelo
- [ ] Crear procedimiento tRPC para exportación
- [ ] Pruebas E2E completas
- [ ] Optimizaciones finales

## Dependencias a instalar
- remotion: ^4.0.0
- @remotion/cli: ^4.0.0
- ffmpeg-static: ^6.0.0
- sharp: ^0.33.0
- openai: ^4.0.0

## Notas
- Remotion requiere Node.js 16+
- FFmpeg debe estar disponible en el sistema
- OpenAI TTS tiene límites de rate (3500 RPM)
- Música libre: usar APIs de Freepik, Pixabay, o Unsplash
