import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Wand2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";

export default function ScriptEditor() {
  const [, params] = useRoute("/editor/:projectId");
  const [, setLocation] = useLocation();
  const projectId = params?.projectId ? parseInt(params.projectId) : 0;

  const [topic, setTopic] = useState("");
  const [scriptContent, setScriptContent] = useState<any>(null);

  const { data: project, isLoading: projectLoading } = trpc.projects.getById.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );

  const generateScriptMutation = trpc.projects.generateScript.useMutation({
    onSuccess: (data) => {
      setScriptContent(data.script);
      setTopic("");
      toast.success("Guión generado exitosamente");
    },
    onError: (error) => {
      toast.error("Error al generar el guión");
    },
  });

  useEffect(() => {
    if (project?.scriptContent) {
      try {
        const parsed = typeof project.scriptContent === 'string' 
          ? JSON.parse(project.scriptContent) 
          : project.scriptContent;
        setScriptContent(parsed);
      } catch (e) {
        console.error('Error parsing scriptContent:', e);
        setScriptContent(null);
      }
    }
  }, [project]);

  const handleGenerateScript = () => {
    if (!topic.trim()) {
      toast.error("Por favor describe el tema del video");
      return;
    }
    generateScriptMutation.mutate({ projectId, topic });
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container py-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{project.title}</h1>
              <p className="text-sm text-muted-foreground">Editor de Guión</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Input Section */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Describe tu Video</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Tema o Descripción</label>
                  <Textarea
                    placeholder="Ej: Un tutorial sobre cómo hacer café latte perfecto en casa"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="mt-2 min-h-32"
                  />
                </div>
                <Button
                  onClick={handleGenerateScript}
                  disabled={generateScriptMutation.isPending || !topic.trim()}
                  className="w-full gap-2"
                >
                  {generateScriptMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      Generar Guión con IA
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>

          {/* Script Display Section */}
          <div className="lg:col-span-2">
            {scriptContent ? (
              <div className="space-y-4">
                <Card className="p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-2">{scriptContent.title}</h2>
                  <p className="text-sm text-muted-foreground mb-4">{scriptContent.description}</p>
                  <div className="text-xs text-muted-foreground">
                    Duración total: {scriptContent.totalDuration}s
                  </div>
                </Card>

                {/* Scenes */}
                <div className="space-y-3">
                  {scriptContent.scenes?.map((scene: any, index: number) => (
                    <Card key={index} className="p-6 border-l-4 border-l-accent">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-foreground">Escena {scene.sceneNumber}</h3>
                          <p className="text-sm text-muted-foreground">{scene.title}</p>
                        </div>
                        <div className="text-xs bg-accent/10 text-accent px-2 py-1 rounded">
                          {scene.duration}s
                        </div>
                      </div>

                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="font-medium text-foreground mb-1">Descripción Visual</p>
                          <p className="text-muted-foreground">{scene.description}</p>
                        </div>

                        <div>
                          <p className="font-medium text-foreground mb-1">Subtítulos</p>
                          <p className="text-muted-foreground italic">"{scene.subtitles}"</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <Button
                  onClick={() => setLocation(`/format/${projectId}`)}
                  className="w-full"
                >
                  Continuar al Siguiente Paso
                </Button>
              </div>
            ) : (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">
                  Describe el tema de tu video y haz clic en "Generar Guión con IA" para comenzar
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
