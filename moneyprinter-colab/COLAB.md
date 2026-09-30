# Sistema completo en Google Colab

Abre `colab/MoneyPrinterTurbo_Colab.ipynb` en Google Colab y ejecuta las celdas en orden. El notebook clona
este repositorio y MoneyPrinterTurbo en el almacenamiento temporal `/content`, instala la API y la WebUI en
un commit verificado del fork `javiertarazon/MoneyPrinterTurbo`, instala la API y la WebUI en un entorno
virtual separado del scraper, arranca los tres servicios y permite renderizar con Qwen-Image + Remotion en la
GPU.

## Preparación

1. En Colab selecciona **Entorno de ejecución → Cambiar tipo de entorno de ejecución → GPU**.
2. Abre el panel **Secrets** y crea `NVIDIA_API_KEY` y `NVIDIA_MODEL`. Habilita el acceso para este notebook.
   Usa credenciales activas; no las escribas en celdas ni las guardes en Drive.
3. Opcional: crea `YOUTUBE_API_KEY`, `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_USER_ID`,
   `TIKTOK_RESEARCH_CLIENT_KEY` y `TIKTOK_RESEARCH_CLIENT_SECRET` en Secrets para habilitar las fuentes
   oficiales para las que tu cuenta tenga acceso.
4. Ejecuta el notebook y autoriza el montaje de Google Drive.
5. Copia tus vídeos propios a `Mi unidad/MoneyPrinterTurbo/videos-originales/`.
6. Abre la WebUI con el enlace de proxy autenticado que imprime Colab. Usa **Idea a video** para buscar,
   generar un guion, seleccionar clips propios y preparar un ZIP.
7. Guarda el ZIP descargado en `Mi unidad/MoneyPrinterTurbo/remotion-inbox/` y ejecuta la última celda para
   generar el vídeo. El MP4, imágenes y manifiestos quedan en `renders/`.

La clave NVIDIA se usa para el guion de MoneyPrinterTurbo y para resumir páginas públicas en ScrapeGraphAI.
El notebook crea ambos archivos de configuración solo en el disco temporal del runtime. El repositorio no
recibe claves ni credenciales. Los informes, planes, biblioteca importada y renders se guardan en Drive.

## Límites y privacidad

- El proxy de Colab permite abrir la aplicación desde el notebook autenticado; no se crea un túnel público.
- La GPU de Colab se usa para generar imágenes Qwen; Remotion/FFmpeg consume principalmente CPU y RAM.
- Colab no garantiza acceso a una GPU concreta, memoria ni tiempo de sesión. El render puede necesitar una GPU
  con memoria suficiente. Los pesos de Qwen se descargan en el runtime temporal y pueden volver a descargarse.
- ScrapeGraphAI consulta páginas públicas indexadas. No inicia sesión, no descarga vídeos de referencia ni
  elude bloqueos. Disponibilidad, límites y costes de NVIDIA y de las APIs oficiales dependen de sus cuentas.
- Qwen-Image-2.1 y Remotion tienen licencias propias. Revisa sus términos antes de monetizar o distribuir.

`Remotion_Qwen_Colab.ipynb` se conserva como opción reducida cuando solo se necesita renderizar un ZIP y ya
se dispone de MoneyPrinterTurbo ejecutándose en otro entorno.
