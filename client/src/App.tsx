import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ScrollToTop from "@/components/ScrollToTop";
import Home from "@/pages/home";
import Privacy from "@/pages/privacy";
import Connections from "@/pages/connections";
import DataSources from "@/pages/data-sources";
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
import Resources from "@/pages/resources";
import SQLForSmallBusiness from "@/pages/resources/sql-for-small-business";
import DataDrivenDecisions from "@/pages/resources/data-driven-decisions";
import BusinessAnalyticsGuide from "@/pages/resources/business-analytics-guide";
import BlogHomepage from "@/pages/blog";
import BlogPost from "@/pages/blog/post";
import CostOfBadQuery from "@/pages/cost-of-bad-query";
import TeamPage from "@/pages/team";
import AcceptInvite from "@/pages/accept-invite";
import About from "@/pages/about";
import ResponsibleAI from "@/pages/ResponsibleAI";
import OAuthCallback from "@/pages/oauth-callback";
import LightspeedSetup from "@/pages/lightspeed-setup";
import LightspeedConnection from "@/pages/connections-lightspeed";
import LightspeedConnectionSuccess from "@/pages/connections-lightspeed-success";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/signin" component={SignIn} />
      <Route path="/chat" component={Chat} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/connections" component={Connections} />
      <Route path="/connections/lightspeed" component={LightspeedConnection} />
      <Route path="/connections/lightspeed/success" component={LightspeedConnectionSuccess} />
      <Route path="/data-sources" component={DataSources} />
      <Route path="/lightspeed-setup" component={LightspeedSetup} />
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
      <Route path="/resources" component={Resources} />
      <Route path="/resources/sql-for-small-business" component={SQLForSmallBusiness} />
      <Route path="/resources/data-driven-decisions" component={DataDrivenDecisions} />
      <Route path="/resources/business-analytics-guide" component={BusinessAnalyticsGuide} />
      <Route path="/blog" component={BlogHomepage} />
      <Route path="/blog/:slug" component={BlogPost} />
      <Route path="/cost-of-bad-query" component={CostOfBadQuery} />
      <Route path="/responsible-ai" component={ResponsibleAI} />
      <Route path="/team" component={TeamPage} />
      <Route path="/accept-invite/:token" component={AcceptInvite} />
      <Route path="/about" component={About} />
      <Route path="/auth/callback/:provider" component={OAuthCallback} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <ScrollToTop />
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
