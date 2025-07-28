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

import { Settings, Users, Target, Calendar, BarChart, Upload, Download, Trash2, Edit, Crown, Volume2, Palette, Move, Eye, EyeOff, Plus, LogOut } from 'lucide-react';

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
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [settings, setSettings] = useState<{ [key: string]: any }>({});
  const [newSeller, setNewSeller] = useState({ name: '', monthly_goal: 0 });
  const [newChallenge, setNewChallenge] = useState({ title: '', description: '', target_amount: 0 });
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [editingChallenge, setEditingChallenge] = useState<DailyChallenge | null>(null);

  const handleLogin = () => {
    if (password === 'admin123') {
      setIsAuthenticated(true);
      toast({
        title: "Framgång",
        description: "Inloggad som administratör"
      });
    } else {
      toast({
        title: "Fel",
        description: "Fel lösenord",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadSellers();
      loadChallenges();
      loadSettings();
    }
  }, [isAuthenticated]);

  const loadSellers = async () => {
    try {
      console.log('👥 Loading sellers for admin...');
      const { data, error } = await supabase.from('sellers').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      
      console.log('✅ Sellers loaded:', data?.length || 0);
      setSellers(data || []);
    } catch (error) {
      console.error('❌ Error loading sellers:', error);
      toast({ title: "Fel", description: "Kunde inte ladda säljare", variant: "destructive" });
    }
  };

  const loadChallenges = async () => {
    try {
      console.log('🎯 Loading challenges for admin...');
      const { data, error } = await supabase.from('daily_challenges').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      
      console.log('✅ Challenges loaded:', data?.length || 0);
      setChallenges(data || []);
    } catch (error) {
      console.error('❌ Error loading challenges:', error);
      toast({ title: "Fel", description: "Kunde inte ladda utmaningar", variant: "destructive" });
    }
  };

  const loadSettings = async () => {
    try {
      console.log('⚙️ Loading settings for admin...');
      const { data, error } = await supabase.from('dashboard_settings').select('*');
      if (error) throw error;
      
      const settingsObj: { [key: string]: any } = {};
      data?.forEach(setting => {
        settingsObj[setting.setting_key] = setting.setting_value;
      });
      
      console.log('✅ Settings loaded:', Object.keys(settingsObj).length);
      setSettings(settingsObj);
    } catch (error) {
      console.error('❌ Error loading settings:', error);
      toast({ title: "Fel", description: "Kunde inte ladda inställningar", variant: "destructive" });
    }
  };

  // Seller management
  const handleAddSeller = async () => {
    if (!newSeller.name.trim()) {
      toast({ title: "Fel", description: "Namn måste anges", variant: "destructive" });
      return;
    }

    try {
      const { data, error } = await supabase.from('sellers').insert([{
        name: newSeller.name.trim(),
        monthly_goal: newSeller.monthly_goal || 0
      }]).select().single();

      if (error) throw error;

      toast({ title: "Framgång", description: "Säljare tillagd! Du kan nu ladda upp profilbild och ljud." });
      setNewSeller({ name: '', monthly_goal: 0 });
      loadSellers();
    } catch (error) {
      console.error('Error adding seller:', error);
      toast({ title: "Fel", description: "Kunde inte lägga till säljare", variant: "destructive" });
    }
  };

  const handleUpdateSeller = async (seller: Seller) => {
    try {
      const { error } = await supabase.from('sellers').update({
        name: seller.name.trim(),
        monthly_goal: seller.monthly_goal || 0
      }).eq('id', seller.id);

      if (error) throw error;

      toast({ title: "Framgång", description: "Säljare uppdaterad!" });
      setEditingSeller(null);
      loadSellers();
    } catch (error) {
      console.error('Error updating seller:', error);
      toast({ title: "Fel", description: "Kunde inte uppdatera säljare", variant: "destructive" });
    }
  };

  const handleDeleteSeller = async (sellerId: string) => {
    try {
      // First delete all sales by this seller
      const { error: salesError } = await supabase
        .from('sales')
        .delete()
        .eq('seller_id', sellerId);

      if (salesError) {
        console.warn('Error deleting sales:', salesError);
      }

      // Then delete the seller
      const { error } = await supabase.from('sellers').delete().eq('id', sellerId);

      if (error) throw error;

      toast({ title: "Framgång", description: "Säljare och all relaterad data borttagen!" });
      loadSellers();
    } catch (error) {
      console.error('Error deleting seller:', error);
      toast({ title: "Fel", description: "Kunde inte ta bort säljare", variant: "destructive" });
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

  // Settings management with improved performance
  const handleSettingChange = async (key: string, value: any) => {
    try {
      console.log('⚙️ Updating setting:', key, '=', value);
      
      // Optimistically update UI first
      setSettings(prev => ({ ...prev, [key]: value }));
      
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
        console.error('❌ Setting update error:', error);
        // Revert optimistic update
        loadSettings();
        toast({ title: "Fel", description: "Kunde inte uppdatera inställning", variant: "destructive" });
      } else {
        console.log('✅ Setting updated successfully:', key);
        toast({ title: "Framgång", description: "Inställning uppdaterad!" });
      }
    } catch (error) {
      console.error('❌ Unexpected error updating setting:', error);
      loadSettings(); // Reload to ensure consistency
      toast({ title: "Fel", description: "Oväntat fel vid uppdatering", variant: "destructive" });
    }
  };

  // File upload handlers
  const handleProfileImageUpload = async (sellerId: string, file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${sellerId}.${fileExt}`;
      const filePath = `profiles/${fileName}`;

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from('seller-profiles')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('seller-profiles')
        .getPublicUrl(filePath);

      // Update seller record
      const { error: updateError } = await supabase.from('sellers')
        .update({ profile_image_url: publicUrl })
        .eq('id', sellerId);

      if (updateError) throw updateError;

      toast({ title: "Framgång", description: "Profilbild uppladdad!" });
      loadSellers();
    } catch (error) {
      console.error('Error uploading profile image:', error);
      toast({ title: "Fel", description: "Kunde inte ladda upp profilbild", variant: "destructive" });
    }
  };

  const handleSoundFileUpload = async (sellerId: string, file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${sellerId}.${fileExt}`;
      const filePath = `sounds/${fileName}`;

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from('seller-sounds')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('seller-sounds')
        .getPublicUrl(filePath);

      // Update seller record
      const { error: updateError } = await supabase.from('sellers')
        .update({ sound_file_url: publicUrl })
        .eq('id', sellerId);

      if (updateError) throw updateError;

      toast({ title: "Framgång", description: "Ljudfil uppladdad!" });
      loadSellers();
    } catch (error) {
      console.error('Error uploading sound file:', error);
      toast({ title: "Fel", description: "Kunde inte ladda upp ljudfil", variant: "destructive" });
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Admin Inloggning</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="password">Lösenord</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Ange admin lösenord"
              />
            </div>
            <Button onClick={handleLogin} className="w-full">Logga in</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 text-center">
          <div className="flex justify-between items-center mb-4">
            <div className="flex-1"></div>
            <img 
              src="/lovable-uploads/a4efd036-dc1e-420a-8621-0fe448423e2f.png" 
              alt="ID Bevakarna" 
              className="h-12 w-auto mx-auto"
            />
            <div className="flex-1 flex justify-end">
              <Button onClick={() => setIsAuthenticated(false)} variant="outline">
                Logga ut
              </Button>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-blue-800 mb-2">Admin Panel</h1>
          <p className="text-blue-600">Konfigurera och hantera ert säljdashboard</p>
        </div>

        <Tabs defaultValue="sellers" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="sellers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Säljare
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

            <Card>
              <CardHeader>
                <CardTitle>🎉 Firande-effekter</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="celebration-enabled">Aktivera firande</Label>
                  <Switch
                    id="celebration-enabled"
                    checked={settings.celebration_enabled === true}
                    onCheckedChange={(checked) => handleSettingChange('celebration_enabled', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-bubble">Visa bubble med säljarens bild</Label>
                  <Switch
                    id="show-bubble"
                    checked={settings.show_bubble === true}
                    onCheckedChange={(checked) => handleSettingChange('show_bubble', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-confetti">Visa konfetti</Label>
                  <Switch
                    id="show-confetti"
                    checked={settings.show_confetti === true}
                    onCheckedChange={(checked) => handleSettingChange('show_confetti', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="play-sound">Spela ljud</Label>
                  <Switch
                    id="play-sound"
                    checked={settings.play_sound === true}
                    onCheckedChange={(checked) => handleSettingChange('play_sound', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="special-effect">Specialeffekt vid måluppfyllelse</Label>
                  <Switch
                    id="special-effect"
                    checked={settings.special_effect === true}
                    onCheckedChange={(checked) => handleSettingChange('special_effect', checked)}
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
