import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Check } from "lucide-react";
import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";

interface FormatOption {
  id: string;
  name: string;
  ratio: string;
  width: number;
  height: number;
  description: string;
}

interface TemplateOption {
  id: string;
  name: string;
  description: string;
  colors: string[];
}

const FORMATS: FormatOption[] = [
  {
    id: "tiktok",
    name: "TikTok",
    ratio: "9:16",
    width: 1080,
    height: 1920,
    description: "Vertical, optimizado para TikTok",
  },
  {
    id: "instagram_reels_9_16",
    name: "Instagram Reels (Vertical)",
    ratio: "9:16",
    width: 1080,
    height: 1920,
    description: "Vertical, optimizado para Instagram Reels",
  },
  {
    id: "instagram_reels_1_1",
    name: "Instagram Reels (Cuadrado)",
    ratio: "1:1",
    width: 1080,
    height: 1080,
    description: "Cuadrado, optimizado para Instagram Feed",
  },
  {
    id: "youtube_shorts",
    name: "YouTube Shorts",
    ratio: "9:16",
    width: 1080,
    height: 1920,
    description: "Vertical, optimizado para YouTube Shorts",
  },
];

const TEMPLATES: TemplateOption[] = [
  {
    id: "corporate",
    name: "Corporativo",
    description: "Profesional, formal y elegante. Ideal para contenido empresarial.",
    colors: ["#0f0f1e", "#7c3aed", "#e8e8f0"],
  },
  {
    id: "modern",
    name: "Moderno",
    description: "Dinámico, vibrante y contemporáneo. Perfecto para redes sociales.",
    colors: ["#7c3aed", "#a78bfa", "#ffffff"],
  },
  {
    id: "minimalist",
    name: "Minimalista",
    description: "Limpio, simple y enfocado. Máxima claridad del mensaje.",
    colors: ["#ffffff", "#0f0f1e", "#e8e8f0"],
  },
];

export default function FormatSelector() {
  const [, params] = useRoute("/format/:projectId");
  const [, setLocation] = useLocation();
  const projectId = params?.projectId ? parseInt(params.projectId) : 0;

  const [selectedFormat, setSelectedFormat] = useState("tiktok");
  const [selectedTemplate, setSelectedTemplate] = useState("modern");

  const { data: project, isLoading: projectLoading } = trpc.projects.getById.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );

  const updateMutation = trpc.projects.update.useMutation({
    onSuccess: () => {
      toast.success("Formato y plantilla actualizados");
      setLocation(`/images/${projectId}`);
    },
    onError: () => {
      toast.error("Error al actualizar el proyecto");
    },
  });

  const handleContinue = () => {
    updateMutation.mutate({
      projectId,
      format: selectedFormat as any,
      template: selectedTemplate as any,
    });
  };

  if (projectLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Cargando...</p>
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

  const selectedFormatObj = FORMATS.find(f => f.id === selectedFormat);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container py-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation(`/editor/${projectId}`)}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{project.title}</h1>
              <p className="text-sm text-muted-foreground">Selecciona Formato y Plantilla</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Format Selection */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-foreground mb-4">Formato de Destino</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {FORMATS.map((format) => (
                <Card
                  key={format.id}
                  className={`p-4 cursor-pointer transition-all ${
                    selectedFormat === format.id
                      ? "ring-2 ring-accent border-accent"
                      : "hover:border-accent/50"
                  }`}
                  onClick={() => setSelectedFormat(format.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{format.name}</h3>
                      <p className="text-xs text-muted-foreground">{format.ratio}</p>
                    </div>
                    {selectedFormat === format.id && (
                      <Check className="w-5 h-5 text-accent" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{format.description}</p>
                </Card>
              ))}
            </div>

            {/* Preview */}
            {selectedFormatObj && (
              <Card className="p-6 mb-8">
                <h3 className="font-semibold text-foreground mb-4">Vista Previa</h3>
                <div className="flex justify-center">
                  <div
                    className="bg-gradient-to-br from-accent/20 to-accent/10 rounded-lg border border-accent/30 flex items-center justify-center"
                    style={{
                      width: "200px",
                      height: `${(200 * selectedFormatObj.height) / selectedFormatObj.width}px`,
                    }}
                  >
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">{selectedFormatObj.ratio}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedFormatObj.width}x{selectedFormatObj.height}px
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Template Selection */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Plantilla de Estilo</h2>
            <div className="space-y-4">
              {TEMPLATES.map((template) => (
                <Card
                  key={template.id}
                  className={`p-4 cursor-pointer transition-all ${
                    selectedTemplate === template.id
                      ? "ring-2 ring-accent border-accent"
                      : "hover:border-accent/50"
                  }`}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{template.name}</h3>
                    </div>
                    {selectedTemplate === template.id && (
                      <Check className="w-5 h-5 text-accent" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{template.description}</p>
                  <div className="flex gap-2">
                    {template.colors.map((color, i) => (
                      <div
                        key={i}
                        className="w-6 h-6 rounded border border-border"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </Card>
              ))}
            </div>

            <Button
              onClick={handleContinue}
              disabled={updateMutation.isPending}
              className="w-full mt-8"
            >
              {updateMutation.isPending ? "Actualizando..." : "Continuar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
