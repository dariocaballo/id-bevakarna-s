import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Move, 
  Eye, 
  EyeOff, 
  Trash2, 
  Plus, 
  Palette, 
  Settings, 
  Save,
  Image,
  Type,
  Video
} from 'lucide-react';

// Component types
const COMPONENT_TYPES = {
  stats_cards: { name: 'Statistikkort', icon: '📊', color: 'bg-blue-100' },
  latest_sale: { name: 'Senaste försäljning', icon: '⭐', color: 'bg-yellow-100' },
  seller_circles: { name: 'Säljare cirklar', icon: '👥', color: 'bg-green-100' },
  king_queen: { name: 'Dagens Kung/Drottning', icon: '👑', color: 'bg-purple-100' },
  daily_challenges: { name: 'Dagliga utmaningar', icon: '🎯', color: 'bg-red-100' },
  top_sellers: { name: 'Topplista', icon: '🏆', color: 'bg-orange-100' },
  custom_text: { name: 'Egen text', icon: '📝', color: 'bg-gray-100' },
  custom_image: { name: 'Egen bild', icon: '🖼️', color: 'bg-pink-100' },
  custom_video: { name: 'Video/GIF', icon: '🎬', color: 'bg-indigo-100' }
};

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
  layout_config: any;
  theme_config: any;
  created_at?: string;
  updated_at?: string;
  custom_elements?: any;
}

// Sortable Item Component
function SortableItem({ 
  component, 
  onToggleVisibility, 
  onRemove, 
  onEdit 
}: { 
  component: LayoutComponent;
  onToggleVisibility: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: (component: LayoutComponent) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: component.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const componentType = COMPONENT_TYPES[component.type as keyof typeof COMPONENT_TYPES];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-4 border rounded-lg shadow-sm ${componentType?.color || 'bg-gray-100'} ${
        component.visible ? 'opacity-100' : 'opacity-50'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-move p-1 hover:bg-white/50 rounded"
        >
          <Move className="h-4 w-4 text-gray-500" />
        </div>
        <span className="text-lg">{componentType?.icon || '📦'}</span>
        <div>
          <span className="font-medium text-sm">{componentType?.name || 'Okänd komponent'}</span>
          <div className="text-xs text-gray-500">
            Storlek: {component.size} | Ordning: {component.order}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Select value={component.size} onValueChange={(value) => onEdit({ ...component, size: value as any })}>
          <SelectTrigger className="w-20 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="small">Liten</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="large">Stor</SelectItem>
            <SelectItem value="full">Full</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onEdit(component)}
          className="p-1"
        >
          <Settings className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onToggleVisibility(component.id)}
          className="p-1"
        >
          {component.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onRemove(component.id)}
          className="p-1 text-red-500 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Component Palette
function ComponentPalette({ onAddComponent }: { onAddComponent: (type: string) => void }) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold flex items-center gap-2">
        <Plus className="h-4 w-4" />
        Tillgängliga komponenter
      </h3>
      <div className="grid grid-cols-1 gap-2">
        {Object.entries(COMPONENT_TYPES).map(([type, config]) => (
          <Button
            key={type}
            variant="outline"
            className={`justify-start h-auto p-3 ${config.color}`}
            onClick={() => onAddComponent(type)}
          >
            <span className="text-lg mr-2">{config.icon}</span>
            <span className="text-sm">{config.name}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

// Custom Component Editor
function CustomComponentEditor({ 
  component, 
  onSave, 
  onClose 
}: { 
  component: LayoutComponent | null;
  onSave: (component: LayoutComponent) => void;
  onClose: () => void;
}) {
  const [editedComponent, setEditedComponent] = useState<LayoutComponent | null>(component);

  useEffect(() => {
    setEditedComponent(component);
  }, [component]);

  if (!editedComponent) return null;

  const handleSave = () => {
    if (editedComponent) {
      onSave(editedComponent);
      onClose();
    }
  };

  const updateCustomData = (key: string, value: any) => {
    setEditedComponent(prev => prev ? {
      ...prev,
      customData: { ...prev.customData, [key]: value }
    } : null);
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-lg">
          Redigera: {COMPONENT_TYPES[editedComponent.type as keyof typeof COMPONENT_TYPES]?.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {editedComponent.type === 'custom_text' && (
          <>
            <div>
              <Label>Titel</Label>
              <Input
                value={editedComponent.customData?.title || ''}
                onChange={(e) => updateCustomData('title', e.target.value)}
                placeholder="Ange titel"
              />
            </div>
            <div>
              <Label>Text</Label>
              <Textarea
                value={editedComponent.customData?.text || ''}
                onChange={(e) => updateCustomData('text', e.target.value)}
                placeholder="Skriv din text här"
                rows={4}
              />
            </div>
            <div>
              <Label>Textfärg</Label>
              <Input
                type="color"
                value={editedComponent.customData?.textColor || '#000000'}
                onChange={(e) => updateCustomData('textColor', e.target.value)}
              />
            </div>
          </>
        )}
        
        {editedComponent.type === 'custom_image' && (
          <>
            <div>
              <Label>Titel</Label>
              <Input
                value={editedComponent.customData?.title || ''}
                onChange={(e) => updateCustomData('title', e.target.value)}
                placeholder="Ange titel"
              />
            </div>
            <div>
              <Label>Bild-URL</Label>
              <Input
                value={editedComponent.customData?.imageUrl || ''}
                onChange={(e) => updateCustomData('imageUrl', e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </>
        )}
        
        {editedComponent.type === 'custom_video' && (
          <>
            <div>
              <Label>Titel</Label>
              <Input
                value={editedComponent.customData?.title || ''}
                onChange={(e) => updateCustomData('title', e.target.value)}
                placeholder="Ange titel"
              />
            </div>
            <div>
              <Label>Video/GIF-URL</Label>
              <Input
                value={editedComponent.customData?.videoUrl || ''}
                onChange={(e) => updateCustomData('videoUrl', e.target.value)}
                placeholder="https://example.com/video.mp4"
              />
            </div>
          </>
        )}

        <div>
          <Label>Bakgrundsfärg</Label>
          <Input
            type="color"
            value={editedComponent.customData?.backgroundColor || '#ffffff'}
            onChange={(e) => updateCustomData('backgroundColor', e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Spara
          </Button>
          <Button variant="outline" onClick={onClose}>
            Avbryt
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Main Layout Editor Component
export function LayoutEditor() {
  const { toast } = useToast();
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [activeLayout, setActiveLayout] = useState<Layout | null>(null);
  const [editingComponent, setEditingComponent] = useState<LayoutComponent | null>(null);
  const [newLayoutName, setNewLayoutName] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadLayouts();
  }, []);

  const loadLayouts = async () => {
    try {
      const { data, error } = await supabase
        .from('dashboard_layouts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const typedLayouts = (data || []).map(layout => ({
        ...layout,
        layout_config: layout.layout_config || { components: [] },
        theme_config: layout.theme_config || {}
      })) as Layout[];

      setLayouts(typedLayouts);
      const active = typedLayouts.find(layout => layout.is_active);
      if (active) setActiveLayout(active);
    } catch (error) {
      console.error('Error loading layouts:', error);
      toast({
        title: "Fel",
        description: "Kunde inte ladda layouts",
        variant: "destructive"
      });
    }
  };

  const saveLayout = async (layout: Layout) => {
    try {
      const { error } = await supabase
        .from('dashboard_layouts')
        .update({
          layout_config: JSON.parse(JSON.stringify(layout.layout_config)),
          theme_config: JSON.parse(JSON.stringify(layout.theme_config))
        })
        .eq('id', layout.id);

      if (error) throw error;

      toast({
        title: "Sparad",
        description: "Layout sparad!"
      });

      await loadLayouts();
    } catch (error) {
      console.error('Error saving layout:', error);
      toast({
        title: "Fel",
        description: "Kunde inte spara layout",
        variant: "destructive"
      });
    }
  };

  const createNewLayout = async () => {
    if (!newLayoutName.trim()) {
      toast({
        title: "Fel",
        description: "Ange ett namn för layouten",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('dashboard_layouts')
        .insert([{
          layout_name: newLayoutName,
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

      if (error) throw error;

      setNewLayoutName('');
      toast({
        title: "Skapad",
        description: "Ny layout skapad!"
      });

      await loadLayouts();
    } catch (error) {
      console.error('Error creating layout:', error);
      toast({
        title: "Fel",
        description: "Kunde inte skapa layout",
        variant: "destructive"
      });
    }
  };

  const setActiveLayoutById = async (layoutId: string) => {
    try {
      // Deactivate all layouts
      await supabase
        .from('dashboard_layouts')
        .update({ is_active: false })
        .neq('id', '');

      // Activate selected layout
      const { error } = await supabase
        .from('dashboard_layouts')
        .update({ is_active: true })
        .eq('id', layoutId);

      if (error) throw error;

      toast({
        title: "Aktiverad",
        description: "Layout aktiverad!"
      });

      await loadLayouts();
    } catch (error) {
      console.error('Error setting active layout:', error);
      toast({
        title: "Fel",
        description: "Kunde inte aktivera layout",
        variant: "destructive"
      });
    }
  };

  const addComponent = (type: string) => {
    if (!activeLayout) return;

    const newComponent: LayoutComponent = {
      id: `${type}_${Date.now()}`,
      type,
      order: activeLayout.layout_config.components.length + 1,
      visible: true,
      size: 'full',
      customData: type.startsWith('custom_') ? {
        title: `Ny ${COMPONENT_TYPES[type as keyof typeof COMPONENT_TYPES]?.name || 'komponent'}`,
        text: type === 'custom_text' ? 'Din text här...' : undefined,
        backgroundColor: '#ffffff',
        textColor: '#000000'
      } : undefined
    };

    const updatedLayout = {
      ...activeLayout,
      layout_config: {
        components: [...activeLayout.layout_config.components, newComponent]
      }
    };

    setActiveLayout(updatedLayout);
    saveLayout(updatedLayout);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (!activeLayout) return;

    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = activeLayout.layout_config.components.findIndex(
        (item) => item.id === active.id
      );
      const newIndex = activeLayout.layout_config.components.findIndex(
        (item) => item.id === over?.id
      );

      const reorderedComponents = arrayMove(
        activeLayout.layout_config.components,
        oldIndex,
        newIndex
      ).map((component: any, index: number) => ({ ...component, order: index + 1 }));

      const updatedLayout = {
        ...activeLayout,
        layout_config: { components: reorderedComponents }
      };

      setActiveLayout(updatedLayout);
      saveLayout(updatedLayout);
    }
  };

  const toggleComponentVisibility = (componentId: string) => {
    if (!activeLayout) return;

    const updatedComponents = activeLayout.layout_config.components.map(comp =>
      comp.id === componentId ? { ...comp, visible: !comp.visible } : comp
    );

    const updatedLayout = {
      ...activeLayout,
      layout_config: { components: updatedComponents }
    };

    setActiveLayout(updatedLayout);
    saveLayout(updatedLayout);
  };

  const removeComponent = (componentId: string) => {
    if (!activeLayout) return;

    const updatedComponents = activeLayout.layout_config.components
      .filter(comp => comp.id !== componentId)
      .map((comp, index) => ({ ...comp, order: index + 1 }));

    const updatedLayout = {
      ...activeLayout,
      layout_config: { components: updatedComponents }
    };

    setActiveLayout(updatedLayout);
    saveLayout(updatedLayout);
  };

  const editComponent = (component: LayoutComponent) => {
    if (component.type.startsWith('custom_')) {
      setEditingComponent(component);
    } else {
      // For built-in components, just update the size
      const updatedComponents = activeLayout!.layout_config.components.map(comp =>
        comp.id === component.id ? component : comp
      );

      const updatedLayout = {
        ...activeLayout!,
        layout_config: { components: updatedComponents }
      };

      setActiveLayout(updatedLayout);
      saveLayout(updatedLayout);
    }
  };

  const saveEditedComponent = (component: LayoutComponent) => {
    if (!activeLayout) return;

    const updatedComponents = activeLayout.layout_config.components.map(comp =>
      comp.id === component.id ? component : comp
    );

    const updatedLayout = {
      ...activeLayout,
      layout_config: { components: updatedComponents }
    };

    setActiveLayout(updatedLayout);
    saveLayout(updatedLayout);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Dashboard Layout Editor
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Skapa och anpassa din dashboard layout med drag-and-drop funktionalitet.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Layout Management */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50">
            <div>
              <h3 className="font-semibold">Aktiv Layout</h3>
              <p className="text-sm text-muted-foreground">
                {activeLayout?.layout_name || 'Ingen layout vald'}
              </p>
            </div>
            <div className="flex gap-2">
              <Select
                value={activeLayout?.id || ''}
                onValueChange={setActiveLayoutById}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Välj layout" />
                </SelectTrigger>
                <SelectContent>
                  {layouts.map((layout) => (
                    <SelectItem key={layout.id} value={layout.id}>
                      {layout.layout_name} {layout.is_active ? '(Aktiv)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => window.open('/', '_blank')}>
                <Eye className="h-4 w-4 mr-2" />
                Förhandsgranska
              </Button>
            </div>
          </div>

          {/* Create New Layout */}
          <div className="flex gap-2">
            <Input
              placeholder="Namn på ny layout"
              value={newLayoutName}
              onChange={(e) => setNewLayoutName(e.target.value)}
            />
            <Button onClick={createNewLayout}>
              <Plus className="h-4 w-4 mr-2" />
              Skapa Layout
            </Button>
          </div>

          {/* Custom Component Editor */}
          {editingComponent && (
            <CustomComponentEditor
              component={editingComponent}
              onSave={saveEditedComponent}
              onClose={() => setEditingComponent(null)}
            />
          )}

          {/* Main Editor */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Component Palette */}
            <div className="lg:col-span-1">
              <ComponentPalette onAddComponent={addComponent} />
            </div>

            {/* Layout Canvas */}
            <div className="lg:col-span-3">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Move className="h-4 w-4" />
                Dashboard Layout ({activeLayout?.layout_config.components.length || 0} komponenter)
              </h3>
              
              {!activeLayout ? (
                <div className="min-h-96 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">
                  <p>Välj eller skapa en layout för att börja designa</p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={activeLayout.layout_config.components.map(c => c.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="min-h-96 border-2 border-dashed border-gray-300 rounded-lg p-4 space-y-3">
                      {activeLayout.layout_config.components.length === 0 ? (
                        <div className="text-center text-gray-500 py-12">
                          <p>Lägg till komponenter från paletten till vänster</p>
                        </div>
                      ) : (
                        activeLayout.layout_config.components
                          .sort((a, b) => a.order - b.order)
                          .map((component) => (
                            <SortableItem
                              key={component.id}
                              component={component}
                              onToggleVisibility={toggleComponentVisibility}
                              onRemove={removeComponent}
                              onEdit={editComponent}
                            />
                          ))
                      )}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}