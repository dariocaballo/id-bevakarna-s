import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, Upload, Volume2, Play, Trash2, Save, FileImage, FileAudio } from 'lucide-react';
import { validateImageFile, validateAudioFile, uploadToBucket, updateSellerMedia, getVersionedUrl, createAudio } from '@/utils/media';

interface Seller {
  id: string;
  name: string;
  profile_image_url?: string;
  sound_file_url?: string;
  updated_at?: string;
}

interface PendingChanges {
  [sellerId: string]: {
    profileImage?: File;
    soundFile?: File;
    hasChanges: boolean;
  };
}

interface SavingProgress {
  [sellerId: string]: boolean;
}

const Admin = () => {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [pendingChanges, setPendingChanges] = useState<PendingChanges>({});
  const [savingProgress, setSavingProgress] = useState<SavingProgress>({});
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

  const loadSellers = async (retryCount = 0): Promise<void> => {
    try {
      const { data, error } = await supabase.from('sellers').select('*').order('name');
      
      if (error) {
        // Retry with exponential backoff for connection issues
        if (retryCount < 3 && (error.code === 'PGRST002' || error.message?.includes('schema cache'))) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
          await new Promise(resolve => setTimeout(resolve, delay));
          return loadSellers(retryCount + 1);
        }
        throw error;
      }
      
      setSellers(data || []);
    } catch (error) {
      console.error('Error loading sellers:', error);
      toast({ 
        title: "Fel", 
        description: "Kunde inte ladda säljare. Försöker igen...", 
        variant: "destructive" 
      });
      
      // Keep trying in background if initial load fails
      if (retryCount === 0) {
        setTimeout(() => loadSellers(1), 2000);
      }
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      // Clear any localStorage drafts to ensure DB is source of truth
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('admin-draft-') || key.includes('pending-changes')) {
          localStorage.removeItem(key);
        }
      });

      loadSellers();
      
      // Set up real-time subscription for sellers
      const channel = supabase
        .channel('admin-sellers-realtime')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'sellers' },
          () => {
            console.log('✅ Seller updated, reloading...');
            loadSellers();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAuthenticated]);

  const setPendingChange = (sellerId: string, type: 'profileImage' | 'soundFile', file: File | undefined) => {
    setPendingChanges(prev => ({
      ...prev,
      [sellerId]: {
        ...prev[sellerId],
        [type]: file,
        hasChanges: Boolean(file || prev[sellerId]?.profileImage || prev[sellerId]?.soundFile)
      }
    }));
  };

  const clearPendingChanges = (sellerId: string) => {
    setPendingChanges(prev => {
      const newChanges = { ...prev };
      delete newChanges[sellerId];
      return newChanges;
    });
  };

  const handleProfileImageSelect = (sellerId: string, file: File) => {
    console.log(`🖼️ Admin: Profile image selected for ${sellerId}:`, {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    });

    // Validate file immediately
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast({ title: "Fel", description: validation.error, variant: "destructive" });
      return;
    }

    setPendingChange(sellerId, 'profileImage', file);
    toast({
      title: "Bild vald",
      description: `${file.name} redo att sparas. Klicka på "Spara" för att committa.`
    });
  };

  const handleSoundFileSelect = (sellerId: string, file: File) => {
    console.log(`🎵 Admin: Sound file selected for ${sellerId}:`, {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    });

    // Validate file immediately
    const validation = validateAudioFile(file);
    if (!validation.valid) {
      toast({ title: "Fel", description: validation.error, variant: "destructive" });
      return;
    }

    setPendingChange(sellerId, 'soundFile', file);
    toast({
      title: "Ljudfil vald",
      description: `${file.name} redo att sparas. Klicka på "Spara" för att committa.`
    });
  };

  const removeOldFiles = async (sellerId: string, currentImageUrl?: string, currentSoundUrl?: string) => {
    console.log(`🗑️ Removing old files for seller ${sellerId}`);
    
    try {
      // Remove old profile images
      if (currentImageUrl) {
        const url = new URL(currentImageUrl);
        const filename = url.pathname.split('/').pop()?.split('?')[0];
        if (filename && filename.startsWith(sellerId)) {
          await supabase.storage.from('seller-profiles').remove([filename]);
          console.log(`✅ Removed old profile image: ${filename}`);
        }
      }

      // Remove old sound files
      if (currentSoundUrl) {
        const url = new URL(currentSoundUrl);
        const filename = url.pathname.split('/').pop()?.split('?')[0];
        if (filename && filename.startsWith(sellerId)) {
          await supabase.storage.from('seller-sounds').remove([filename]);
          console.log(`✅ Removed old sound file: ${filename}`);
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to remove some old files:', error);
      // Don't throw - this is cleanup, not critical
    }
  };

  const handleSave = async (sellerId: string) => {
    const changes = pendingChanges[sellerId];
    if (!changes?.hasChanges) return;

    const seller = sellers.find(s => s.id === sellerId);
    if (!seller) return;

    setSavingProgress(prev => ({ ...prev, [sellerId]: true }));
    console.log(`💾 Starting save process for seller ${sellerId}`);

    try {
      const updates: { profile_image_url?: string; sound_file_url?: string } = {};
      let newImageUrl = seller.profile_image_url;
      let newSoundUrl = seller.sound_file_url;

        // Upload profile image if selected
        if (changes.profileImage) {
          console.log('📤 Uploading profile image...');
          toast({
            title: "Sparar...",
            description: `Laddar upp profilbild för ${seller.name}...`
          });

          const uploadResult = await uploadToBucket('seller-profiles', changes.profileImage, sellerId);
          if (uploadResult.error) {
            throw new Error(`Profilbild: ${uploadResult.error}`);
          }

          // Don't add timestamp here - let DB updated_at handle cache busting
          newImageUrl = uploadResult.publicUrl;
          updates.profile_image_url = newImageUrl;
          console.log('✅ Profile image uploaded:', newImageUrl);
        }

        // Upload sound file if selected
        if (changes.soundFile) {
          console.log('📤 Uploading sound file...');
          toast({
            title: "Sparar...",
            description: `Laddar upp ljudfil för ${seller.name}...`
          });

          const uploadResult = await uploadToBucket('seller-sounds', changes.soundFile, sellerId);
          if (uploadResult.error) {
            throw new Error(`Ljudfil: ${uploadResult.error}`);
          }

          // Don't add timestamp here - let DB updated_at handle cache busting
          newSoundUrl = uploadResult.publicUrl;
          updates.sound_file_url = newSoundUrl;
          console.log('✅ Sound file uploaded:', newSoundUrl);
        }

      // Update database atomically
      console.log('💾 Updating database...');
      const updateResult = await updateSellerMedia(sellerId, updates);
      if (updateResult.error) {
        throw new Error(`Databas: ${updateResult.error}`);
      }

      const updatedSeller = updateResult.data;

      // Remove old files after successful save
      if (Object.keys(updates).length > 0) {
        await removeOldFiles(
          sellerId, 
          changes.profileImage ? seller.profile_image_url : undefined,
          changes.soundFile ? seller.sound_file_url : undefined
        );
      }

        // Success
        console.log('✅ Save completed successfully');
        toast({
          title: "Sparat!",
          description: `Ändringar för ${seller.name} har sparats permanent. Uppdateras live inom 1-2 sekunder.`
        });

        // Clear pending changes immediately
        clearPendingChanges(sellerId);

        // Update local state with DB values for instant feedback
        if (updatedSeller) {
          setSellers(prev => prev.map(s => 
            s.id === sellerId ? updatedSeller : s
          ));
        }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Okänt fel';
      console.error('❌ Save failed:', errorMsg);
      toast({
        title: "Fel vid sparande",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setSavingProgress(prev => ({ ...prev, [sellerId]: false }));
    }
  };

  const handleDeleteProfileImage = async (sellerId: string) => {
    const seller = sellers.find(s => s.id === sellerId);
    if (!seller?.profile_image_url) return;

    setSavingProgress(prev => ({ ...prev, [sellerId]: true }));
    
    try {
      await removeOldFiles(sellerId, seller.profile_image_url, undefined);
      
      const updateResult = await updateSellerMedia(sellerId, {
        profile_image_url: null
      });
      if (updateResult.error) {
        throw new Error(updateResult.error);
      }

      const updatedSeller = updateResult.data;

      toast({ title: "Borttagen", description: "Profilbild har tagits bort" });
      
      // Update with DB values
      if (updatedSeller) {
        setSellers(prev => prev.map(seller => 
          seller.id === sellerId ? updatedSeller : seller
        ));
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Kunde inte ta bort profilbild';
      toast({ title: "Fel", description: errorMsg, variant: "destructive" });
    } finally {
      setSavingProgress(prev => ({ ...prev, [sellerId]: false }));
    }
  };

  const handleDeleteSoundFile = async (sellerId: string) => {
    const seller = sellers.find(s => s.id === sellerId);
    if (!seller?.sound_file_url) return;

    setSavingProgress(prev => ({ ...prev, [sellerId]: true }));
    
    try {
      await removeOldFiles(sellerId, undefined, seller.sound_file_url);
      
      const updateResult = await updateSellerMedia(sellerId, {
        sound_file_url: null
      });
      if (updateResult.error) {
        throw new Error(updateResult.error);
      }

      const updatedSeller = updateResult.data;

      toast({ title: "Borttagen", description: "Ljudfil har tagits bort" });
      
      // Update with DB values
      if (updatedSeller) {
        setSellers(prev => prev.map(seller => 
          seller.id === sellerId ? updatedSeller : seller
        ));
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Kunde inte ta bort ljudfil';
      toast({ title: "Fel", description: errorMsg, variant: "destructive" });
    } finally {
      setSavingProgress(prev => ({ ...prev, [sellerId]: false }));
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
                  <TableHead>Spara</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sellers.map((seller) => {
                  const changes = pendingChanges[seller.id];
                  const hasChanges = changes?.hasChanges || false;
                  const isSaving = savingProgress[seller.id] || false;

                  return (
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
                          {changes?.profileImage && (
                            <div className="flex items-center gap-1 text-xs text-orange-600">
                              <FileImage className="w-3 h-3" />
                              <span>Ny</span>
                            </div>
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
                                disabled={playingAudio === seller.id || isSaving}
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
                          {changes?.soundFile && (
                            <div className="flex items-center gap-1 text-xs text-orange-600">
                              <FileAudio className="w-3 h-3" />
                              <span>Ny</span>
                            </div>
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
                              if (file) {
                                handleProfileImageSelect(seller.id, file);
                              }
                              e.target.value = '';
                            }}
                            className="hidden"
                            id={`profile-${seller.id}`}
                            disabled={isSaving}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById(`profile-${seller.id}`)?.click()}
                            disabled={isSaving}
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
                              disabled={isSaving}
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
                              if (file) {
                                handleSoundFileSelect(seller.id, file);
                              }
                              e.target.value = '';
                            }}
                            className="hidden"
                            id={`sound-${seller.id}`}
                            disabled={isSaving}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById(`sound-${seller.id}`)?.click()}
                            disabled={isSaving}
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
                              disabled={isSaving}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>

                      {/* Save Button Column */}
                      <TableCell>
                        <Button
                          onClick={() => handleSave(seller.id)}
                          disabled={!hasChanges || isSaving}
                          size="sm"
                          className={`${hasChanges ? 'bg-green-600 hover:bg-green-700' : ''}`}
                          variant={hasChanges ? 'default' : 'outline'}
                        >
                          {isSaving ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                          ) : (
                            <Save className="w-3 h-3 mr-1" />
                          )}
                          {isSaving ? 'Sparar...' : 'Spara'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;