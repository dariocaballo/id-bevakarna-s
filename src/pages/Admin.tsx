import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, Upload, Volume2 } from 'lucide-react';

interface Seller {
  id: string;
  name: string;
  profile_image_url?: string;
  sound_file_url?: string;
}

const Admin = () => {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sellers, setSellers] = useState<Seller[]>([]);

  const handleLogin = () => {
    if (password === 'admin123') {
      setIsAuthenticated(true);
      toast({
        title: "Inloggad",
        description: "Välkommen till admin-panelen"
      });
    } else {
      toast({
        title: "Fel lösenord",
        description: "Försök igen",
        variant: "destructive"
      });
    }
  };

  const loadSellers = async () => {
    try {
      const { data, error } = await supabase.from('sellers').select('*').order('name');
      if (error) throw error;
      setSellers(data || []);
    } catch (error) {
      console.error('Error loading sellers:', error);
      toast({ title: "Fel", description: "Kunde inte ladda säljare", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadSellers();
      
      // Set up real-time subscription for sellers
      const channel = supabase
        .channel('admin-sellers-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'sellers' },
          () => loadSellers()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAuthenticated]);

  const handleProfileImageUpload = async (sellerId: string, file: File) => {
    try {
      // First remove any existing profile image for this seller
      const { data: existingFiles } = await supabase.storage
        .from('seller-profiles')
        .list('profiles');

      if (existingFiles) {
        const filesToRemove = existingFiles
          .filter(f => f.name.includes(sellerId))
          .map(f => `profiles/${f.name}`);
        
        if (filesToRemove.length > 0) {
          await supabase.storage
            .from('seller-profiles')
            .remove(filesToRemove);
        }
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${sellerId}.${fileExt}`;
      const filePath = `profiles/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('seller-profiles')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('seller-profiles')
        .getPublicUrl(filePath);

      // Add cache busting timestamp
      const cacheBustedUrl = `${publicUrl}?v=${Date.now()}`;

      const { error: updateError } = await supabase.from('sellers')
        .update({ 
          profile_image_url: cacheBustedUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', sellerId);

      if (updateError) throw updateError;

      toast({ title: "Framgång", description: "Profilbild uppladdad!" });
      loadSellers();
    } catch (error) {
      toast({ title: "Fel", description: "Kunde inte ladda upp profilbild", variant: "destructive" });
    }
  };

  const handleSoundFileUpload = async (sellerId: string, file: File) => {
    try {
      // Validate file type
      const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg'];
      if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.mp3')) {
        throw new Error('Ogiltigt filformat. Använd MP3, WAV eller OGG.');
      }
      
      // First remove any existing sound file for this seller
      const { data: existingFiles } = await supabase.storage
        .from('seller-sounds')
        .list('sounds');

      if (existingFiles) {
        const filesToRemove = existingFiles
          .filter(f => f.name.includes(sellerId))
          .map(f => `sounds/${f.name}`);
        
        if (filesToRemove.length > 0) {
          await supabase.storage
            .from('seller-sounds')
            .remove(filesToRemove);
        }
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'mp3';
      const fileName = `${sellerId}.${fileExt}`;
      const filePath = `sounds/${fileName}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('seller-sounds')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('seller-sounds')
        .getPublicUrl(filePath);

      // Add cache busting timestamp
      const updateTime = new Date().toISOString();
      const timestampForCache = new Date(updateTime).getTime();
      const cacheBustedUrl = `${publicUrl}?v=${timestampForCache}`;

      const { error: updateError, data: updateData } = await supabase.from('sellers')
        .update({ 
          sound_file_url: cacheBustedUrl,
          updated_at: updateTime
        })
        .eq('id', sellerId);

      if (updateError) {
        throw updateError;
      }

      toast({ 
        title: "Framgång", 
        description: `Ljudfil ${file.name} uppladdad och redo att spelas!`,
        duration: 5000
      });
      
      await loadSellers();
    } catch (error) {
      toast({
        title: "Fel", 
        description: `Kunde inte ladda upp ljudfil: ${error instanceof Error ? error.message : 'Okänt fel'}`, 
        variant: "destructive",
        duration: 8000
      });
    }
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
      <div className="max-w-6xl mx-auto">
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
          <p className="text-blue-600">Hantera profilbilder och ljudfiler</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Säljare - Profilbilder & Ljudfiler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Namn</TableHead>
                  <TableHead>Profilbild</TableHead>
                  <TableHead>Ljudfil</TableHead>
                  <TableHead>Åtgärder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sellers.map((seller) => (
                  <TableRow key={seller.id}>
                    <TableCell className="font-medium">{seller.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {seller.profile_image_url ? (
                          <img
                            src={seller.profile_image_url}
                            alt={seller.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <Users className="w-4 h-4 text-gray-500" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {seller.sound_file_url ? (
                        <div className="flex items-center gap-2">
                          <Volume2 className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-green-600">Uppladdad</span>
                          <button
                            onClick={() => {
                              const audio = new Audio(seller.sound_file_url);
                              audio.play().catch(console.error);
                            }}
                            className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                          >
                            Test
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Ingen ljudfil</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleProfileImageUpload(seller.id, file);
                          }}
                          className="hidden"
                          id={`profile-${seller.id}`}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById(`profile-${seller.id}`)?.click()}
                        >
                          <Upload className="w-4 h-4 mr-1" />
                          Bild
                        </Button>
                        
                        <input
                          type="file"
                          accept="audio/mp3,audio/mpeg,audio/wav,audio/ogg,.mp3,.wav,.ogg"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleSoundFileUpload(seller.id, file);
                            }
                          }}
                          className="hidden"
                          id={`sound-${seller.id}`}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById(`sound-${seller.id}`)?.click()}
                        >
                          <Volume2 className="w-4 h-4 mr-1" />
                          Ljud
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;