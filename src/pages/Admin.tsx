import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Settings, Users, Target, Calendar, BarChart, Upload, Download, Trash2, Edit, Crown, Volume2, Palette, Move, Eye, EyeOff, Plus } from 'lucide-react';

interface Seller {
  id: string;
  name: string;
  profile_image_url?: string;
  sound_file_url?: string;
  monthly_goal: number;
  created_at: string;
  updated_at: string;
}

interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  target_amount: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface DashboardSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  created_at: string;
  updated_at: string;
}

const Admin = () => {
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [settings, setSettings] = useState<{ [key: string]: any }>({});
  const [newSeller, setNewSeller] = useState({ name: '', monthly_goal: 0 });
  const [newChallenge, setNewChallenge] = useState({ title: '', description: '', target_amount: 0 });
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [editingChallenge, setEditingChallenge] = useState<DailyChallenge | null>(null);
  const [layouts, setLayouts] = useState<any[]>([]);
  const [activeLayout, setActiveLayout] = useState<any>(null);
  const [draggedComponent, setDraggedComponent] = useState<any>(null);

  // Authentication
  const handleLogin = () => {
    if (password === 'admin123') {
      setIsAuthenticated(true);
      toast({
        title: "Inloggning lyckades",
        description: "Välkommen till adminpanelen!"
      });
    } else {
      toast({
        title: "Fel lösenord",
        description: "Vänligen försök igen.",
        variant: "destructive"
      });
    }
  };

  // Load data
  useEffect(() => {
    if (isAuthenticated) {
      loadSellers();
      loadChallenges();
      loadSettings();
      loadLayouts();
    }
  }, [isAuthenticated]);

  const loadSellers = async () => {
    const { data, error } = await supabase.from('sellers').select('*').order('created_at', { ascending: false });
    if (error) {
      toast({ title: "Fel", description: "Kunde inte ladda säljare", variant: "destructive" });
    } else {
      setSellers(data || []);
    }
  };

  const loadChallenges = async () => {
    const { data, error } = await supabase.from('daily_challenges').select('*').order('created_at', { ascending: false });
    if (error) {
      toast({ title: "Fel", description: "Kunde inte ladda utmaningar", variant: "destructive" });
    } else {
      setChallenges(data || []);
    }
  };

  const loadSettings = async () => {
    const { data, error } = await supabase.from('dashboard_settings').select('*');
    if (error) {
      toast({ title: "Fel", description: "Kunde inte ladda inställningar", variant: "destructive" });
    } else {
      const settingsObj: { [key: string]: any } = {};
      data?.forEach(setting => {
        settingsObj[setting.setting_key] = setting.setting_value;
      });
      setSettings(settingsObj);
    }
  };

  const loadLayouts = async () => {
    const { data, error } = await supabase.from('dashboard_layouts').select('*').order('created_at', { ascending: false });
    if (error) {
      toast({ title: "Fel", description: "Kunde inte ladda layouts", variant: "destructive" });
    } else {
      setLayouts(data || []);
      const active = data?.find(layout => layout.is_active);
      if (active) setActiveLayout(active);
    }
  };

  // Seller management
  const handleAddSeller = async () => {
    if (!newSeller.name.trim()) {
      toast({ title: "Fel", description: "Namn måste anges", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from('sellers').insert([{
      name: newSeller.name,
      monthly_goal: newSeller.monthly_goal
    }]);

    if (error) {
      toast({ title: "Fel", description: "Kunde inte lägga till säljare", variant: "destructive" });
    } else {
      toast({ title: "Framgång", description: "Säljare tillagd!" });
      setNewSeller({ name: '', monthly_goal: 0 });
      loadSellers();
    }
  };

  const handleUpdateSeller = async (seller: Seller) => {
    const { error } = await supabase.from('sellers').update({
      name: seller.name,
      monthly_goal: seller.monthly_goal
    }).eq('id', seller.id);

    if (error) {
      toast({ title: "Fel", description: "Kunde inte uppdatera säljare", variant: "destructive" });
    } else {
      toast({ title: "Framgång", description: "Säljare uppdaterad!" });
      setEditingSeller(null);
      loadSellers();
    }
  };

  const handleDeleteSeller = async (sellerId: string) => {
    const { error } = await supabase.from('sellers').delete().eq('id', sellerId);

    if (error) {
      toast({ title: "Fel", description: "Kunde inte ta bort säljare", variant: "destructive" });
    } else {
      toast({ title: "Framgång", description: "Säljare borttagen!" });
      loadSellers();
    }
  };

  // Challenge management
  const handleAddChallenge = async () => {
    if (!newChallenge.title.trim() || !newChallenge.description.trim()) {
      toast({ title: "Fel", description: "Titel och beskrivning måste anges", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from('daily_challenges').insert([{
      title: newChallenge.title,
      description: newChallenge.description,
      target_amount: newChallenge.target_amount,
      is_active: false
    }]);

    if (error) {
      toast({ title: "Fel", description: "Kunde inte lägga till utmaning", variant: "destructive" });
    } else {
      toast({ title: "Framgång", description: "Utmaning tillagd!" });
      setNewChallenge({ title: '', description: '', target_amount: 0 });
      loadChallenges();
    }
  };

  const handleUpdateChallenge = async (challenge: DailyChallenge) => {
    const { error } = await supabase.from('daily_challenges').update({
      title: challenge.title,
      description: challenge.description,
      target_amount: challenge.target_amount,
      is_active: challenge.is_active
    }).eq('id', challenge.id);

    if (error) {
      toast({ title: "Fel", description: "Kunde inte uppdatera utmaning", variant: "destructive" });
    } else {
      toast({ title: "Framgång", description: "Utmaning uppdaterad!" });
      setEditingChallenge(null);
      loadChallenges();
    }
  };

  const handleDeleteChallenge = async (challengeId: string) => {
    const { error } = await supabase.from('daily_challenges').delete().eq('id', challengeId);

    if (error) {
      toast({ title: "Fel", description: "Kunde inte ta bort utmaning", variant: "destructive" });
    } else {
      toast({ title: "Framgång", description: "Utmaning borttagen!" });
      loadChallenges();
    }
  };

  // Settings management
  const handleSettingChange = async (key: string, value: any) => {
    // First check if setting exists
    const { data: existing } = await supabase
      .from('dashboard_settings')
      .select('id')
      .eq('setting_key', key)
      .single();

    let error;
    if (existing) {
      // Update existing setting
      const { error: updateError } = await supabase
        .from('dashboard_settings')
        .update({ setting_value: value })
        .eq('setting_key', key);
      error = updateError;
    } else {
      // Insert new setting
      const { error: insertError } = await supabase
        .from('dashboard_settings')
        .insert({ setting_key: key, setting_value: value });
      error = insertError;
    }

    if (error) {
      console.error('Setting update error:', error);
      toast({ title: "Fel", description: "Kunde inte uppdatera inställning", variant: "destructive" });
    } else {
      setSettings(prev => ({ ...prev, [key]: value }));
      toast({ title: "Framgång", description: "Inställning uppdaterad!" });
    }
  };

  // File upload handlers
  const handleProfileImageUpload = async (sellerId: string, file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${sellerId}.${fileExt}`;
    const filePath = `profiles/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('seller-profiles')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Fel", description: "Kunde inte ladda upp bild", variant: "destructive" });
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('seller-profiles')
      .getPublicUrl(filePath);

    const { error: updateError } = await supabase.from('sellers')
      .update({ profile_image_url: publicUrl })
      .eq('id', sellerId);

    if (updateError) {
      toast({ title: "Fel", description: "Kunde inte uppdatera profilbild", variant: "destructive" });
    } else {
      toast({ title: "Framgång", description: "Profilbild uppladdad!" });
      loadSellers();
    }
  };

  const handleSoundFileUpload = async (sellerId: string, file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${sellerId}.${fileExt}`;
    const filePath = `sounds/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('seller-sounds')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Fel", description: "Kunde inte ladda upp ljud", variant: "destructive" });
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('seller-sounds')
      .getPublicUrl(filePath);

    const { error: updateError } = await supabase.from('sellers')
      .update({ sound_file_url: publicUrl })
      .eq('id', sellerId);

    if (updateError) {
      toast({ title: "Fel", description: "Kunde inte uppdatera ljudfil", variant: "destructive" });
    } else {
      toast({ title: "Framgång", description: "Ljudfil uppladdad!" });
      loadSellers();
    }
  };

  // Export to CSV
  const exportSalesData = async () => {
    const { data, error } = await supabase
      .from('sales')
      .select('*, sellers(name)')
      .order('timestamp', { ascending: false });

    if (error) {
      toast({ title: "Fel", description: "Kunde inte exportera data", variant: "destructive" });
      return;
    }

    const csvContent = [
      ['Datum', 'Säljare', 'Belopp'].join(','),
      ...data.map(sale => [
        new Date(sale.timestamp).toLocaleString('sv-SE'),
        sale.sellers?.name || sale.seller_name,
        sale.amount
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Layout management functions
  const updateLayoutConfig = async (layoutId: string, newConfig: any) => {
    const { error } = await supabase
      .from('dashboard_layouts')
      .update({ layout_config: newConfig })
      .eq('id', layoutId);

    if (error) {
      toast({ title: "Fel", description: "Kunde inte uppdatera layout", variant: "destructive" });
    } else {
      setActiveLayout(prev => ({ ...prev, layout_config: newConfig }));
      toast({ title: "Framgång", description: "Layout uppdaterad!" });
      loadLayouts(); // Reload to get fresh data
    }
  };

  const updateThemeConfig = async (key: string, value: any) => {
    if (!activeLayout) return;
    
    const newThemeConfig = { ...activeLayout.theme_config, [key]: value };
    const { error } = await supabase
      .from('dashboard_layouts')
      .update({ theme_config: newThemeConfig })
      .eq('id', activeLayout.id);

    if (error) {
      toast({ title: "Fel", description: "Kunde inte uppdatera tema", variant: "destructive" });
    } else {
      setActiveLayout(prev => ({ ...prev, theme_config: newThemeConfig }));
      toast({ title: "Framgång", description: "Tema uppdaterat!" });
    }
  };

  const toggleComponentVisibility = async (componentId: string) => {
    if (!activeLayout) return;
    
    const updatedComponents = activeLayout.layout_config.components.map((comp: any) =>
      comp.id === componentId ? { ...comp, visible: !comp.visible } : comp
    );
    
    const updatedConfig = { ...activeLayout.layout_config, components: updatedComponents };
    await updateLayoutConfig(activeLayout.id, updatedConfig);
  };

  const removeComponent = async (componentId: string) => {
    if (!activeLayout) return;
    
    const updatedComponents = activeLayout.layout_config.components.filter((comp: any) => comp.id !== componentId);
    const updatedConfig = { ...activeLayout.layout_config, components: updatedComponents };
    await updateLayoutConfig(activeLayout.id, updatedConfig);
  };

  const createNewLayout = async () => {
    const { data, error } = await supabase
      .from('dashboard_layouts')
      .insert([{
        layout_name: `Ny Layout ${layouts.length + 1}`,
        is_active: false,
        layout_config: { components: [] },
        theme_config: { 
          primary_color: "hsl(var(--primary))",
          background: "gradient",
          card_style: "modern",
          animation_enabled: true 
        }
      }])
      .select()
      .single();

    if (error) {
      toast({ title: "Fel", description: "Kunde inte skapa layout", variant: "destructive" });
    } else {
      toast({ title: "Framgång", description: "Ny layout skapad!" });
      loadLayouts();
    }
  };

  const getComponentIcon = (type: string) => {
    const iconMap: { [key: string]: string } = {
      'stats_cards': '📊',
      'latest_sale': '⭐',
      'seller_circles': '👥',
      'king_queen': '👑',
      'daily_challenges': '🎯',
      'top_sellers': '🏆',
      'custom_text': '📝',
      'custom_image': '🖼️',
      'custom_video': '🎬'
    };
    return iconMap[type] || '📦';
  };

  const getComponentName = (type: string) => {
    const nameMap: { [key: string]: string } = {
      'stats_cards': 'Statistikkort',
      'latest_sale': 'Senaste försäljning',
      'seller_circles': 'Säljare cirklar',
      'king_queen': 'Dagens Kung/Drottning',
      'daily_challenges': 'Dagliga utmaningar',
      'top_sellers': 'Topplista',
      'custom_text': 'Egen text',
      'custom_image': 'Egen bild',
      'custom_video': 'Video/GIF'
    };
    return nameMap[type] || 'Okänd komponent';
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img 
                src="/lovable-uploads/a4efd036-dc1e-420a-8621-0fe448423e2f.png" 
                alt="ID Bevakarna" 
                className="h-16 w-auto"
              />
            </div>
            <CardTitle className="text-2xl text-blue-800">Admin Panel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Lösenord</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Ange lösenord"
              />
            </div>
            <Button onClick={handleLogin} className="w-full">
              Logga in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 text-center">
          <img 
            src="/lovable-uploads/a4efd036-dc1e-420a-8621-0fe448423e2f.png" 
            alt="ID Bevakarna" 
            className="h-12 w-auto mx-auto mb-4"
          />
          <h1 className="text-4xl font-bold text-blue-800 mb-2">Admin Panel</h1>
          <p className="text-blue-600">Konfigurera och hantera ert säljdashboard</p>
        </div>

        <Tabs defaultValue="sellers" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="sellers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Säljare
            </TabsTrigger>
            <TabsTrigger value="layout" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Layout Editor
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Säljmål
            </TabsTrigger>
            <TabsTrigger value="challenges" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Utmaningar
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Inställningar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sellers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Lägg till ny säljare</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="seller-name">Namn</Label>
                    <Input
                      id="seller-name"
                      value={newSeller.name}
                      onChange={(e) => setNewSeller(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ange säljarens namn"
                    />
                  </div>
                  <div>
                    <Label htmlFor="monthly-goal">Månatligt mål (tb)</Label>
                    <Input
                      id="monthly-goal"
                      type="number"
                      value={newSeller.monthly_goal}
                      onChange={(e) => setNewSeller(prev => ({ ...prev, monthly_goal: Number(e.target.value) }))}
                      placeholder="0"
                    />
                  </div>
                </div>
                <Button onClick={handleAddSeller}>Lägg till säljare</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Hantera säljare</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Namn</TableHead>
                      <TableHead>Månatligt mål</TableHead>
                      <TableHead>Profilbild</TableHead>
                      <TableHead>Ljudfil</TableHead>
                      <TableHead>Åtgärder</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sellers.map((seller) => (
                      <TableRow key={seller.id}>
                        <TableCell>
                          {editingSeller?.id === seller.id ? (
                            <Input
                              value={editingSeller.name}
                              onChange={(e) => setEditingSeller(prev => prev ? { ...prev, name: e.target.value } : null)}
                            />
                          ) : (
                            seller.name
                          )}
                        </TableCell>
                        <TableCell>
                          {editingSeller?.id === seller.id ? (
                            <Input
                              type="number"
                              value={editingSeller.monthly_goal}
                              onChange={(e) => setEditingSeller(prev => prev ? { ...prev, monthly_goal: Number(e.target.value) } : null)}
                            />
                          ) : (
                            `${seller.monthly_goal.toLocaleString()} tb`
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {seller.profile_image_url && (
                              <img src={seller.profile_image_url} alt={seller.name} className="w-8 h-8 rounded-full" />
                            )}
                            <label className="cursor-pointer">
                              <Upload className="h-4 w-4 text-blue-500" />
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => e.target.files?.[0] && handleProfileImageUpload(seller.id, e.target.files[0])}
                              />
                            </label>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {seller.sound_file_url && <Volume2 className="h-4 w-4 text-green-500" />}
                            <label className="cursor-pointer">
                              <Upload className="h-4 w-4 text-blue-500" />
                              <input
                                type="file"
                                accept="audio/*"
                                className="hidden"
                                onChange={(e) => e.target.files?.[0] && handleSoundFileUpload(seller.id, e.target.files[0])}
                              />
                            </label>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {editingSeller?.id === seller.id ? (
                              <>
                                <Button size="sm" onClick={() => handleUpdateSeller(editingSeller)}>
                                  Spara
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingSeller(null)}>
                                  Avbryt
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button size="sm" variant="outline" onClick={() => setEditingSeller(seller)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleDeleteSeller(seller.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Layout Editor Tab */}
          <TabsContent value="layout" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Dashboard Layout Editor
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Dra och släpp komponenter för att anpassa dashboardens layout. Alla ändringar sparas automatiskt och syns direkt på dashboarden.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Active Layout Selector */}
                <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50">
                  <div>
                    <h3 className="font-semibold">Aktiv Layout</h3>
                    <p className="text-sm text-muted-foreground">
                      {activeLayout?.layout_name || 'Standard Layout'}
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => window.open('/dashboard', '_blank')}>
                    <Eye className="h-4 w-4 mr-2" />
                    Förhandsgranska
                  </Button>
                </div>

                {/* Component Library */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Available Components */}
                  <div className="lg:col-span-1">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Tillgängliga komponenter
                    </h3>
                    <div className="space-y-2">
                      {[
                        { id: 'stats', type: 'stats_cards', name: 'Statistikkort', icon: '📊' },
                        { id: 'latest_sale', type: 'latest_sale', name: 'Senaste försäljning', icon: '⭐' },
                        { id: 'seller_circles', type: 'seller_circles', name: 'Säljare cirklar', icon: '👥' },
                        { id: 'king_queen', type: 'king_queen', name: 'Dagens Kung/Drottning', icon: '👑' },
                        { id: 'challenges', type: 'daily_challenges', name: 'Dagliga utmaningar', icon: '🎯' },
                        { id: 'top_list', type: 'top_sellers', name: 'Topplista', icon: '🏆' },
                        { id: 'custom_text', type: 'custom_text', name: 'Egen text', icon: '📝' },
                        { id: 'custom_image', type: 'custom_image', name: 'Egen bild', icon: '🖼️' },
                        { id: 'custom_video', type: 'custom_video', name: 'Video/GIF', icon: '🎬' }
                      ].map((component) => (
                        <div
                          key={component.id}
                          className="p-3 border rounded-lg cursor-move hover:bg-accent transition-colors"
                          draggable
                          onDragStart={(e) => {
                            setDraggedComponent(component);
                            e.dataTransfer.effectAllowed = 'copy';
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{component.icon}</span>
                            <span className="text-sm font-medium">{component.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Layout Canvas */}
                  <div className="lg:col-span-2">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Move className="h-4 w-4" />
                      Dashboard Layout
                    </h3>
                    <div 
                      className="min-h-96 border-2 border-dashed border-gray-300 rounded-lg p-4 space-y-3"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={async (e) => {
                        e.preventDefault();
                        if (draggedComponent && activeLayout) {
                          const newComponent = {
                            ...draggedComponent,
                            order: (activeLayout.layout_config?.components?.length || 0) + 1,
                            visible: true,
                            size: 'full'
                          };
                          
                          const updatedConfig = {
                            ...activeLayout.layout_config,
                            components: [...(activeLayout.layout_config?.components || []), newComponent]
                          };
                          
                          await updateLayoutConfig(activeLayout.id, updatedConfig);
                        }
                        setDraggedComponent(null);
                      }}
                    >
                      {activeLayout?.layout_config?.components?.length === 0 ? (
                        <div className="text-center text-gray-500 py-12">
                          <p>Dra komponenter hit för att bygga din layout</p>
                        </div>
                      ) : (
                        activeLayout?.layout_config?.components
                          ?.sort((a: any, b: any) => a.order - b.order)
                          ?.map((component: any, index: number) => (
                          <div
                            key={`${component.id}-${index}`}
                            className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <Move className="h-4 w-4 text-gray-400 cursor-move" />
                              <span>{getComponentIcon(component.type)}</span>
                              <span className="font-medium">{getComponentName(component.type)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleComponentVisibility(component.id)}
                              >
                                {component.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeComponent(component.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Theme Configuration */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Färger & Stil</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Färgtema</Label>
                        <div className="grid grid-cols-4 gap-2 mt-2">
                          {[
                            { name: 'Blå', value: 'blue', color: 'bg-blue-500' },
                            { name: 'Grön', value: 'green', color: 'bg-green-500' },
                            { name: 'Lila', value: 'purple', color: 'bg-purple-500' },
                            { name: 'Orange', value: 'orange', color: 'bg-orange-500' }
                          ].map((theme) => (
                            <div
                              key={theme.value}
                              className={`h-8 rounded cursor-pointer border-2 ${theme.color} ${
                                activeLayout?.theme_config?.color_theme === theme.value ? 'border-gray-800' : 'border-gray-200'
                              }`}
                              onClick={() => updateThemeConfig('color_theme', theme.value)}
                            />
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <Label>Bakgrund</Label>
                        <div className="space-y-1 mt-2">
                          {[
                            { name: 'Gradient', value: 'gradient' },
                            { name: 'Enfärgad', value: 'solid' },
                            { name: 'Mönster', value: 'pattern' }
                          ].map((bg) => (
                            <div
                              key={bg.value}
                              className={`p-2 text-sm rounded cursor-pointer border ${
                                activeLayout?.theme_config?.background === bg.value ? 'bg-blue-100 border-blue-300' : 'border-gray-200'
                              }`}
                              onClick={() => updateThemeConfig('background', bg.value)}
                            >
                              {bg.name}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label>Kortstil</Label>
                        <div className="space-y-1 mt-2">
                          {[
                            { name: 'Modern', value: 'modern' },
                            { name: 'Klassisk', value: 'classic' },
                            { name: 'Minimalistisk', value: 'minimal' }
                          ].map((style) => (
                            <div
                              key={style.value}
                              className={`p-2 text-sm rounded cursor-pointer border ${
                                activeLayout?.theme_config?.card_style === style.value ? 'bg-blue-100 border-blue-300' : 'border-gray-200'
                              }`}
                              onClick={() => updateThemeConfig('card_style', style.value)}
                            >
                              {style.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <Label>Animationer</Label>
                      <Switch
                        checked={activeLayout?.theme_config?.animation_enabled !== false}
                        onCheckedChange={(checked) => updateThemeConfig('animation_enabled', checked)}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Save Actions */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Ändringar sparas automatiskt och syns direkt på dashboarden
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={createNewLayout}>
                      Skapa ny layout
                    </Button>
                    <Button onClick={() => window.open('/dashboard', '_blank')}>
                      Visa dashboard
                    </Button>
                  </div>
                </div>

              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="goals" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Säljmål inställningar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="goals-enabled">Aktivera säljmål</Label>
                  <Switch
                    id="goals-enabled"
                    checked={settings.goals_enabled === 'true'}
                    onCheckedChange={(checked) => handleSettingChange('goals_enabled', checked.toString())}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  När aktiverat visas progressbars för varje säljares månatliga mål på dashboarden.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Individuella säljmål</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Säljare</TableHead>
                      <TableHead>Månatligt mål</TableHead>
                      <TableHead>Aktuell månadsförsäljning</TableHead>
                      <TableHead>Framsteg</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sellers.map((seller) => (
                      <TableRow key={seller.id}>
                        <TableCell>{seller.name}</TableCell>
                        <TableCell>{seller.monthly_goal.toLocaleString()} tb</TableCell>
                        <TableCell>Beräknas dynamiskt</TableCell>
                        <TableCell>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-blue-600 h-2 rounded-full" style={{ width: '45%' }}></div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="challenges" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Skapa ny utmaning</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="challenge-title">Titel</Label>
                  <Input
                    id="challenge-title"
                    value={newChallenge.title}
                    onChange={(e) => setNewChallenge(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="T.ex. Första till 5000 tb"
                  />
                </div>
                <div>
                  <Label htmlFor="challenge-description">Beskrivning</Label>
                  <Textarea
                    id="challenge-description"
                    value={newChallenge.description}
                    onChange={(e) => setNewChallenge(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Beskriv utmaningen och reglerna"
                  />
                </div>
                <div>
                  <Label htmlFor="challenge-amount">Målbelopp (tb)</Label>
                  <Input
                    id="challenge-amount"
                    type="number"
                    value={newChallenge.target_amount}
                    onChange={(e) => setNewChallenge(prev => ({ ...prev, target_amount: Number(e.target.value) }))}
                    placeholder="0"
                  />
                </div>
                <Button onClick={handleAddChallenge}>Skapa utmaning</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Hantera utmaningar</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titel</TableHead>
                      <TableHead>Beskrivning</TableHead>
                      <TableHead>Målbelopp</TableHead>
                      <TableHead>Aktiv</TableHead>
                      <TableHead>Åtgärder</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {challenges.map((challenge) => (
                      <TableRow key={challenge.id}>
                        <TableCell>
                          {editingChallenge?.id === challenge.id ? (
                            <Input
                              value={editingChallenge.title}
                              onChange={(e) => setEditingChallenge(prev => prev ? { ...prev, title: e.target.value } : null)}
                            />
                          ) : (
                            challenge.title
                          )}
                        </TableCell>
                        <TableCell>
                          {editingChallenge?.id === challenge.id ? (
                            <Textarea
                              value={editingChallenge.description}
                              onChange={(e) => setEditingChallenge(prev => prev ? { ...prev, description: e.target.value } : null)}
                            />
                          ) : (
                            challenge.description
                          )}
                        </TableCell>
                        <TableCell>
                          {editingChallenge?.id === challenge.id ? (
                            <Input
                              type="number"
                              value={editingChallenge.target_amount}
                              onChange={(e) => setEditingChallenge(prev => prev ? { ...prev, target_amount: Number(e.target.value) } : null)}
                            />
                          ) : (
                            `${challenge.target_amount.toLocaleString()} tb`
                          )}
                        </TableCell>
                        <TableCell>
                          {editingChallenge?.id === challenge.id ? (
                            <Switch
                              checked={editingChallenge.is_active}
                              onCheckedChange={(checked) => setEditingChallenge(prev => prev ? { ...prev, is_active: checked } : null)}
                            />
                          ) : (
                            <Switch
                              checked={challenge.is_active}
                              onCheckedChange={(checked) => handleUpdateChallenge({ ...challenge, is_active: checked })}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {editingChallenge?.id === challenge.id ? (
                              <>
                                <Button size="sm" onClick={() => handleUpdateChallenge(editingChallenge)}>
                                  Spara
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingChallenge(null)}>
                                  Avbryt
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button size="sm" variant="outline" onClick={() => setEditingChallenge(challenge)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleDeleteChallenge(challenge.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Dashboard synlighet</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-recent">Visa senaste försäljning</Label>
                    <Switch
                      id="show-recent"
                      checked={settings.show_recent_sales === 'true'}
                      onCheckedChange={(checked) => handleSettingChange('show_recent_sales', checked.toString())}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-chart">Visa stapeldiagram</Label>
                    <Switch
                      id="show-chart"
                      checked={settings.show_chart === 'true'}
                      onCheckedChange={(checked) => handleSettingChange('show_chart', checked.toString())}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-toplist">Visa topplista</Label>
                    <Switch
                      id="show-toplist"
                      checked={settings.show_top_list === 'true'}
                      onCheckedChange={(checked) => handleSettingChange('show_top_list', checked.toString())}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-totals">Visa totaler</Label>
                    <Switch
                      id="show-totals"
                      checked={settings.show_totals === 'true'}
                      onCheckedChange={(checked) => handleSettingChange('show_totals', checked.toString())}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Exportera data</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={exportSalesData} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Exportera till CSV
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Ladda ner all försäljningsdata som CSV-fil
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Avancerade funktioner</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="night-mode">Nattläge (18:00-09:00)</Label>
                  <Switch
                    id="night-mode"
                    checked={settings.night_mode_enabled === 'true'}
                    onCheckedChange={(checked) => handleSettingChange('night_mode_enabled', checked.toString())}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="king-queen">Dagens Kung/Drottning</Label>
                  <Switch
                    id="king-queen"
                    checked={settings.king_queen_enabled === 'true'}
                    onCheckedChange={(checked) => handleSettingChange('king_queen_enabled', checked.toString())}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="selfie-function">Selfie-funktion</Label>
                  <Switch
                    id="selfie-function"
                    checked={settings.selfie_enabled === 'true'}
                    onCheckedChange={(checked) => handleSettingChange('selfie_enabled', checked.toString())}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="challenges-enabled">Dagliga utmaningar</Label>
                  <Switch
                    id="challenges-enabled"
                    checked={settings.challenges_enabled === 'true'}
                    onCheckedChange={(checked) => handleSettingChange('challenges_enabled', checked.toString())}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;