import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Wand2, RotateCw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";

export default function ImageGeneratorV2() {
  const [, params] = useRoute("/images/:projectId");
  const [, setLocation] = useLocation();
  const projectId = params?.projectId ? parseInt(params.projectId) : 0;

  const [generatingScenes, setGeneratingScenes] = useState<Set<number>>(new Set());
  const [allGenerating, setAllGenerating] = useState(false);

  const { data: project, isLoading: projectLoading, refetch } = trpc.projects.getById.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );

  const generateImagesMutation = trpc.projects.generateImages.useMutation({
    onSuccess: () => {
      toast.success("✨ Todas las imágenes generadas exitosamente");
      setAllGenerating(false);
      refetch();
    },
    onError: (error) => {
      toast.error("Error al generar imágenes");
      setAllGenerating(false);
    },
  });

  const regenerateSceneMutation = trpc.projects.regenerateSceneImage.useMutation({
    onSuccess: () => {
      toast.success("Imagen regenerada");
      refetch();
    },
    onError: () => {
      toast.error("Error al regenerar imagen");
    },
  });

  const handleGenerateAllImages = () => {
    setAllGenerating(true);
    generateImagesMutation.mutate({ projectId });
  };

  const handleRegenerateScene = (sceneNumber: number) => {
    setGeneratingScenes(prev => new Set(prev).add(sceneNumber));
    regenerateSceneMutation.mutate(
      { projectId, sceneNumber },
      {
        onSettled: () => {
          setGeneratingScenes(prev => {
            const next = new Set(prev);
            next.delete(sceneNumber);
            return next;
          });
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
  const sceneImages = project.sceneImages || {};

  if (!scriptContent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center">
        <Card className="p-8 text-center backdrop-blur-sm bg-card/80">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No hay guión disponible</p>
          <Button onClick={() => setLocation(`/editor/${projectId}`)}>Volver al Editor</Button>
        </Card>
      </div>
    );
  }

  const totalScenes = scriptContent.scenes?.length || 0;
  const generatedScenes = Object.keys(sceneImages).length;
  const progressPercent = Math.round((generatedScenes / totalScenes) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation(`/format/${projectId}`)}
              className="hover:bg-accent/10"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-accent bg-clip-text text-transparent">
                {project.title}
              </h1>
              <p className="text-sm text-muted-foreground">Generar Imágenes por Escena</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-accent">{progressPercent}%</div>
              <p className="text-xs text-muted-foreground">{generatedScenes}/{totalScenes}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">Progreso General</h2>
            <span className="text-sm font-medium text-accent">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent to-accent/60 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Generate All Button */}
        <div className="mb-8">
          <Button
            onClick={handleGenerateAllImages}
            disabled={generateImagesMutation.isPending || progressPercent === 100}
            className="gap-2 w-full md:w-auto bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70 shadow-lg hover:shadow-xl transition-all"
            size="lg"
          >
            {generateImagesMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generando Imágenes...
              </>
            ) : progressPercent === 100 ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Todas Generadas
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Generar Todas las Imágenes
              </>
            )}
          </Button>
        </div>

        {/* Scenes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scriptContent.scenes?.map((scene: any) => {
            const imageUrl = sceneImages[scene.sceneNumber];
            const isGenerating = generatingScenes.has(scene.sceneNumber);

            return (
              <Card
                key={scene.sceneNumber}
                className="overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm hover:border-accent/50"
              >
                {/* Image Container */}
                <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center relative group overflow-hidden">
                  {imageUrl ? (
                    <>
                      <img
                        src={imageUrl}
                        alt={`Escena ${scene.sceneNumber}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute top-2 right-2 gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg"
                        onClick={() => handleRegenerateScene(scene.sceneNumber)}
                        disabled={isGenerating}
                      >
                        {isGenerating ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RotateCw className="w-3 h-3" />
                        )}
                      </Button>
                      <div className="absolute top-2 left-2 bg-green-500/90 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Generada
                      </div>
                    </>
                  ) : (
                    <div className="text-center">
                      <div className="relative w-12 h-12 mx-auto mb-2">
                        <div className="absolute inset-0 bg-gradient-to-r from-accent to-accent/50 rounded-full animate-pulse" />
                      </div>
                      <p className="text-xs text-muted-foreground">Generando...</p>
                    </div>
                  )}
                </div>

                {/* Scene Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-foreground">Escena {scene.sceneNumber}</h3>
                      <p className="text-sm text-muted-foreground">{scene.title}</p>
                    </div>
                    <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded font-medium">
                      {scene.duration}s
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{scene.description}</p>
                  <p className="text-xs italic text-muted-foreground line-clamp-1">"{scene.subtitles}"</p>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Continue Button */}
        <div className="mt-12 flex gap-4">
          <Button
            variant="outline"
            onClick={() => setLocation(`/format/${projectId}`)}
            className="border-border/50"
          >
            Atrás
          </Button>
          <Button
            onClick={() => setLocation(`/assembly/${projectId}`)}
            className="flex-1 bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70 shadow-lg"
            disabled={progressPercent < 100}
          >
            {progressPercent === 100 ? "Continuar al Ensamblado" : `Genera todas las imágenes (${progressPercent}%)`}
          </Button>
        </div>
      </div>
    </div>
  );
}
