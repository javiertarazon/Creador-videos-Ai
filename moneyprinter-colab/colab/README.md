# Sistema de creación de vídeo en Colab

Usa [`MoneyPrinterTurbo_Colab.ipynb`](MoneyPrinterTurbo_Colab.ipynb) para iniciar el sistema completo:

- MoneyPrinterTurbo API y WebUI.
- Búsqueda de ideas públicas y ScrapeGraphAI con NVIDIA NIM.
- Guiones originales con el endpoint OpenAI-compatible de NVIDIA.
- Clips propios desde Google Drive.
- Render vertical con imágenes Qwen-Image y composición Remotion.

## Primer uso

1. Abre el notebook con Google Colab y elige una GPU.
2. Añade `NVIDIA_API_KEY` y `NVIDIA_MODEL` a **Secrets** de Colab y habilita el acceso.
3. Opcionalmente añade `YOUTUBE_API_KEY`, `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_USER_ID`,
   `TIKTOK_RESEARCH_CLIENT_KEY` y `TIKTOK_RESEARCH_CLIENT_SECRET` para las fuentes oficiales que tengas
   aprobadas.
4. Ejecuta todas las celdas y monta Drive.
5. Copia tus propios clips a `Mi unidad/MoneyPrinterTurbo/videos-originales/`.
6. Abre la WebUI por el enlace protegido que imprime el notebook. Genera el ZIP de Remotion y colócalo en
   `Mi unidad/MoneyPrinterTurbo/remotion-inbox/`; la última celda guarda el MP4 en `renders/`.

No introduzcas claves en las celdas, en Git o en Drive. El notebook las obtiene de Colab Secrets y las escribe
solo en el runtime temporal. No subas vídeos de terceros ni datos privados al buscador.

El notebook requiere conexión a Internet y espacio para descargar dependencias y el modelo de imagen. Qwen
usa la GPU; el render Remotion usa mayormente CPU/RAM. La disponibilidad y el coste/cuota de Colab y NVIDIA
dependen de tu cuenta. Revisa las licencias de Qwen-Image-2.1 y Remotion antes de uso comercial.
