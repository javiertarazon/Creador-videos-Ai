import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Plus, Trash2, Copy, Edit2, Play } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectFormat, setNewProjectFormat] = useState("tiktok");
  const [newProjectTemplate, setNewProjectTemplate] = useState("modern");

  const { data: projects, isLoading, refetch } = trpc.projects.list.useQuery();
  const createMutation = trpc.projects.create.useMutation({
    onSuccess: (data) => {
      setNewProjectTitle("");
      setNewProjectFormat("tiktok");
      setNewProjectTemplate("modern");
      setIsCreateOpen(false);
      refetch();
      // Navigate to script editor
      setLocation(`/editor/${data.projectId}`);
    },
  });

  const deleteMutation = trpc.projects.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const duplicateMutation = trpc.projects.duplicate.useMutation({
    onSuccess: () => refetch(),
  });

  const handleCreateProject = () => {
    if (!newProjectTitle.trim()) return;
    createMutation.mutate({
      title: newProjectTitle,
      format: newProjectFormat as any,
      template: newProjectTemplate as any,
    });
  };

  const totalVideos = projects?.length || 0;
  const completedVideos = projects?.filter(p => p.status === 'completed').length || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">ProVideoGen</h1>
              <p className="text-sm text-muted-foreground mt-1">Generador de Videos Profesionales con IA</p>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Nuevo Proyecto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Proyecto</DialogTitle>
                  <DialogDescription>
                    Comienza un nuevo proyecto de video. Podrás editar todos los detalles después.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Título del Proyecto</label>
                    <Input
                      placeholder="Ej: Mi primer video viral"
                      value={newProjectTitle}
                      onChange={(e) => setNewProjectTitle(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Formato de Destino</label>
                    <Select value={newProjectFormat} onValueChange={setNewProjectFormat}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tiktok">TikTok (9:16)</SelectItem>
                        <SelectItem value="instagram_reels_9_16">Instagram Reels (9:16)</SelectItem>
                        <SelectItem value="instagram_reels_1_1">Instagram Reels (1:1)</SelectItem>
                        <SelectItem value="youtube_shorts">YouTube Shorts (9:16)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Plantilla de Estilo</label>
                    <Select value={newProjectTemplate} onValueChange={setNewProjectTemplate}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="corporate">Corporativo</SelectItem>
                        <SelectItem value="modern">Moderno</SelectItem>
                        <SelectItem value="minimalist">Minimalista</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleCreateProject}
                    disabled={!newProjectTitle.trim() || createMutation.isPending}
                    className="w-full"
                  >
                    {createMutation.isPending ? "Creando..." : "Crear Proyecto"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="container py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="p-6">
            <div className="text-sm text-muted-foreground">Total de Proyectos</div>
            <div className="text-3xl font-bold text-foreground mt-2">{totalVideos}</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-muted-foreground">Videos Completados</div>
            <div className="text-3xl font-bold text-accent mt-2">{completedVideos}</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-muted-foreground">Tasa de Finalización</div>
            <div className="text-3xl font-bold text-foreground mt-2">
              {totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0}%
            </div>
          </Card>
        </div>

        {/* Projects List */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-6">Mis Proyectos</h2>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Cargando proyectos...</p>
            </div>
          ) : projects && projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Card key={project.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground truncate">{project.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(project.createdAt).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        project.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : project.status === 'generating'
                          ? 'bg-blue-100 text-blue-700'
                          : project.status === 'failed'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {project.status === 'draft' && 'Borrador'}
                        {project.status === 'generating' && 'Generando'}
                        {project.status === 'completed' && 'Completado'}
                        {project.status === 'failed' && 'Error'}
                      </div>
                    </div>

                    <div className="space-y-2 mb-4 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Formato:</span>
                        <span className="font-medium text-foreground">
                          {project.format === 'tiktok' && 'TikTok'}
                          {project.format === 'instagram_reels_9_16' && 'Instagram (9:16)'}
                          {project.format === 'instagram_reels_1_1' && 'Instagram (1:1)'}
                          {project.format === 'youtube_shorts' && 'YouTube Shorts'}
                        </span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Plantilla:</span>
                        <span className="font-medium text-foreground capitalize">{project.template}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1"
                        onClick={() => setLocation(`/editor/${project.id}`)}
                      >
                        <Edit2 className="w-3 h-3" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => duplicateMutation.mutate({ projectId: project.id })}
                        disabled={duplicateMutation.isPending}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMutation.mutate({ projectId: project.id })}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground mb-4">No tienes proyectos todavía</p>
              <Button onClick={() => setIsCreateOpen(true)}>Crear tu primer proyecto</Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
