import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Wand2, RotateCw, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";

export default function ImageGenerator() {
  const [, params] = useRoute("/images/:projectId");
  const [, setLocation] = useLocation();
  const projectId = params?.projectId ? parseInt(params.projectId) : 0;

  const [generatingScenes, setGeneratingScenes] = useState<Set<number>>(new Set());

  const { data: project, isLoading: projectLoading, refetch } = trpc.projects.getById.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );

  const generateImagesMutation = trpc.projects.generateImages.useMutation({
    onSuccess: () => {
      toast.success("Imágenes generadas exitosamente");
      refetch();
    },
    onError: () => {
      toast.error("Error al generar imágenes");
    },
  });

  const regenerateSceneMutation = trpc.projects.regenerateSceneImage.useMutation({
    onSuccess: () => {
      toast.success("Imagen regenerada exitosamente");
      refetch();
    },
    onError: () => {
      toast.error("Error al regenerar imagen");
    },
  });

  const handleGenerateAllImages = () => {
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
  const sceneImages = project.sceneImages || {};

  if (!scriptContent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">No hay guión disponible</p>
          <Button onClick={() => setLocation(`/editor/${projectId}`)}>Volver al Editor</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container py-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation(`/format/${projectId}`)}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{project.title}</h1>
              <p className="text-sm text-muted-foreground">Generar Imágenes por Escena</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        <div className="mb-8">
          <Button
            onClick={handleGenerateAllImages}
            disabled={generateImagesMutation.isPending}
            className="gap-2"
            size="lg"
          >
            {generateImagesMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generando Imágenes...
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
              <Card key={scene.sceneNumber} className="overflow-hidden">
                <div className="aspect-video bg-muted flex items-center justify-center relative">
                  {imageUrl ? (
                    <>
                      <img
                        src={imageUrl}
                        alt={`Escena ${scene.sceneNumber}`}
                        className="w-full h-full object-cover"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2 gap-1"
                        onClick={() => handleRegenerateScene(scene.sceneNumber)}
                        disabled={isGenerating}
                      >
                        {isGenerating ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RotateCw className="w-3 h-3" />
                        )}
                      </Button>
                    </>
                  ) : (
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Generando...</p>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-foreground mb-1">Escena {scene.sceneNumber}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{scene.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{scene.description}</p>
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
          >
            Atrás
          </Button>
          <Button
            onClick={() => setLocation(`/assembly/${projectId}`)}
            className="flex-1"
            disabled={!scriptContent.scenes?.every((s: any) => sceneImages[s.sceneNumber])}
          >
            Continuar al Ensamblado
          </Button>
        </div>
      </div>
    </div>
  );
}
