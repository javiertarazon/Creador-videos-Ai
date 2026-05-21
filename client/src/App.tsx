import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import ScriptEditor from "./pages/ScriptEditor";
import FormatSelector from "./pages/FormatSelector";
import ImageGeneratorV2 from "./pages/ImageGeneratorV2";
import VideoAssemblyV2 from "./pages/VideoAssemblyV2";
import AudioSelector from "./pages/AudioSelector";
import VideoExporter from "./pages/VideoExporter";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/editor/:projectId" component={ScriptEditor} />
      <Route path="/format/:projectId" component={FormatSelector} />
      <Route path="/images/:projectId" component={ImageGeneratorV2} />
      <Route path="/assembly/:projectId" component={VideoAssemblyV2} />
      <Route path="/audio/:id" component={AudioSelector} />
      <Route path="/video/:id" component={VideoExporter} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
