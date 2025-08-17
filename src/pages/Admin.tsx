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
  monthly_goal: number;
  created_at: string;
  updated_at: string;
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
    }
  }, [isAuthenticated]);

  const loadSellers = async () => {
    try {
      const { data, error } = await supabase.from('sellers').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setSellers(data || []);
    } catch (error) {
      console.error('Error loading sellers:', error);
      toast({ title: "Fel", description: "Kunde inte ladda säljare", variant: "destructive" });
    }
  };

  const handleProfileImageUpload = async (sellerId: string, file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${sellerId}.${fileExt}`;
      const filePath = `profiles/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('seller-profiles')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('seller-profiles')
        .getPublicUrl(filePath);

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

      const { error: uploadError } = await supabase.storage
        .from('seller-sounds')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('seller-sounds')
        .getPublicUrl(filePath);

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
          <p className="text-blue-600">Hantera profilbilder och ljudfiler</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Hantera säljare
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Endast profilbilder och ljudfiler kan hanteras här.
            </p>
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
                          accept="audio/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleSoundFileUpload(seller.id, file);
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