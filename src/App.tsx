import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy, Component, ReactNode } from "react";

// Robust lazy loading with proper error handling and loading states
const Index = lazy(() => import("./pages/Index").catch(err => {
  console.error('Failed to load Index page:', err);
  return { default: () => <div className="min-h-screen flex items-center justify-center"><p>Kunde inte ladda startsidan</p></div> };
}));

const Dashboard = lazy(() => import("./pages/Dashboard").catch(err => {
  console.error('Failed to load Dashboard page:', err);
  return { default: () => <div className="min-h-screen flex items-center justify-center"><p>Kunde inte ladda dashboard</p></div> };
}));

const Seller = lazy(() => import("./pages/Seller").catch(err => {
  console.error('Failed to load Seller page:', err);
  return { default: () => <div className="min-h-screen flex items-center justify-center"><p>Kunde inte ladda säljarsidan</p></div> };
}));

const Admin = lazy(() => import("./pages/Admin").catch(err => {
  console.error('Failed to load Admin page:', err);
  return { default: () => <div className="min-h-screen flex items-center justify-center"><p>Kunde inte ladda admin</p></div> };
}));

const Auth = lazy(() => import("./pages/Auth").catch(err => {
  console.error('Failed to load Auth page:', err);
  return { default: () => <div className="min-h-screen flex items-center justify-center"><p>Kunde inte ladda inloggning</p></div> };
}));

const NotFound = lazy(() => import("./pages/NotFound").catch(err => {
  console.error('Failed to load NotFound page:', err);
  return { default: () => <div className="min-h-screen flex items-center justify-center"><p>Sidan kunde inte hittas</p></div> };
}));

// Enhanced loading fallback for TV displays
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/20 to-background">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-6"></div>
      <p className="text-xl text-muted-foreground mb-2">Laddar dashboard...</p>
      <p className="text-sm text-muted-foreground/60">Förbereder för TV-visning</p>
      
      {/* Progress indicator for slow connections */}
      <div className="w-64 h-1 bg-muted rounded-full mx-auto mt-4 overflow-hidden">
        <div className="h-full bg-primary rounded-full animate-pulse" style={{
          animation: 'loading-progress 3s ease-in-out infinite'
        }}></div>
      </div>
    </div>
  </div>
);

// Add CSS animation for loading progress
const style = document.createElement('style');
style.textContent = `
  @keyframes loading-progress {
    0% { width: 0%; }
    50% { width: 70%; }
    100% { width: 100%; }
  }
`;
document.head.appendChild(style);

// Optimized QueryClient configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // Consider data fresh for 30 seconds
      gcTime: 300000, // Keep in cache for 5 minutes
      retry: 1, // Only retry once on failure
      refetchOnWindowFocus: false, // Don't refetch on window focus for TV usage
    },
  },
});

// Simple error boundary
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Application Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/20 to-background">
          <div className="text-center max-w-md mx-auto p-6">
            <h1 className="text-2xl font-bold text-destructive mb-4">Något gick fel</h1>
            <p className="text-muted-foreground mb-4">
              Ett oväntat fel inträffade. Försök ladda om sidan.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Ladda om sidan
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/seller" element={<Seller />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
