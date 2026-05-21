import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { Download, Play, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ExportStatus {
  tiktok: "pending" | "rendering" | "complete" | "error";
  instagram: "pending" | "rendering" | "complete" | "error";
  youtube: "pending" | "rendering" | "complete" | "error";
}

interface ExportedVideos {
  tiktok?: string;
  instagram?: string;
  youtube?: string;
}

export default function VideoExporter() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [selectedFormats, setSelectedFormats] = useState<
    Array<"tiktok" | "instagram" | "youtube">
  >(["tiktok", "instagram", "youtube"]);
  const [exportStatus, setExportStatus] = useState<ExportStatus>({
    tiktok: "pending",
    instagram: "pending",
    youtube: "pending",
  });
  const [exportedVideos, setExportedVideos] = useState<ExportedVideos>({});
  const [isExporting, setIsExporting] = useState(false);

  const projectQuery = trpc.projects.getById.useQuery({ projectId: Number(id) });
  const exportMutation = trpc.video.exportMultiFormat.useMutation();

  const handleFormatToggle = (format: "tiktok" | "instagram" | "youtube") => {
    setSelectedFormats((prev) =>
      prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format]
    );
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (!projectQuery.data?.scriptContent) {
        toast.error("No hay guión disponible");
        return;
      }

      // Parsear scriptContent
      let scriptContent;
      try {
        scriptContent =
          typeof projectQuery.data.scriptContent === "string"
            ? JSON.parse(projectQuery.data.scriptContent)
            : projectQuery.data.scriptContent;
      } catch (error) {
        toast.error("Error al parsear el guión");
        return;
      }

      const scenes = scriptContent.scenes || [];

      // Actualizar estado a "rendering"
      setExportStatus({
        tiktok: selectedFormats.includes("tiktok") ? "rendering" : "pending",
        instagram: selectedFormats.includes("instagram") ? "rendering" : "pending",
        youtube: selectedFormats.includes("youtube") ? "rendering" : "pending",
      });

      // Llamar a exportMultiFormat
      const result = await exportMutation.mutateAsync({
        projectId: Number(id),
        scenes: scenes.map((scene: any) => ({
          imageUrl: scene.imageUrl || "https://via.placeholder.com/1080x1920",
          duration: scene.duration || 5,
          text: scene.title || "",
          subtitle: scene.subtitle || "",
        })),
        formats: selectedFormats,
      });

      // Actualizar estado a "complete"
      const newStatus: ExportStatus = {
        tiktok: "pending",
        instagram: "pending",
        youtube: "pending",
      };

      const newVideos: ExportedVideos = {};

      for (const format of selectedFormats) {
        if (result.videos[format]) {
          newStatus[format] = "complete";
          newVideos[format] = result.videos[format];
        } else {
          newStatus[format] = "error";
        }
      }

      setExportStatus(newStatus);
      setExportedVideos(newVideos);
      toast.success("Videos exportados correctamente");
    } catch (error) {
      console.error("Error exporting videos:", error);
      toast.error("Error al exportar los videos");
      setExportStatus({
        tiktok: "error",
        instagram: "error",
        youtube: "error",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const formatInfo = {
    tiktok: { name: "TikTok", aspect: "9:16", resolution: "1080x1920" },
    instagram: { name: "Instagram Reels", aspect: "9:16", resolution: "1080x1920" },
    youtube: { name: "YouTube Shorts", aspect: "9:16", resolution: "1080x1920" },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Exportar Video
          </h1>
          <p className="text-slate-600">
            Genera tu video en múltiples formatos simultáneamente
          </p>
        </div>

        {/* Selección de Formatos */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            Selecciona Formatos
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {(["tiktok", "instagram", "youtube"] as const).map((format) => (
              <Card
                key={format}
                className={`p-4 cursor-pointer transition-all border-2 ${
                  selectedFormats.includes(format)
                    ? "border-purple-500 bg-purple-50"
                    : "border-slate-200 hover:border-purple-300"
                }`}
                onClick={() => handleFormatToggle(format)}
              >
                <h3 className="font-semibold text-slate-900 mb-2">
                  {formatInfo[format].name}
                </h3>
                <p className="text-sm text-slate-600 mb-1">
                  Aspecto: {formatInfo[format].aspect}
                </p>
                <p className="text-sm text-slate-600">
                  Resolución: {formatInfo[format].resolution}
                </p>
              </Card>
            ))}
          </div>
        </div>

        {/* Estado de Exportación */}
        {isExporting && (
          <Card className="p-6 mb-8 bg-blue-50 border-blue-200">
            <div className="space-y-4">
              {(["tiktok", "instagram", "youtube"] as const).map((format) => (
                <div key={format}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-900">
                      {formatInfo[format].name}
                    </span>
                    <span className="text-sm text-slate-600">
                      {exportStatus[format] === "rendering" && (
                        <Loader2 size={16} className="animate-spin inline" />
                      )}
                      {exportStatus[format] === "complete" && "✓ Completado"}
                      {exportStatus[format] === "error" && "✗ Error"}
                    </span>
                  </div>
                  <Progress
                    value={
                      exportStatus[format] === "complete"
                        ? 100
                        : exportStatus[format] === "rendering"
                          ? 50
                          : 0
                    }
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Videos Exportados */}
        {Object.keys(exportedVideos).length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Videos Generados
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(["tiktok", "instagram", "youtube"] as const).map((format) => (
                exportedVideos[format] && (
                  <Card key={format} className="p-4 bg-white border-0 shadow-sm">
                    <h3 className="font-semibold text-slate-900 mb-3">
                      {formatInfo[format].name}
                    </h3>

                    <div className="space-y-3">
                      <a
                        href={exportedVideos[format]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors w-full justify-center"
                      >
                        <Play size={16} />
                        Ver Video
                      </a>

                      <a
                        href={exportedVideos[format]}
                        download
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-900 rounded-lg hover:bg-slate-300 transition-colors w-full justify-center"
                      >
                        <Download size={16} />
                        Descargar
                      </a>
                    </div>
                  </Card>
                )
              ))}
            </div>
          </div>
        )}

        {/* Botones de Acción */}
        <div className="flex gap-4">
          <Button
            onClick={() => setLocation(`/audio/${id}`)}
            variant="outline"
            className="flex-1"
          >
            Atrás
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || selectedFormats.length === 0}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isExporting ? (
              <>
                <Loader2 size={18} className="mr-2 animate-spin" />
                Exportando...
              </>
            ) : (
              "Exportar Videos"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
