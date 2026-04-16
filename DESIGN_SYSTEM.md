# Sistema de Diseño - ProVideoGen

## Paleta de Colores Elegante y Sofisticada

### Colores Primarios
- **Oscuro Profundo:** `#0f0f1e` - Fondo principal, transmite sofisticación
- **Blanco Puro:** `#ffffff` - Texto principal, contraste máximo
- **Gris Elegante:** `#e8e8f0` - Fondos secundarios, bordes sutiles

### Colores de Acento
- **Púrpura Vibrante:** `#7c3aed` - Botones principales, acciones destacadas
- **Púrpura Claro:** `#a78bfa` - Hover states, elementos interactivos
- **Púrpura Oscuro:** `#6d28d9` - Estados activos, énfasis

### Colores Funcionales
- **Verde Éxito:** `#10b981` - Estados completados, confirmaciones
- **Rojo Error:** `#ef4444` - Errores, advertencias
- **Azul Información:** `#3b82f6` - Información, tips
- **Ámbar Alerta:** `#f59e0b` - Procesos en curso, advertencias suaves

## Tipografía

### Fuentes
- **Encabezados:** Inter (600-700 weight) - Moderna, limpia
- **Cuerpo:** Inter (400-500 weight) - Legible, profesional
- **Monoespaciada:** Fira Code - Para código, prompts, datos técnicos

### Tamaños
- **H1:** 36px (2.25rem) - Títulos principales
- **H2:** 28px (1.75rem) - Subtítulos, secciones
- **H3:** 20px (1.25rem) - Encabezados secundarios
- **Body:** 16px (1rem) - Texto principal
- **Small:** 14px (0.875rem) - Textos secundarios, labels
- **Tiny:** 12px (0.75rem) - Hints, metadata

## Espaciado

Usar múltiplos de 4px para mantener consistencia:
- **xs:** 4px
- **sm:** 8px
- **md:** 16px
- **lg:** 24px
- **xl:** 32px
- **2xl:** 48px
- **3xl:** 64px

## Sombras

- **Sutil:** `0 1px 2px rgba(0,0,0,0.05)` - Bordes, separadores
- **Pequeña:** `0 4px 6px rgba(0,0,0,0.1)` - Cards, inputs
- **Media:** `0 10px 15px rgba(0,0,0,0.15)` - Modales, dropdowns
- **Grande:** `0 20px 25px rgba(0,0,0,0.2)` - Overlays, prominencia

## Bordes

- **Radio Pequeño:** 4px - Inputs, botones pequeños
- **Radio Medio:** 8px - Cards, componentes medianos
- **Radio Grande:** 12px - Modales, componentes grandes
- **Radio Completo:** 9999px - Pills, avatares

## Transiciones

- **Rápida:** 150ms - Hover states, cambios de color
- **Normal:** 300ms - Abrir/cerrar modales, cambios de tamaño
- **Lenta:** 500ms - Animaciones complejas, transiciones de página

## Principios de Diseño

1. **Minimalismo Sofisticado:** Menos es más. Cada elemento debe tener propósito.
2. **Espaciado Generoso:** Usar espaciado amplio para crear respiro visual.
3. **Contraste Claro:** Asegurar legibilidad y jerarquía visual.
4. **Micro-interacciones:** Feedback sutil en cada interacción.
5. **Consistencia:** Aplicar patrones uniformes en toda la interfaz.
6. **Accesibilidad:** Ratios de contraste WCAG AA mínimo.

## Componentes Clave

### Botones
- **Primario:** Fondo púrpura, texto blanco, hover más oscuro
- **Secundario:** Borde púrpura, texto púrpura, fondo transparente
- **Terciario:** Texto púrpura, sin borde, hover con fondo sutil

### Cards
- Fondo blanco con sombra sutil
- Padding generoso (24px)
- Borde superior de 3px en color de acento

### Inputs
- Borde gris elegante (1px)
- Focus: borde púrpura con sombra sutil
- Placeholder: gris más claro
- Padding: 12px 16px

### Modales
- Overlay oscuro (rgba(0,0,0,0.5))
- Card con sombra grande
- Cierre con ESC o botón X
- Transición suave de entrada/salida
