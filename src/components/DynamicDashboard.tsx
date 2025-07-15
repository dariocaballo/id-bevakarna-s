import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Calendar, Users, DollarSign, Trophy, Clock, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LayoutComponent {
  id: string;
  type: string;
  order: number;
  visible: boolean;
  size: 'small' | 'medium' | 'large' | 'full';
  customData?: {
    text?: string;
    title?: string;
    imageUrl?: string;
    videoUrl?: string;
    backgroundColor?: string;
    textColor?: string;
  };
}

interface Layout {
  id: string;
  layout_name: string;
  is_active: boolean;
  layout_config: {
    components: LayoutComponent[];
  };
  theme_config: {
    primary_color?: string;
    background?: string;
    card_style?: string;
    animation_enabled?: boolean;
  };
}

interface DynamicDashboardProps {
  salesData: {
    totalToday: number;
    totalMonth: number;
    topSellers: any[];
    lastSale: any;
    chartData: any[];
    kingQueen: any;
  };
  sellers: any[];
  challenges: any[];
  settings: any;
}

// Component renderers
const StatsCards = ({ salesData }: { salesData: any }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
    <Card className="card-shadow border-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-primary flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Dagens försäljning
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold text-primary mb-1">
          {new Intl.NumberFormat('sv-SE').format(salesData.totalToday)} tb
        </div>
        <p className="text-sm text-muted-foreground">Totalt idag</p>
      </CardContent>
    </Card>

    <Card className="card-shadow border-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-primary flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Månadens försäljning
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold text-primary mb-1">
          {new Intl.NumberFormat('sv-SE').format(salesData.totalMonth)} tb
        </div>
        <p className="text-sm text-muted-foreground">Totalt denna månad</p>
      </CardContent>
    </Card>
  </div>
);

const LatestSale = ({ lastSale, sellers }: { lastSale: any; sellers: any[] }) => {
  if (!lastSale) return null;

  const seller = sellers.find(s => s.id === lastSale.seller_id || s.name === lastSale.seller_name);

  return (
    <Card className="card-shadow border-0 mb-8 overflow-hidden">
      <div className="bg-success-gradient p-1">
        <div className="bg-card rounded-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-primary flex items-center gap-2">
              <Star className="w-5 h-5" />
              Senaste försäljning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {seller?.profile_image_url && (
                  <img 
                    src={seller.profile_image_url} 
                    alt={lastSale.seller_name}
                    className="w-16 h-16 rounded-full object-cover border-4 border-primary/20"
                  />
                )}
                <div>
                  <p className="text-2xl font-bold text-primary mb-1">
                    {lastSale.seller_name}
                  </p>
                  <p className="text-lg text-muted-foreground">
                    {new Intl.NumberFormat('sv-SE').format(lastSale.amount)} tb
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  {new Date(lastSale.timestamp).toLocaleTimeString('sv-SE', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
};

const SellerCircles = ({ chartData, sellers }: { chartData: any[]; sellers: any[] }) => {
  if (chartData.length === 0) return null;

  return (
    <Card className="card-shadow border-0 mb-8">
      <CardHeader>
        <CardTitle className="text-xl text-primary flex items-center gap-2">
          <Trophy className="w-6 h-6" />
          Dagens försäljning per säljare
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {chartData.map((data) => {
            const seller = sellers.find(s => s.name === data.name);
            return (
              <div key={data.name} className="flex flex-col items-center space-y-3 animate-fade-in">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border-4 border-primary/30 hover:scale-105 transition-transform duration-200">
                    {seller?.profile_image_url ? (
                      <img 
                        src={seller.profile_image_url} 
                        alt={data.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-primary">
                        {data.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-foreground text-sm mb-1">
                    {data.name}
                  </p>
                  <p className="text-lg font-bold text-primary">
                    {new Intl.NumberFormat('sv-SE').format(data.amount)} tb
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

const KingQueen = ({ kingQueen }: { kingQueen: any }) => {
  if (!kingQueen) return null;

  return (
    <Card className="card-shadow border-0 mb-8 overflow-hidden">
      <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 p-1">
        <div className="bg-card rounded-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-primary flex items-center gap-2">
              <Star className="w-5 h-5" />
              Dagens Kung/Drottning 👑
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {kingQueen.imageUrl && (
                <img 
                  src={kingQueen.imageUrl} 
                  alt={kingQueen.name}
                  className="w-20 h-20 rounded-full object-cover border-4 border-yellow-400"
                />
              )}
              <div>
                <p className="text-3xl font-bold text-primary mb-1">
                  {kingQueen.name}
                </p>
                <p className="text-xl text-muted-foreground">
                  {new Intl.NumberFormat('sv-SE').format(kingQueen.amount)} tb idag
                </p>
              </div>
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
};

const DailyChallenges = ({ challenges }: { challenges: any[] }) => {
  if (challenges.length === 0) return null;

  return (
    <Card className="card-shadow border-0 mb-8">
      <CardHeader>
        <CardTitle className="text-xl text-primary flex items-center gap-2">
          🎯 Dagliga utmaningar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {challenges.map((challenge) => (
            <div key={challenge.id} className="p-4 border rounded-lg bg-accent/50">
              <h3 className="font-semibold text-lg mb-2">{challenge.title}</h3>
              <p className="text-muted-foreground mb-2">{challenge.description}</p>
              <p className="text-primary font-bold">
                Mål: {new Intl.NumberFormat('sv-SE').format(challenge.target_amount)} tb
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const TopSellers = ({ topSellers }: { topSellers: any[] }) => {
  if (topSellers.length === 0) return null;

  return (
    <Card className="card-shadow border-0 mb-8">
      <CardHeader>
        <CardTitle className="text-xl text-primary flex items-center gap-2">
          🏆 Månadens topplista
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topSellers.map((seller, index) => (
            <div key={seller.name} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}</span>
                {seller.imageUrl && (
                  <img 
                    src={seller.imageUrl} 
                    alt={seller.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                )}
                <span className="font-semibold">{seller.name}</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-primary">
                  {new Intl.NumberFormat('sv-SE').format(seller.amount)} tb
                </p>
                {seller.goal > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {seller.progress}% av mål
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const CustomText = ({ component }: { component: LayoutComponent }) => (
  <Card className="card-shadow border-0 mb-8" style={{ backgroundColor: component.customData?.backgroundColor }}>
    <CardContent className="p-6">
      {component.customData?.title && (
        <h3 className="text-xl font-bold mb-4" style={{ color: component.customData?.textColor }}>
          {component.customData.title}
        </h3>
      )}
      {component.customData?.text && (
        <div 
          className="prose max-w-none"
          style={{ color: component.customData?.textColor }}
          dangerouslySetInnerHTML={{ __html: component.customData.text.replace(/\n/g, '<br>') }}
        />
      )}
    </CardContent>
  </Card>
);

const CustomImage = ({ component }: { component: LayoutComponent }) => (
  <Card className="card-shadow border-0 mb-8" style={{ backgroundColor: component.customData?.backgroundColor }}>
    <CardContent className="p-6">
      {component.customData?.title && (
        <h3 className="text-xl font-bold mb-4" style={{ color: component.customData?.textColor }}>
          {component.customData.title}
        </h3>
      )}
      {component.customData?.imageUrl && (
        <img 
          src={component.customData.imageUrl} 
          alt={component.customData.title || 'Custom image'}
          className="w-full h-auto rounded-lg"
        />
      )}
    </CardContent>
  </Card>
);

const CustomVideo = ({ component }: { component: LayoutComponent }) => (
  <Card className="card-shadow border-0 mb-8" style={{ backgroundColor: component.customData?.backgroundColor }}>
    <CardContent className="p-6">
      {component.customData?.title && (
        <h3 className="text-xl font-bold mb-4" style={{ color: component.customData?.textColor }}>
          {component.customData.title}
        </h3>
      )}
      {component.customData?.videoUrl && (
        <video 
          src={component.customData.videoUrl} 
          controls
          className="w-full h-auto rounded-lg"
          autoPlay
          loop
          muted
        />
      )}
    </CardContent>
  </Card>
);

export function DynamicDashboard({ salesData, sellers, challenges, settings }: DynamicDashboardProps) {
  const [activeLayout, setActiveLayout] = useState<Layout | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActiveLayout();

    // Listen for layout changes
    const channel = supabase
      .channel('layout-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dashboard_layouts' },
        () => {
          loadActiveLayout();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadActiveLayout = async () => {
    try {
      const { data, error } = await supabase
        .from('dashboard_layouts')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error loading active layout:', error);
        return;
      }

      if (data) {
        setActiveLayout({
          ...data,
          layout_config: (data.layout_config as any) || { components: [] },
          theme_config: (data.theme_config as any) || {}
        });
      }
    } catch (error) {
      console.error('Error loading active layout:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderComponent = (component: LayoutComponent) => {
    if (!component.visible) return null;

    switch (component.type) {
      case 'stats_cards':
        return <StatsCards key={component.id} salesData={salesData} />;
      case 'latest_sale':
        return <LatestSale key={component.id} lastSale={salesData.lastSale} sellers={sellers} />;
      case 'seller_circles':
        return <SellerCircles key={component.id} chartData={salesData.chartData} sellers={sellers} />;
      case 'king_queen':
        return settings.king_queen_enabled && salesData.kingQueen ? (
          <KingQueen key={component.id} kingQueen={salesData.kingQueen} />
        ) : null;
      case 'daily_challenges':
        return settings.challenges_enabled ? (
          <DailyChallenges key={component.id} challenges={challenges} />
        ) : null;
      case 'top_sellers':
        return <TopSellers key={component.id} topSellers={salesData.topSellers} />;
      case 'custom_text':
        return <CustomText key={component.id} component={component} />;
      case 'custom_image':
        return <CustomImage key={component.id} component={component} />;
      case 'custom_video':
        return <CustomVideo key={component.id} component={component} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">Laddar dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // If no layout is found, show default layout
  if (!activeLayout || !activeLayout.layout_config.components.length) {
    return (
      <div className="max-w-7xl mx-auto">
        <StatsCards salesData={salesData} />
        <LatestSale lastSale={salesData.lastSale} sellers={sellers} />
        <SellerCircles chartData={salesData.chartData} sellers={sellers} />
        {settings.king_queen_enabled && salesData.kingQueen && (
          <KingQueen kingQueen={salesData.kingQueen} />
        )}
        {settings.challenges_enabled && (
          <DailyChallenges challenges={challenges} />
        )}
        <TopSellers topSellers={salesData.topSellers} />
      </div>
    );
  }

  // Render components according to layout
  const sortedComponents = activeLayout.layout_config.components
    .sort((a, b) => a.order - b.order);

  return (
    <div className="max-w-7xl mx-auto">
      {sortedComponents.map(renderComponent)}
    </div>
  );
}