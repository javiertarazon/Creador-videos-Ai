import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Volume2, Music } from "lucide-react";
import { toast } from "sonner";

interface SelectedAudio {
  voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
  musicId: string | null;
}

export default function AudioSelector() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [selectedAudio, setSelectedAudio] = useState<SelectedAudio>({
    voice: "nova",
    musicId: null,
  });
  const [isLoading, setIsLoading] = useState(false);

  const voicesQuery = trpc.video.getAvailableVoices.useQuery();
  const musicQuery = trpc.video.getAllMusic.useQuery();
  const projectQuery = trpc.projects.getById.useQuery({ projectId: Number(id) });
  const updateProjectMutation = trpc.projects.update.useMutation();

  const handleVoiceSelect = (voice: SelectedAudio["voice"]) => {
    setSelectedAudio({ ...selectedAudio, voice });
  };

  const handleMusicSelect = (musicId: string | null) => {
    setSelectedAudio({ ...selectedAudio, musicId });
  };

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      // Guardar selección en el proyecto
      await updateProjectMutation.mutateAsync({
        projectId: Number(id),
        description: selectedAudio.voice, // Usar description para guardar la voz seleccionada
      });

      toast.success("Configuración de audio guardada");
      setLocation(`/video/${id}`);
    } catch (error) {
      console.error("Error saving audio settings:", error);
      toast.error("Error al guardar la configuración");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Configurar Audio
          </h1>
          <p className="text-slate-600">
            Selecciona la voz para la narración y la música de fondo
          </p>
        </div>

        {/* Selección de Voz */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Volume2 size={24} className="text-purple-600" />
            Voz para Narración
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {voicesQuery.data?.map((voice) => (
              <Card
                key={voice.id}
                className={`p-4 cursor-pointer transition-all border-2 ${
                  selectedAudio.voice === voice.id
                    ? "border-purple-500 bg-purple-50"
                    : "border-slate-200 hover:border-purple-300"
                }`}
                onClick={() => handleVoiceSelect(voice.id)}
              >
                <h3 className="font-semibold text-slate-900 mb-1">{voice.name}</h3>
                <p className="text-sm text-slate-600">{voice.description}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Selección de Música */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Music size={24} className="text-purple-600" />
            Música de Fondo
          </h2>

          <Card className="p-4 mb-4 bg-blue-50 border-blue-200">
            <p className="text-sm text-blue-800">
              💡 Selecciona una música de fondo o continúa sin música
            </p>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Card
              className={`p-4 cursor-pointer transition-all border-2 ${
                selectedAudio.musicId === null
                  ? "border-purple-500 bg-purple-50"
                  : "border-slate-200 hover:border-purple-300"
              }`}
              onClick={() => handleMusicSelect(null)}
            >
              <h3 className="font-semibold text-slate-900">Sin Música</h3>
              <p className="text-sm text-slate-600">Solo narración</p>
            </Card>

            {musicQuery.data?.slice(0, 5).map((track) => (
              <Card
                key={track.id}
                className={`p-4 cursor-pointer transition-all border-2 ${
                  selectedAudio.musicId === track.id
                    ? "border-purple-500 bg-purple-50"
                    : "border-slate-200 hover:border-purple-300"
                }`}
                onClick={() => handleMusicSelect(track.id)}
              >
                <h3 className="font-semibold text-slate-900 text-sm mb-1">
                  {track.title}
                </h3>
                <p className="text-xs text-slate-600 mb-2">{track.artist}</p>
                <div className="flex gap-2 text-xs">
                  <span className="bg-slate-200 px-2 py-1 rounded">
                    {track.genre}
                  </span>
                  <span className="bg-slate-200 px-2 py-1 rounded">
                    {track.mood}
                  </span>
                </div>
              </Card>
            ))}
          </div>

          {musicQuery.data && musicQuery.data.length > 5 && (
            <p className="text-sm text-slate-600 text-center">
              Mostrando 5 de {musicQuery.data.length} pistas disponibles
            </p>
          )}
        </div>

        {/* Botones de Acción */}
        <div className="flex gap-4">
          <Button
            onClick={() => setLocation(`/format/${id}`)}
            variant="outline"
            className="flex-1"
          >
            Atrás
          </Button>
          <Button
            onClick={handleContinue}
            disabled={isLoading}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isLoading ? "Guardando..." : "Continuar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
