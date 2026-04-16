import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Plus, Trash2, Copy, Edit2, Play, Sparkles } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-8">
          <div className="flex items-center justify-between">
            <div className="animate-fade-in-up">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-4xl font-bold gradient-text">ProVideoGen</h1>
              </div>
              <p className="text-sm text-muted-foreground ml-13">Generador de Videos Profesionales con IA</p>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70 shadow-lg hover:shadow-2xl transition-all animate-scale-in">
                  <Plus className="w-4 h-4" />
                  Nuevo Proyecto
                </Button>
              </DialogTrigger>
              <DialogContent className="border-border/50 bg-card/50 backdrop-blur-sm">
                <DialogHeader>
                  <DialogTitle className="gradient-text">Crear Nuevo Proyecto</DialogTitle>
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
                      className="mt-2 border-border/50 bg-background/50 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Formato de Destino</label>
                    <Select value={newProjectFormat} onValueChange={setNewProjectFormat}>
                      <SelectTrigger className="mt-2 border-border/50 bg-background/50">
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
                      <SelectTrigger className="mt-2 border-border/50 bg-background/50">
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
                    className="w-full bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70"
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
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 animate-fade-in-up">
          <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-2xl hover:shadow-accent/20 hover:-translate-y-1 transition-all duration-300 ease-out">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center">
                <Play className="w-6 h-6 text-accent" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-medium mb-2">TOTAL DE PROYECTOS</p>
            <p className="text-4xl font-bold gradient-text">{totalVideos}</p>
            <p className="text-xs text-muted-foreground mt-3">Proyectos creados</p>
          </Card>
          <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-2xl hover:shadow-accent/20 hover:-translate-y-1 transition-all duration-300 ease-out">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500/20 to-green-500/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-green-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-medium mb-2">VIDEOS COMPLETADOS</p>
            <p className="text-4xl font-bold gradient-text">{completedVideos}</p>
            <p className="text-xs text-muted-foreground mt-3">Listos para descargar</p>
          </Card>
          <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-2xl hover:shadow-accent/20 hover:-translate-y-1 transition-all duration-300 ease-out">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center">
                <div className="text-2xl font-bold text-blue-500">%</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-medium mb-2">TASA DE FINALIZACIÓN</p>
            <p className="text-4xl font-bold gradient-text">
              {totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0}%
            </p>
            <p className="text-xs text-muted-foreground mt-3">Proyectos completados</p>
          </Card>
        </div>

        {/* Projects List */}
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-8 animate-slide-in-left">Mis Proyectos</h2>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accent/50 animate-pulse mx-auto mb-4" />
              <p className="text-muted-foreground">Cargando proyectos...</p>
            </div>
          ) : projects && projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up">
              {projects.map((project) => (
                <Card key={project.id} className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-2xl hover:shadow-accent/20 hover:-translate-y-1 transition-all duration-300 ease-out group">
                  <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground truncate group-hover:gradient-text transition-all duration-300 ease-out">{project.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(project.createdAt).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        project.status === 'completed'
                          ? 'bg-green-500/10 text-green-600'
                          : project.status === 'generating'
                          ? 'bg-blue-500/10 text-blue-600'
                          : project.status === 'failed'
                          ? 'bg-red-500/10 text-red-600'
                          : 'bg-accent/10 text-accent'
                      }`}>
                        {project.status === 'draft' && 'Borrador'}
                        {project.status === 'generating' && 'Generando'}
                        {project.status === 'completed' && 'Completado'}
                        {project.status === 'failed' && 'Error'}
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-border/30 pt-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Formato:</span>
                        <span className="font-medium text-foreground">
                          {project.format === 'tiktok' && 'TikTok'}
                          {project.format === 'instagram_reels_9_16' && 'IG (9:16)'}
                          {project.format === 'instagram_reels_1_1' && 'IG (1:1)'}
                          {project.format === 'youtube_shorts' && 'YT Shorts'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Plantilla:</span>
                        <span className="font-medium text-foreground capitalize">{project.template}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1 border-border/50 hover:bg-accent/5"
                        onClick={() => setLocation(`/editor/${project.id}`)}
                      >
                        <Edit2 className="w-3 h-3" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-accent/10"
                        onClick={() => duplicateMutation.mutate({ projectId: project.id })}
                        disabled={duplicateMutation.isPending}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => deleteMutation.mutate({ projectId: project.id })}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center border-border/50 bg-card/50 backdrop-blur-sm animate-fade-in-up">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-accent/50 flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-white" />
              </div>
              <p className="text-muted-foreground mb-6 text-lg">No tienes proyectos todavía</p>
              <Button 
                onClick={() => setIsCreateOpen(true)}
                className="gap-2 bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70 shadow-lg"
              >
                <Plus className="w-4 h-4" />
                Crear tu primer proyecto
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
