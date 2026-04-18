import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Play, Download, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";

export default function VideoAssemblyV2() {
  const [, params] = useRoute("/assembly/:projectId");
  const [, setLocation] = useLocation();
  const projectId = params?.projectId ? parseInt(params.projectId) : 0;

  const [isAssembling, setIsAssembling] = useState(false);
  const [assemblyProgress, setAssemblyProgress] = useState(0);

  const { data: project, isLoading: projectLoading, refetch } = trpc.projects.getById.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );

  const assembleVideoMutation = trpc.projects.assembleVideo.useMutation({
    onSuccess: (data) => {
      toast.success("🎉 Video ensamblado exitosamente");
      setIsAssembling(false);
      setAssemblyProgress(0);
      refetch();
    },
    onError: (error) => {
      toast.error("Error al ensamblar el video");
      setIsAssembling(false);
      setAssemblyProgress(0);
    },
  });

  const handleAssembleVideo = async () => {
    setIsAssembling(true);
    setAssemblyProgress(0);

    assembleVideoMutation.mutate(
      { projectId },
      {
        onSuccess: () => {
          setAssemblyProgress(100);
        },
        onSettled: () => {
          setIsAssembling(false);
        },
      }
    );
  };

  if (projectLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-accent mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando proyecto...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center">
        <Card className="p-8 text-center backdrop-blur-sm bg-card/80">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Proyecto no encontrado</p>
          <Button onClick={() => setLocation("/")}>Volver al Dashboard</Button>
        </Card>
      </div>
    );
  }

  const scriptContent = project.scriptContent;
  const hasAllImages = scriptContent?.scenes?.every((s: any) => project.sceneImages?.[s.sceneNumber]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation(`/images/${projectId}`)}
              className="hover:bg-accent/10"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-accent bg-clip-text text-transparent">
                {project.title}
              </h1>
              <p className="text-sm text-muted-foreground">Ensamblado de Video</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Video Preview */}
          <Card className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all">
            <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center relative group">
              {project.videoUrl ? (
                <>
                  <video
                    src={project.videoUrl}
                    className="w-full h-full"
                    controls
                    controlsList="nodownload"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                </>
              ) : (
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-accent/50 flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <Play className="w-10 h-10 text-white" />
                  </div>
                  <p className="text-muted-foreground text-lg">Tu video aparecerá aquí</p>
                  <p className="text-xs text-muted-foreground mt-2">Ensamblando {scriptContent?.scenes?.length || 0} escenas...</p>
                </div>
              )}
            </div>
          </Card>

          {/* Assembly Progress */}
          {isAssembling && (
            <Card className="p-6 border-accent/50 bg-accent/5 backdrop-blur-sm">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-accent" />
                    Ensamblando video...
                  </h3>
                  <span className="text-sm font-medium text-accent">{Math.round(assemblyProgress)}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-accent to-accent/60 transition-all duration-300"
                    style={{ width: `${assemblyProgress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Combinando imágenes, agregando subtítulos y optimizando para {project.format}...
                </p>
              </div>
            </Card>
          )}

          {/* Assembly Status */}
          <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4">Estado del Ensamblado</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${scriptContent ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className="text-sm text-foreground">Guión generado</span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${hasAllImages ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className="text-sm text-foreground">Imágenes generadas ({project.sceneImages ? Object.keys(project.sceneImages).length : 0}/{scriptContent?.scenes?.length || 0})</span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${project.videoUrl ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className="text-sm text-foreground">Video ensamblado</span>
              </div>
            </div>
          </Card>

          {/* Project Details */}
          <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4">Detalles del Proyecto</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-muted-foreground text-xs mb-1">Formato</p>
                <p className="font-medium text-foreground">
                  {project.format === 'tiktok' && 'TikTok'}
                  {project.format === 'instagram_reels_9_16' && 'IG (9:16)'}
                  {project.format === 'instagram_reels_1_1' && 'IG (1:1)'}
                  {project.format === 'youtube_shorts' && 'YT Shorts'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-muted-foreground text-xs mb-1">Plantilla</p>
                <p className="font-medium text-foreground capitalize">{project.template}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-muted-foreground text-xs mb-1">Duración</p>
                <p className="font-medium text-foreground">{scriptContent?.totalDuration || 0}s</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-muted-foreground text-xs mb-1">Escenas</p>
                <p className="font-medium text-foreground">{scriptContent?.scenes?.length || 0}</p>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => setLocation(`/images/${projectId}`)}
              className="border-border/50"
            >
              Atrás
            </Button>
            {!project.videoUrl ? (
              <Button
                onClick={handleAssembleVideo}
                disabled={!hasAllImages || isAssembling}
                className="flex-1 gap-2 bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70 shadow-lg text-white"
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
                className="flex-1 gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg text-white"
              >
                <Download className="w-4 h-4" />
                Descargar Video
              </Button>
            )}
          </div>

          {/* Info Card */}
          <Card className="p-4 bg-accent/5 border-accent/20 backdrop-blur-sm">
            <p className="text-xs text-muted-foreground">
              💡 El video será optimizado automáticamente para {project.format}. La descarga comenzará automáticamente una vez completado el ensamblado.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
