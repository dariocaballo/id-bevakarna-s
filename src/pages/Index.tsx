import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, BarChart3, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';

const Index = () => {
  // Preload critical routes for better performance
  useEffect(() => {
    import('./Dashboard');
    import('./Sales');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <div className="text-center pt-16 pb-12 relative">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white p-2 shadow-lg">
          <img 
            src="/lovable-uploads/a4efd036-dc1e-420a-8621-0fe448423e2f.png" 
            alt="ID-Bevakarna" 
            className="w-full h-full object-contain rounded-full"
          />
        </div>
        <h1 className="text-5xl font-bold text-blue-800 mb-4">ID-Bevakarna</h1>
        <p className="text-xl text-blue-600 mb-2">Säljsystem</p>
        <p className="text-sm text-blue-500">
          Motiverande realtidsrapportering för ditt säljteam
        </p>
      </div>

      {/* Navigation Cards */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Dashboard */}
          <Card className="shadow-lg border-0 transition-all duration-200 hover:scale-105 cursor-pointer group">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                <BarChart3 className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors" />
              </div>
              <CardTitle className="text-2xl text-blue-700">Dashboard</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-6">
                Visa försäljningsstatistik i realtid. Perfekt för TVn på kontoret för att motivera teamet.
              </p>
              <Button 
                asChild
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white transition-all hover:scale-105"
              >
                <Link to="/dashboard" className="flex items-center justify-center gap-2">
                  Öppna dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Säljrapportering */}
          <Card className="shadow-lg border-0 transition-all duration-200 hover:scale-105 cursor-pointer group">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-500 transition-colors">
                <Users className="w-8 h-8 text-green-600 group-hover:text-white transition-colors" />
              </div>
              <CardTitle className="text-2xl text-green-700">Säljrapportering</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-6">
                Rapportera försäljning snabbt och enkelt. Enkel sida för att registrera TB-försäljningar.
              </p>
              <Button 
                asChild
                variant="outline"
                className="w-full border-green-500 text-green-600 hover:bg-green-500 hover:text-white transition-all hover:scale-105"
              >
                <Link to="/sales" className="flex items-center justify-center gap-2">
                  Rapportera försäljning
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-blue-800 mb-8">Funktioner</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white rounded-lg shadow-lg">
              <div className="w-12 h-12 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Realtidsuppdateringar</h3>
              <p className="text-gray-600 text-sm">
                Alla försäljningar syns direkt på dashboarden utan fördröjning
              </p>
            </div>
            
            <div className="p-6 bg-white rounded-lg shadow-lg">
              <div className="w-12 h-12 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Topplistor</h3>
              <p className="text-gray-600 text-sm">
                Se vem som säljer mest idag och denna månad med live-rankningar
              </p>
            </div>
            
            <div className="p-6 bg-white rounded-lg shadow-lg">
              <div className="w-12 h-12 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Teamotivation</h3>
              <p className="text-gray-600 text-sm">
                Animationer och ljud när försäljningar rapporteras in
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-16 pb-8 text-sm text-gray-500">
        <p>ID-Bevakarna Säljsystem v1.0</p>
        <p className="mt-2">Utvecklat för att motivera och inspirera ditt säljteam</p>
        <div className="mt-4 flex gap-2 justify-center">
          <Button 
            asChild
            variant="outline"
            size="sm"
            className="text-xs"
          >
            <Link to="/admin">🔧 Admin Panel</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;