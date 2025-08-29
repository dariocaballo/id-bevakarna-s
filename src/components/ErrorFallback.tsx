import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Link } from "react-router-dom";

interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
  title?: string;
  description?: string;
}

export const ErrorFallback = ({ 
  error, 
  resetError, 
  title = "Något gick fel",
  description = "Ett oväntat fel inträffade. Försök ladda om sidan."
}: ErrorFallbackProps) => {
  const handleRefresh = () => {
    if (resetError) {
      resetError();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/20 to-background p-4">
      <Card className="w-full max-w-md text-center card-shadow border-0">
        <CardHeader>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold text-destructive mb-2">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{description}</p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={handleRefresh} className="hero-gradient text-white flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Försök igen
            </Button>
            <Button asChild variant="outline" className="flex items-center gap-2">
              <Link to="/">
                <Home className="w-4 h-4" />
                Tillbaka hem
              </Link>
            </Button>
          </div>

          {error && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                Teknisk information
              </summary>
              <div className="mt-2 p-3 bg-muted rounded-md">
                <pre className="text-xs overflow-auto whitespace-pre-wrap">
                  {error.message}
                  {error.stack && `\n\nStack trace:\n${error.stack}`}
                </pre>
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
};