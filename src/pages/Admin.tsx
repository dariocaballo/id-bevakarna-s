import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, Upload, Volume2, Play, Trash2, RefreshCw } from 'lucide-react';
import { validateImageFile, validateAudioFile, uploadToBucket, updateSellerMedia, getVersionedUrl, createAudio } from '@/utils/media';

interface Seller {
  id: string;
  name: string;
  profile_image_url?: string;
  sound_file_url?: string;
  updated_at?: string;
}

interface UploadProgress {
  [sellerId: string]: {
    image?: boolean;
    audio?: boolean;
  };
}

const Admin = () => {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

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
          { event: 'UPDATE', schema: 'public', table: 'sellers' },
          () => {
            console.log('Seller updated, reloading...');
            loadSellers();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAuthenticated]);

  const setProgress = (sellerId: string, type: 'image' | 'audio', loading: boolean) => {
    setUploadProgress(prev => ({
      ...prev,
      [sellerId]: {
        ...prev[sellerId],
        [type]: loading
      }
    }));
  };

  const handleProfileImageUpload = async (sellerId: string, file: File) => {
    setProgress(sellerId, 'image', true);
    
    try {
      // Validate file
      const validation = validateImageFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      toast({
        title: "Uppladdning påbörjad",
        description: `Laddar upp profilbild för ${sellers.find(s => s.id === sellerId)?.name}...`
      });

      // Upload to bucket
      const uploadResult = await uploadToBucket('seller-profiles', file, sellerId);
      if (uploadResult.error) {
        throw new Error(uploadResult.error);
      }

      // Update database with cache-busting timestamp
      const timestamp = Date.now();
      const cacheBustedUrl = `${uploadResult.publicUrl}?v=${timestamp}`;
      
      const updateResult = await updateSellerMedia(sellerId, {
        profile_image_url: cacheBustedUrl
      });
      if (updateResult.error) {
        throw new Error(updateResult.error);
      }

      toast({ 
        title: "Framgång", 
        description: "Profilbild uppladdad och sparad! Uppdateras live inom 1-2 sekunder." 
      });
      
      // Force immediate local update for instant feedback
      setSellers(prev => prev.map(seller => 
        seller.id === sellerId 
          ? { ...seller, profile_image_url: cacheBustedUrl, updated_at: new Date().toISOString() }
          : seller
      ));
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Kunde inte ladda upp profilbild';
      toast({ title: "Fel", description: errorMsg, variant: "destructive" });
    } finally {
      setProgress(sellerId, 'image', false);
    }
  };

  const handleSoundFileUpload = async (sellerId: string, file: File) => {
    console.log(`🎵 Admin: Starting MP3 upload for seller ${sellerId}:`, {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    });

    setProgress(sellerId, 'audio', true);
    
    try {
      // Validate file
      console.log('🔍 Admin: Validating audio file...');
      const validation = validateAudioFile(file);
      if (!validation.valid) {
        console.error('❌ Admin: Audio validation failed:', validation.error);
        throw new Error(validation.error);
      }

      const sellerName = sellers.find(s => s.id === sellerId)?.name || 'okänd säljare';
      console.log(`✅ Admin: Audio validation passed for ${sellerName}`);
      
      toast({
        title: "Uppladdning påbörjad",
        description: `Laddar upp ljudfil för ${sellerName}...`
      });

      // Upload to bucket
      console.log('📤 Admin: Uploading to seller-sounds bucket...');
      const uploadResult = await uploadToBucket('seller-sounds', file, sellerId);
      if (uploadResult.error) {
        console.error('❌ Admin: Upload failed:', uploadResult.error);
        throw new Error(uploadResult.error);
      }
      console.log('✅ Admin: Upload successful, URL:', uploadResult.publicUrl);

      // Update database with cache-busting timestamp
      const timestamp = Date.now();
      const cacheBustedUrl = `${uploadResult.publicUrl}?v=${timestamp}`;
      
      console.log('💾 Admin: Updating database with URL:', cacheBustedUrl);
      const updateResult = await updateSellerMedia(sellerId, {
        sound_file_url: cacheBustedUrl
      });
      if (updateResult.error) {
        console.error('❌ Admin: Database update failed:', updateResult.error);
        throw new Error(updateResult.error);
      }
      console.log('✅ Admin: Database updated successfully');

      toast({ 
        title: "Framgång", 
        description: `Ljudfil ${file.name} uppladdad och redo att spelas! Uppdateras live inom 1-2 sekunder.`
      });
      
      // Force immediate local update for instant feedback
      setSellers(prev => prev.map(seller => 
        seller.id === sellerId 
          ? { ...seller, sound_file_url: cacheBustedUrl, updated_at: new Date().toISOString() }
          : seller
      ));
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Okänt fel';
      console.error('❌ Admin: MP3 upload failed:', errorMsg);
      toast({
        title: "Fel", 
        description: `Kunde inte ladda upp ljudfil: ${errorMsg}`, 
        variant: "destructive"
      });
    } finally {
      setProgress(sellerId, 'audio', false);
    }
  };

  const handleDeleteProfileImage = async (sellerId: string) => {
    const seller = sellers.find(s => s.id === sellerId);
    if (!seller?.profile_image_url) return;

    setProgress(sellerId, 'image', true);
    
    try {
      // Extract filename from URL to delete from storage
      const url = new URL(seller.profile_image_url);
      const filename = url.pathname.split('/').pop()?.split('?')[0]; // Remove query params
      
      if (filename && filename.startsWith(sellerId)) {
        await supabase.storage
          .from('seller-profiles')
          .remove([filename]);
      }

      // Update database to remove URL
      const updateResult = await updateSellerMedia(sellerId, {
        profile_image_url: null as any
      });
      if (updateResult.error) {
        throw new Error(updateResult.error);
      }

      toast({ 
        title: "Borttagen", 
        description: "Profilbild har tagits bort"
      });
      
      // Force immediate local update
      setSellers(prev => prev.map(seller => 
        seller.id === sellerId 
          ? { ...seller, profile_image_url: undefined, updated_at: new Date().toISOString() }
          : seller
      ));
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Kunde inte ta bort profilbild';
      toast({ title: "Fel", description: errorMsg, variant: "destructive" });
    } finally {
      setProgress(sellerId, 'image', false);
    }
  };

  const handleDeleteSoundFile = async (sellerId: string) => {
    const seller = sellers.find(s => s.id === sellerId);
    if (!seller?.sound_file_url) return;

    setProgress(sellerId, 'audio', true);
    
    try {
      // Extract filename from URL to delete from storage
      const url = new URL(seller.sound_file_url);
      const filename = url.pathname.split('/').pop()?.split('?')[0]; // Remove query params
      
      if (filename && filename.startsWith(sellerId)) {
        await supabase.storage
          .from('seller-sounds')
          .remove([filename]);
      }

      // Update database to remove URL
      const updateResult = await updateSellerMedia(sellerId, {
        sound_file_url: null as any
      });
      if (updateResult.error) {
        throw new Error(updateResult.error);
      }

      toast({ 
        title: "Borttagen", 
        description: "Ljudfil har tagits bort"
      });
      
      // Force immediate local update
      setSellers(prev => prev.map(seller => 
        seller.id === sellerId 
          ? { ...seller, sound_file_url: undefined, updated_at: new Date().toISOString() }
          : seller
      ));
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Kunde inte ta bort ljudfil';
      toast({ title: "Fel", description: errorMsg, variant: "destructive" });
    } finally {
      setProgress(sellerId, 'audio', false);
    }
  };

  const handlePlayAudio = async (sellerId: string) => {
    const seller = sellers.find(s => s.id === sellerId);
    if (!seller?.sound_file_url) return;

    setPlayingAudio(sellerId);
    
    try {
      const versionedUrl = getVersionedUrl(seller.sound_file_url, seller.updated_at) || seller.sound_file_url;
      const audio = await createAudio(versionedUrl);
      
      audio.onended = () => setPlayingAudio(null);
      audio.onerror = () => {
        setPlayingAudio(null);
        toast({ 
          title: "Ljudfel", 
          description: "Kunde inte spela upp ljudfil", 
          variant: "destructive" 
        });
      };
      
      await audio.play();
      
    } catch (error) {
      setPlayingAudio(null);
      toast({ 
        title: "Ljudfel", 
        description: "Kunde inte spela upp ljudfil", 
        variant: "destructive" 
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
            <div className="flex-1 flex justify-end gap-2">
              <Button onClick={loadSellers} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-1" />
                Uppdatera
              </Button>
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
                    
                    {/* Profile Image Column */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {seller.profile_image_url ? (
                          <img
                            src={getVersionedUrl(seller.profile_image_url, seller.updated_at) || seller.profile_image_url}
                            alt={seller.name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <Users className="w-5 h-5 text-gray-500" />
                          </div>
                        )}
                        {uploadProgress[seller.id]?.image && (
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        )}
                      </div>
                    </TableCell>
                    
                    {/* Sound File Column */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {seller.sound_file_url ? (
                          <>
                            <Volume2 className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-green-600">Uppladdad</span>
                            <Button
                              onClick={() => handlePlayAudio(seller.id)}
                              disabled={playingAudio === seller.id}
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-xs"
                            >
                              {playingAudio === seller.id ? (
                                <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Play className="w-3 h-3" />
                              )}
                              {playingAudio === seller.id ? 'Spelar' : 'Spela'}
                            </Button>
                          </>
                        ) : (
                          <span className="text-sm text-gray-500">Ingen ljudfil</span>
                        )}
                        {uploadProgress[seller.id]?.audio && (
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        )}
                      </div>
                    </TableCell>
                    
                    {/* Actions Column */}
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {/* Image Upload */}
                        <input
                          type="file"
                          accept="image/*,.png,.jpg,.jpeg,.webp,.gif"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            console.log('🖼️ Admin: Image file selected:', {
                              file: file?.name,
                              type: file?.type,
                              size: file?.size,
                              sellerId: seller.id
                            });
                            if (file) {
                              handleProfileImageUpload(seller.id, file);
                            }
                            // Reset input so same file can be selected again
                            e.target.value = '';
                          }}
                          className="hidden"
                          id={`profile-${seller.id}`}
                          disabled={uploadProgress[seller.id]?.image}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById(`profile-${seller.id}`)?.click()}
                          disabled={uploadProgress[seller.id]?.image}
                        >
                          <Upload className="w-3 h-3 mr-1" />
                          Bild
                        </Button>
                        
                        {/* Image Delete */}
                        {seller.profile_image_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteProfileImage(seller.id)}
                            disabled={uploadProgress[seller.id]?.image}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                        
                        {/* Audio Upload */}
                        <input
                          type="file"
                          accept="audio/*,.mp3,.wav,.ogg"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            console.log('🎵 Admin: File selected for upload:', {
                              file: file?.name,
                              type: file?.type,
                              size: file?.size,
                              sellerId: seller.id
                            });
                            if (file) {
                              handleSoundFileUpload(seller.id, file);
                            } else {
                              console.log('❌ Admin: No file selected');
                            }
                            // Reset input so same file can be selected again
                            e.target.value = '';
                          }}
                          className="hidden"
                          id={`sound-${seller.id}`}
                          disabled={uploadProgress[seller.id]?.audio}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById(`sound-${seller.id}`)?.click()}
                          disabled={uploadProgress[seller.id]?.audio}
                        >
                          <Volume2 className="w-3 h-3 mr-1" />
                          Ljud
                        </Button>
                        
                        {/* Audio Delete */}
                        {seller.sound_file_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteSoundFile(seller.id)}
                            disabled={uploadProgress[seller.id]?.audio}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
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