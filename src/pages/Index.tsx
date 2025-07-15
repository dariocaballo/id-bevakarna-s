import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, BarChart3, ArrowRight } from 'lucide-react';
import logoImage from '@/assets/id-bevakarna-logo.png';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background">
      {/* Header */}
      <div className="text-center pt-16 pb-12">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white p-2 card-shadow">
          <img 
            src="/lovable-uploads/a4efd036-dc1e-420a-8621-0fe448423e2f.png" 
            alt="ID-Bevakarna" 
            className="w-full h-full object-contain rounded-full"
          />
        </div>
        <h1 className="text-5xl font-bold text-primary mb-4">ID-Bevakarna</h1>
        <p className="text-xl text-muted-foreground mb-2">Säljsystem</p>
        <p className="text-sm text-muted-foreground">
          Motiverande realtidsrapportering för ditt säljteam
        </p>
      </div>

      {/* Navigation Cards */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Säljprogram */}
          <Card className="card-shadow border-0 smooth-transition hover:scale-105 cursor-pointer group">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center group-hover:hero-gradient smooth-transition">
                <Users className="w-8 h-8 text-primary group-hover:text-white smooth-transition" />
              </div>
              <CardTitle className="text-2xl text-primary">Säljprogram</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-6">
                Rapportera försäljning snabbt och enkelt. Perfekt för säljare som vill logga sina resultat direkt.
              </p>
              <Button 
                asChild
                className="w-full hero-gradient text-white primary-shadow smooth-transition hover:scale-105"
              >
                <a href="/seller" className="flex items-center justify-center gap-2">
                  Starta säljprogram
                  <ArrowRight className="w-4 h-4" />
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Dashboard */}
          <Card className="card-shadow border-0 smooth-transition hover:scale-105 cursor-pointer group">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-success/10 rounded-full flex items-center justify-center group-hover:success-gradient smooth-transition">
                <BarChart3 className="w-8 h-8 text-success group-hover:text-white smooth-transition" />
              </div>
              <CardTitle className="text-2xl text-success">Dashboard</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-6">
                Visa försäljningsstatistik i realtid. Perfekt för TVn på kontoret för att motivera teamet.
              </p>
              <Button 
                asChild
                variant="outline"
                className="w-full border-success text-success hover:success-gradient hover:text-white smooth-transition hover:scale-105"
              >
                <a href="/dashboard" className="flex items-center justify-center gap-2">
                  Öppna dashboard
                  <ArrowRight className="w-4 h-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-primary mb-8">Funktioner</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-card rounded-lg card-shadow">
              <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Realtidsuppdateringar</h3>
              <p className="text-muted-foreground text-sm">
                Alla försäljningar syns direkt på dashboarden utan fördröjning
              </p>
            </div>
            
            <div className="p-6 bg-card rounded-lg card-shadow">
              <div className="w-12 h-12 mx-auto mb-4 bg-success/10 rounded-full flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-success" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Topplistor</h3>
              <p className="text-muted-foreground text-sm">
                Se vem som säljer mest idag och denna månad med live-rankningar
              </p>
            </div>
            
            <div className="p-6 bg-card rounded-lg card-shadow">
              <div className="w-12 h-12 mx-auto mb-4 bg-warning/10 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-warning" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Teamotivation</h3>
              <p className="text-muted-foreground text-sm">
                Animationer och ljud när försäljningar rapporteras in
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-16 pb-8 text-sm text-muted-foreground">
        <p>ID-Bevakarna Säljsystem v1.0</p>
        <p className="mt-2">Utvecklat för att motivera och inspirera ditt säljteam</p>
        <div className="mt-4">
          <Button 
            asChild
            variant="outline"
            size="sm"
            className="text-xs"
          >
            <a href="/admin">🔐 Admin Panel</a>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
