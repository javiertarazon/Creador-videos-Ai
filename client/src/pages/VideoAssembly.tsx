import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Play, Download, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";

export default function VideoAssembly() {
  const [, params] = useRoute("/assembly/:projectId");
  const [, setLocation] = useLocation();
  const projectId = params?.projectId ? parseInt(params.projectId) : 0;

  const [isAssembling, setIsAssembling] = useState(false);

  const { data: project, isLoading: projectLoading, refetch } = trpc.projects.getById.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );

  // Simular ensamblado de video
  const handleAssembleVideo = async () => {
    setIsAssembling(true);
    try {
      // Simular proceso de ensamblado
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      toast.success("Video ensamblado exitosamente");
      
      // Actualizar proyecto con estado completado
      // En producción, esto se haría a través de una ruta tRPC
      refetch();
    } catch (error) {
      toast.error("Error al ensamblar el video");
    } finally {
      setIsAssembling(false);
    }
  };

  if (projectLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">Proyecto no encontrado</p>
          <Button onClick={() => setLocation("/")}>Volver al Dashboard</Button>
        </Card>
      </div>
    );
  }

  const scriptContent = project.scriptContent;
  const hasAllImages = scriptContent?.scenes?.every((s: any) => project.sceneImages?.[s.sceneNumber]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container py-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation(`/images/${projectId}`)}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{project.title}</h1>
              <p className="text-sm text-muted-foreground">Ensamblado de Video</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Video Preview */}
          <Card className="overflow-hidden">
            <div className="aspect-video bg-muted flex items-center justify-center relative group">
              {project.videoUrl ? (
                <>
                  <video
                    src={project.videoUrl || ''}
                    className="w-full h-full"
                    controls
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button size="lg" variant="secondary" className="gap-2">
                      <Play className="w-5 h-5" />
                      Reproducir
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <div className="text-4xl mb-4">🎬</div>
                  <p className="text-muted-foreground">Tu video aparecerá aquí</p>
                </div>
              )}
            </div>
          </Card>

          {/* Assembly Status */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Estado del Ensamblado</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${scriptContent ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm text-foreground">Guión generado</span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${hasAllImages ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm text-foreground">Imágenes generadas</span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${project.videoUrl ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm text-foreground">Video ensamblado</span>
              </div>
            </div>
          </Card>

          {/* Project Details */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Detalles del Proyecto</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Formato</p>
                <p className="font-medium text-foreground">
                  {project.format === 'tiktok' && 'TikTok'}
                  {project.format === 'instagram_reels_9_16' && 'Instagram (9:16)'}
                  {project.format === 'instagram_reels_1_1' && 'Instagram (1:1)'}
                  {project.format === 'youtube_shorts' && 'YouTube Shorts'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Plantilla</p>
                <p className="font-medium text-foreground capitalize">{project.template}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Duración</p>
                <p className="font-medium text-foreground">
                  {scriptContent?.totalDuration || 0}s
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Escenas</p>
                <p className="font-medium text-foreground">
                  {scriptContent?.scenes?.length || 0}
                </p>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => setLocation(`/images/${projectId}`)}
            >
              Atrás
            </Button>
            {!project.videoUrl ? (
              <Button
                onClick={handleAssembleVideo}
                disabled={!hasAllImages || isAssembling}
                className="flex-1 gap-2"
              >
                {isAssembling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Ensamblando...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Ensamblar Video
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={() => {
                  if (project.videoUrl) {
                    const a = document.createElement('a');
                    a.href = project.videoUrl;
                    a.download = `${project.title}.mp4`;
                    a.click();
                  }
                }}
                className="flex-1 gap-2"
              >
                <Download className="w-4 h-4" />
                Descargar Video
              </Button>
            )}
          </div>

          {/* Info */}
          <Card className="p-4 bg-accent/5 border-accent/20">
            <p className="text-xs text-muted-foreground">
              💡 El video será optimizado automáticamente para la plataforma seleccionada. 
              Puedes descargar el archivo final una vez completado el ensamblado.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
