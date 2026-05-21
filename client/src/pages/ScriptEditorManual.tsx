import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Trash2, Plus, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface Scene {
  id?: number;
  title: string;
  description: string;
  subtitle: string;
  duration: number;
}

export default function ScriptEditorManual() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const projectQuery = trpc.projects.getById.useQuery({ projectId: Number(id) });
  const updateProjectMutation = trpc.projects.update.useMutation();

  useEffect(() => {
    if (projectQuery.data?.scriptContent) {
      try {
        const parsed =
          typeof projectQuery.data.scriptContent === "string"
            ? JSON.parse(projectQuery.data.scriptContent)
            : projectQuery.data.scriptContent;
        setScenes(parsed.scenes || []);
      } catch (error) {
        console.error("Error parsing script:", error);
        toast.error("Error al cargar el guión");
      }
    }
  }, [projectQuery.data]);

  const handleAddScene = () => {
    const newScene: Scene = {
      title: "Nueva Escena",
      description: "Descripción de la escena",
      subtitle: "Subtítulo",
      duration: 5,
    };
    setScenes([...scenes, newScene]);
    setEditingIndex(scenes.length);
  };

  const handleUpdateScene = (index: number, field: keyof Scene, value: any) => {
    const updated = [...scenes];
    updated[index] = { ...updated[index], [field]: value };
    setScenes(updated);
  };

  const handleDeleteScene = (index: number) => {
    setScenes(scenes.filter((_, i) => i !== index));
    setEditingIndex(null);
  };

  const handleMoveScene = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index > 0) {
      const updated = [...scenes];
      [updated[index], updated[index - 1]] = [updated[index - 1], updated[index]];
      setScenes(updated);
      setEditingIndex(index - 1);
    } else if (direction === "down" && index < scenes.length - 1) {
      const updated = [...scenes];
      [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
      setScenes(updated);
      setEditingIndex(index + 1);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const totalDuration = scenes.reduce((sum, scene) => sum + scene.duration, 0);
      const scriptContent = {
        title: projectQuery.data?.title || "Sin título",
        description: projectQuery.data?.description || "",
        scenes,
        totalDuration,
      };

      await updateProjectMutation.mutateAsync({
        projectId: Number(id),
        description: JSON.stringify(scriptContent),
      });

      toast.success("Guión actualizado correctamente");
      setLocation(`/format/${id}`);
    } catch (error) {
      console.error("Error saving script:", error);
      toast.error("Error al guardar el guión");
    } finally {
      setIsSaving(false);
    }
  };

  const totalDuration = scenes.reduce((sum, scene) => sum + scene.duration, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Editor de Guión
          </h1>
          <p className="text-slate-600">
            Edita, reordena y ajusta la duración de tus escenas
          </p>
        </div>

        {/* Resumen */}
        <Card className="mb-6 p-6 bg-white border-0 shadow-sm">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-slate-600">Total de Escenas</p>
              <p className="text-3xl font-bold text-purple-600">{scenes.length}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Duración Total</p>
              <p className="text-3xl font-bold text-purple-600">{totalDuration}s</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Duración Promedio</p>
              <p className="text-3xl font-bold text-purple-600">
                {scenes.length > 0 ? Math.round(totalDuration / scenes.length) : 0}s
              </p>
            </div>
          </div>
        </Card>

        {/* Lista de Escenas */}
        <div className="space-y-4 mb-8">
          {scenes.map((scene, index) => (
            <Card
              key={index}
              className={`p-4 border-2 transition-all cursor-pointer ${
                editingIndex === index
                  ? "border-purple-500 bg-purple-50"
                  : "border-slate-200 bg-white hover:border-purple-300"
              }`}
              onClick={() => setEditingIndex(editingIndex === index ? null : index)}
            >
              <div className="flex items-start gap-4">
                {/* Controles de Orden */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveScene(index, "up");
                    }}
                    disabled={index === 0}
                    className="p-1 hover:bg-slate-200 rounded disabled:opacity-50"
                  >
                    <ChevronUp size={18} />
                  </button>
                  <GripVertical size={18} className="text-slate-400" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveScene(index, "down");
                    }}
                    disabled={index === scenes.length - 1}
                    className="p-1 hover:bg-slate-200 rounded disabled:opacity-50"
                  >
                    <ChevronDown size={18} />
                  </button>
                </div>

                {/* Contenido */}
                <div className="flex-1">
                  {editingIndex === index ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Título
                        </label>
                        <Input
                          value={scene.title}
                          onChange={(e) =>
                            handleUpdateScene(index, "title", e.target.value)
                          }
                          className="border-slate-300"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Descripción Visual
                        </label>
                        <Textarea
                          value={scene.description}
                          onChange={(e) =>
                            handleUpdateScene(index, "description", e.target.value)
                          }
                          className="border-slate-300 h-24"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Subtítulo/Narración
                        </label>
                        <Textarea
                          value={scene.subtitle}
                          onChange={(e) =>
                            handleUpdateScene(index, "subtitle", e.target.value)
                          }
                          className="border-slate-300 h-20"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Duración (segundos)
                        </label>
                        <Input
                          type="number"
                          min="1"
                          max="60"
                          value={scene.duration}
                          onChange={(e) =>
                            handleUpdateScene(index, "duration", parseInt(e.target.value))
                          }
                          className="border-slate-300"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">
                        Escena {index + 1}: {scene.title}
                      </h3>
                      <p className="text-sm text-slate-600 mb-2">
                        {scene.description}
                      </p>
                      <p className="text-xs text-slate-500">
                        Duración: {scene.duration}s | Subtítulo: {scene.subtitle}
                      </p>
                    </div>
                  )}
                </div>

                {/* Botón Eliminar */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteScene(index);
                  }}
                  className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </Card>
          ))}
        </div>

        {/* Botón Agregar Escena */}
        <Button
          onClick={handleAddScene}
          variant="outline"
          className="w-full mb-8 border-dashed border-2 border-purple-300 text-purple-600 hover:bg-purple-50"
        >
          <Plus size={18} className="mr-2" />
          Agregar Nueva Escena
        </Button>

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
            onClick={handleSave}
            disabled={isSaving || scenes.length === 0}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isSaving ? "Guardando..." : "Guardar y Continuar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
