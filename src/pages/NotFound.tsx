import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, RefreshCw } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/20 to-background p-4">
      <Card className="w-full max-w-md text-center card-shadow border-0">
        <CardHeader>
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white p-2 card-shadow">
            <img 
              src="/lovable-uploads/a4efd036-dc1e-420a-8621-0fe448423e2f.png" 
              alt="ID-Bevakarna" 
              className="w-full h-full object-contain"
            />
          </div>
          <CardTitle className="text-4xl font-bold text-primary mb-2">404</CardTitle>
          <p className="text-xl text-muted-foreground mb-4">Sidan hittades inte</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Den begärda sidan kunde inte hittas. Kontrollera URL:en eller gå tillbaka till startsidan.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild className="hero-gradient text-white">
              <Link to="/" className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                Tillbaka hem
              </Link>
            </Button>
            <Button variant="outline" onClick={handleRefresh} className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Ladda om
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Fel-ID: {location.pathname}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
