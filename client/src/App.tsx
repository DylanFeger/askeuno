import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import BackgroundWatermark from "@/components/BackgroundWatermark";
import Home from "@/pages/home";
import Privacy from "@/pages/privacy";
import Connections from "@/pages/connections";
import Dashboards from "@/pages/dashboards";
import Dashboard from "@/pages/dashboard";
import Chat from "@/pages/chat";
import NotFound from "@/pages/not-found";
import UploadPage from "@/pages/upload";
import ImportWizard from "@/pages/import-wizard";
import SubscriptionPage from "@/pages/subscription";
import Features from "@/pages/features";
import Security from "@/pages/security";
import Integrations from "@/pages/integrations";
import Contact from "@/pages/contact";
import Documentation from "@/pages/docs";
import Settings from "@/pages/settings";
import TeamCulture from "@/pages/team-culture";
import StartTracking from "@/pages/start-tracking";
import SignIn from "@/pages/signin";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/signin" component={SignIn} />
      <Route path="/chat" component={Chat} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/connections" component={Connections} />
      <Route path="/dashboards" component={Dashboards} />
      <Route path="/upload" component={UploadPage} />
      <Route path="/import-wizard" component={ImportWizard} />
      <Route path="/start-tracking" component={StartTracking} />
      <Route path="/subscription" component={SubscriptionPage} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/features" component={Features} />
      <Route path="/security" component={Security} />
      <Route path="/integrations" component={Integrations} />
      <Route path="/contact" component={Contact} />
      <Route path="/docs" component={Documentation} />
      <Route path="/settings" component={Settings} />
      <Route path="/team-culture" component={TeamCulture} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <BackgroundWatermark />
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
