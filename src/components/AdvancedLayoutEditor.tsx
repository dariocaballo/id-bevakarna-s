import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  rectIntersection,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Video,
  BarChart3,
  Trophy,
  Target,
  Crown,
  Star,
  Users,
  Layout,
  Maximize2,
  Copy,
  RefreshCw,
  Monitor,
  Smartphone,
  Tablet,
  Grid,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Download,
  Upload
} from 'lucide-react';
import { DynamicDashboard } from '@/components/DynamicDashboard';

// Enhanced component types with categories
const COMPONENT_CATEGORIES = {
  'dashboard': {
    name: 'Dashboard Komponenter',
    components: {
      stats_cards: { name: 'Statistikkort', icon: BarChart3, color: 'bg-blue-100', description: 'Dagens & månadens försäljning' },
      latest_sale: { name: 'Senaste försäljning', icon: Star, color: 'bg-yellow-100', description: 'Visar den senaste försäljningen' },
      seller_circles: { name: 'Säljare cirklar', icon: Users, color: 'bg-green-100', description: 'Dagens försäljning per säljare' },
      king_queen: { name: 'Dagens Kung/Drottning', icon: Crown, color: 'bg-purple-100', description: 'Bästa säljaren idag' },
      daily_challenges: { name: 'Dagliga utmaningar', icon: Target, color: 'bg-red-100', description: 'Aktiva utmaningar' },
      top_sellers: { name: 'Topplista', icon: Trophy, color: 'bg-orange-100', description: 'Månadens bästa säljare' },
    }
  },
  'content': {
    name: 'Innehåll',
    components: {
      custom_text: { name: 'Textblock', icon: Type, color: 'bg-gray-100', description: 'Egen text med formatering' },
      custom_image: { name: 'Bild', icon: Image, color: 'bg-pink-100', description: 'Egen bild eller logotyp' },
      custom_video: { name: 'Video/GIF', icon: Video, color: 'bg-indigo-100', description: 'Video eller animerad GIF' },
    }
  },
  'layout': {
    name: 'Layout',
    components: {
      spacer: { name: 'Mellanrum', icon: Layout, color: 'bg-slate-100', description: 'Tomt utrymme för layout' },
      divider: { name: 'Avdelare', icon: Layout, color: 'bg-slate-200', description: 'Visuell avdelare' },
    }
  }
};

interface LayoutComponent {
  id: string;
  type: string;
  order: number;
  visible: boolean;
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  width: number; // percentage 0-100
  height: number; // pixels
  position: {
    x: number; // grid column
    y: number; // grid row
  };
  styling: {
    backgroundColor?: string;
    textColor?: string;
    borderRadius?: number;
    padding?: number;
    margin?: number;
    borderWidth?: number;
    borderColor?: string;
    shadow?: string;
    animation?: string;
  };
  customData?: {
    text?: string;
    title?: string;
    imageUrl?: string;
    videoUrl?: string;
    fontSize?: number;
    fontWeight?: string;
    textAlign?: string;
    showBorder?: boolean;
    autoplay?: boolean;
    loop?: boolean;
  };
}

interface Layout {
  id: string;
  layout_name: string;
  is_active: boolean;
  layout_config: {
    components: LayoutComponent[];
    gridColumns: number;
    gridRows: number;
    globalTheme: any;
  };
  theme_config: any;
  created_at?: string;
  updated_at?: string;
  custom_elements?: any;
}

// Draggable Component in Preview
function DraggableComponent({ 
  component, 
  isPreview, 
  onSelect,
  isSelected,
  salesData,
  sellers,
  challenges,
  settings 
}: { 
  component: LayoutComponent;
  isPreview: boolean;
  onSelect?: (component: LayoutComponent) => void;
  isSelected?: boolean;
  salesData?: any;
  sellers?: any[];
  challenges?: any[];
  settings?: any;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: component.id,
    disabled: !isPreview 
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    width: `${component.width}%`,
    minHeight: `${component.height}px`,
    backgroundColor: component.styling?.backgroundColor,
    color: component.styling?.textColor,
    borderRadius: `${component.styling?.borderRadius || 8}px`,
    padding: `${component.styling?.padding || 16}px`,
    margin: `${component.styling?.margin || 8}px`,
    border: component.styling?.borderWidth ? 
      `${component.styling.borderWidth}px solid ${component.styling.borderColor || '#e2e8f0'}` : 
      'none',
    boxShadow: component.styling?.shadow || '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  };

  const renderComponent = () => {
    if (!component.visible && isPreview) return null;

    switch (component.type) {
      case 'stats_cards':
        return salesData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-card rounded-lg border">
              <h3 className="text-lg font-semibold mb-2">Dagens försäljning</h3>
              <p className="text-2xl font-bold text-primary">{salesData.totalToday || 0} tb</p>
            </div>
            <div className="p-4 bg-card rounded-lg border">
              <h3 className="text-lg font-semibold mb-2">Månadens försäljning</h3>
              <p className="text-2xl font-bold text-primary">{salesData.totalMonth || 0} tb</p>
            </div>
          </div>
        );
      
      case 'latest_sale':
        return salesData?.lastSale && (
          <div className="p-4 bg-card rounded-lg border">
            <h3 className="text-lg font-semibold mb-2">Senaste försäljning</h3>
            <p className="text-xl font-bold">{salesData.lastSale.seller_name}</p>
            <p className="text-lg text-muted-foreground">{salesData.lastSale.amount} tb</p>
          </div>
        );
      
      case 'custom_text':
        return (
          <div 
            style={{ 
              fontSize: `${component.customData?.fontSize || 16}px`,
              fontWeight: component.customData?.fontWeight || 'normal',
              textAlign: component.customData?.textAlign as any || 'left'
            }}
          >
            {component.customData?.title && (
              <h3 className="text-xl font-bold mb-2">{component.customData.title}</h3>
            )}
            {component.customData?.text && (
              <div dangerouslySetInnerHTML={{ __html: component.customData.text.replace(/\n/g, '<br>') }} />
            )}
          </div>
        );
      
      case 'custom_image':
        return (
          <div>
            {component.customData?.title && (
              <h3 className="text-xl font-bold mb-2">{component.customData.title}</h3>
            )}
            {component.customData?.imageUrl && (
              <img 
                src={component.customData.imageUrl} 
                alt={component.customData.title || 'Custom image'}
                className="w-full h-auto rounded-lg"
                style={{ border: component.customData?.showBorder ? '2px solid #e2e8f0' : 'none' }}
              />
            )}
          </div>
        );
      
      case 'custom_video':
        return (
          <div>
            {component.customData?.title && (
              <h3 className="text-xl font-bold mb-2">{component.customData.title}</h3>
            )}
            {component.customData?.videoUrl && (
              <video 
                src={component.customData.videoUrl} 
                controls
                className="w-full h-auto rounded-lg"
                autoPlay={component.customData?.autoplay}
                loop={component.customData?.loop}
                muted
              />
            )}
          </div>
        );
      
      case 'spacer':
        return <div className="w-full" style={{ minHeight: `${component.height}px` }} />;
      
      case 'divider':
        return <div className="w-full border-t-2 border-border" />;
      
      default:
        // For dashboard components, render placeholder in editor
        const componentInfo = Object.values(COMPONENT_CATEGORIES)
          .flatMap(cat => Object.entries(cat.components))
          .find(([key]) => key === component.type)?.[1];
        
        return (
          <div className="p-4 bg-card rounded-lg border-2 border-dashed border-muted-foreground/30">
            <div className="flex items-center gap-2 mb-2">
              {componentInfo?.icon && <componentInfo.icon className="w-5 h-5" />}
              <span className="font-semibold">{componentInfo?.name || component.type}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {componentInfo?.description || 'Dashboard komponent'}
            </p>
          </div>
        );
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative group cursor-pointer transition-all duration-200 ${
        isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
      } ${!component.visible ? 'opacity-50' : ''}`}
      onClick={() => onSelect?.(component)}
    >
      {renderComponent()}
      
      {isPreview && (
        <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center">
          <Badge variant="secondary" className="bg-background/90">
            {COMPONENT_CATEGORIES.dashboard?.components[component.type as keyof typeof COMPONENT_CATEGORIES.dashboard.components]?.name ||
             COMPONENT_CATEGORIES.content?.components[component.type as keyof typeof COMPONENT_CATEGORIES.content.components]?.name ||
             COMPONENT_CATEGORIES.layout?.components[component.type as keyof typeof COMPONENT_CATEGORIES.layout.components]?.name ||
             component.type}
          </Badge>
        </div>
      )}
    </div>
  );
}

// Component palette for adding new components
function ComponentPalette({ onAddComponent }: { onAddComponent: (type: string) => void }) {
  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-4">
        {Object.entries(COMPONENT_CATEGORIES).map(([categoryKey, category]) => (
          <div key={categoryKey}>
            <h4 className="font-semibold text-sm text-muted-foreground mb-2">{category.name}</h4>
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(category.components).map(([type, config]) => (
                <Button
                  key={type}
                  variant="outline"
                  className={`justify-start h-auto p-3 ${config.color} hover:bg-primary/10`}
                  onClick={() => onAddComponent(type)}
                >
                  <config.icon className="w-4 h-4 mr-2" />
                  <div className="text-left">
                    <div className="text-sm font-medium">{config.name}</div>
                    <div className="text-xs text-muted-foreground">{config.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

// Component editor for selected component
function ComponentEditor({ 
  component, 
  onUpdate,
  onDelete 
}: { 
  component: LayoutComponent | null;
  onUpdate: (component: LayoutComponent) => void;
  onDelete: (id: string) => void;
}) {
  if (!component) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>Välj en komponent för att redigera</p>
      </div>
    );
  }

  const updateComponent = (updates: Partial<LayoutComponent>) => {
    onUpdate({ ...component, ...updates });
  };

  const updateStyling = (styleProp: string, value: any) => {
    updateComponent({
      styling: { ...component.styling, [styleProp]: value }
    });
  };

  const updateCustomData = (key: string, value: any) => {
    updateComponent({
      customData: { ...component.customData, [key]: value }
    });
  };

  const componentInfo = Object.values(COMPONENT_CATEGORIES)
    .flatMap(cat => Object.entries(cat.components))
    .find(([key]) => key === component.type)?.[1];

  return (
    <ScrollArea className="h-[600px]">
      <div className="space-y-6 p-1">
        {/* Component Info */}
        <div className="flex items-center gap-3 pb-3 border-b">
          {componentInfo?.icon && <componentInfo.icon className="w-5 h-5" />}
          <div>
            <h3 className="font-semibold">{componentInfo?.name || component.type}</h3>
            <p className="text-sm text-muted-foreground">{componentInfo?.description}</p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(component.id)}
            className="ml-auto"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        <Tabs defaultValue="layout" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="layout">Layout</TabsTrigger>
            <TabsTrigger value="styling">Stil</TabsTrigger>
            <TabsTrigger value="content">Innehåll</TabsTrigger>
          </TabsList>

          <TabsContent value="layout" className="space-y-4">
            {/* Visibility */}
            <div className="flex items-center justify-between">
              <Label>Synlig</Label>
              <Switch
                checked={component.visible}
                onCheckedChange={(visible) => updateComponent({ visible })}
              />
            </div>

            {/* Size */}
            <div>
              <Label>Storlek</Label>
              <Select 
                value={component.size} 
                onValueChange={(size: any) => updateComponent({ size })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xs">Extra liten</SelectItem>
                  <SelectItem value="sm">Liten</SelectItem>
                  <SelectItem value="md">Medium</SelectItem>
                  <SelectItem value="lg">Stor</SelectItem>
                  <SelectItem value="xl">Extra stor</SelectItem>
                  <SelectItem value="full">Full bredd</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Width */}
            <div>
              <Label>Bredd (%)</Label>
              <Slider
                value={[component.width]}
                onValueChange={([width]) => updateComponent({ width })}
                max={100}
                min={10}
                step={5}
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-1">{component.width}%</p>
            </div>

            {/* Height */}
            <div>
              <Label>Höjd (px)</Label>
              <Slider
                value={[component.height]}
                onValueChange={([height]) => updateComponent({ height })}
                max={800}
                min={50}
                step={10}
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-1">{component.height}px</p>
            </div>
          </TabsContent>

          <TabsContent value="styling" className="space-y-4">
            {/* Background Color */}
            <div>
              <Label>Bakgrundsfärg</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  type="color"
                  value={component.styling?.backgroundColor || '#ffffff'}
                  onChange={(e) => updateStyling('backgroundColor', e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  value={component.styling?.backgroundColor || '#ffffff'}
                  onChange={(e) => updateStyling('backgroundColor', e.target.value)}
                  placeholder="#ffffff"
                />
              </div>
            </div>

            {/* Text Color */}
            <div>
              <Label>Textfärg</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  type="color"
                  value={component.styling?.textColor || '#000000'}
                  onChange={(e) => updateStyling('textColor', e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  value={component.styling?.textColor || '#000000'}
                  onChange={(e) => updateStyling('textColor', e.target.value)}
                  placeholder="#000000"
                />
              </div>
            </div>

            {/* Border Radius */}
            <div>
              <Label>Rundade hörn</Label>
              <Slider
                value={[component.styling?.borderRadius || 8]}
                onValueChange={([borderRadius]) => updateStyling('borderRadius', borderRadius)}
                max={50}
                min={0}
                step={2}
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-1">{component.styling?.borderRadius || 8}px</p>
            </div>

            {/* Padding */}
            <div>
              <Label>Inre marginal</Label>
              <Slider
                value={[component.styling?.padding || 16]}
                onValueChange={([padding]) => updateStyling('padding', padding)}
                max={100}
                min={0}
                step={4}
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-1">{component.styling?.padding || 16}px</p>
            </div>

            {/* Margin */}
            <div>
              <Label>Yttre marginal</Label>
              <Slider
                value={[component.styling?.margin || 8]}
                onValueChange={([margin]) => updateStyling('margin', margin)}
                max={50}
                min={0}
                step={2}
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-1">{component.styling?.margin || 8}px</p>
            </div>

            {/* Border */}
            <div>
              <Label>Kantlinje bredd</Label>
              <Slider
                value={[component.styling?.borderWidth || 0]}
                onValueChange={([borderWidth]) => updateStyling('borderWidth', borderWidth)}
                max={10}
                min={0}
                step={1}
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-1">{component.styling?.borderWidth || 0}px</p>
            </div>

            {component.styling?.borderWidth && component.styling.borderWidth > 0 && (
              <div>
                <Label>Kantlinjefärg</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    type="color"
                    value={component.styling?.borderColor || '#e2e8f0'}
                    onChange={(e) => updateStyling('borderColor', e.target.value)}
                    className="w-16 h-10"
                  />
                  <Input
                    value={component.styling?.borderColor || '#e2e8f0'}
                    onChange={(e) => updateStyling('borderColor', e.target.value)}
                    placeholder="#e2e8f0"
                  />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            {/* Content specific editors */}
            {component.type === 'custom_text' && (
              <>
                <div>
                  <Label>Titel</Label>
                  <Input
                    value={component.customData?.title || ''}
                    onChange={(e) => updateCustomData('title', e.target.value)}
                    placeholder="Ange titel"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Text</Label>
                  <Textarea
                    value={component.customData?.text || ''}
                    onChange={(e) => updateCustomData('text', e.target.value)}
                    placeholder="Skriv din text här"
                    rows={6}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Textstorlek</Label>
                  <Slider
                    value={[component.customData?.fontSize || 16]}
                    onValueChange={([fontSize]) => updateCustomData('fontSize', fontSize)}
                    max={48}
                    min={10}
                    step={2}
                    className="mt-2"
                  />
                  <p className="text-sm text-muted-foreground mt-1">{component.customData?.fontSize || 16}px</p>
                </div>
                <div>
                  <Label>Textjustering</Label>
                  <Select 
                    value={component.customData?.textAlign || 'left'} 
                    onValueChange={(textAlign) => updateCustomData('textAlign', textAlign)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Vänster</SelectItem>
                      <SelectItem value="center">Mitten</SelectItem>
                      <SelectItem value="right">Höger</SelectItem>
                      <SelectItem value="justify">Justerad</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Textvikt</Label>
                  <Select 
                    value={component.customData?.fontWeight || 'normal'} 
                    onValueChange={(fontWeight) => updateCustomData('fontWeight', fontWeight)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="bold">Fet</SelectItem>
                      <SelectItem value="lighter">Tunn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {component.type === 'custom_image' && (
              <>
                <div>
                  <Label>Titel</Label>
                  <Input
                    value={component.customData?.title || ''}
                    onChange={(e) => updateCustomData('title', e.target.value)}
                    placeholder="Ange titel"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Bild-URL</Label>
                  <Input
                    value={component.customData?.imageUrl || ''}
                    onChange={(e) => updateCustomData('imageUrl', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="mt-2"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Visa ram</Label>
                  <Switch
                    checked={component.customData?.showBorder || false}
                    onCheckedChange={(showBorder) => updateCustomData('showBorder', showBorder)}
                  />
                </div>
              </>
            )}

            {component.type === 'custom_video' && (
              <>
                <div>
                  <Label>Titel</Label>
                  <Input
                    value={component.customData?.title || ''}
                    onChange={(e) => updateCustomData('title', e.target.value)}
                    placeholder="Ange titel"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Video/GIF-URL</Label>
                  <Input
                    value={component.customData?.videoUrl || ''}
                    onChange={(e) => updateCustomData('videoUrl', e.target.value)}
                    placeholder="https://example.com/video.mp4"
                    className="mt-2"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Autostart</Label>
                  <Switch
                    checked={component.customData?.autoplay || false}
                    onCheckedChange={(autoplay) => updateCustomData('autoplay', autoplay)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Upprepa</Label>
                  <Switch
                    checked={component.customData?.loop || false}
                    onCheckedChange={(loop) => updateCustomData('loop', loop)}
                  />
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}

// Main Advanced Layout Editor
export function AdvancedLayoutEditor() {
  const { toast } = useToast();
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [activeLayout, setActiveLayout] = useState<Layout | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<LayoutComponent | null>(null);
  const [newLayoutName, setNewLayoutName] = useState('');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [showPreview, setShowPreview] = useState(true);
  
  // Mock data for preview
  const [mockSalesData] = useState({
    totalToday: 15000,
    totalMonth: 125000,
    topSellers: [
      { name: 'Anna', amount: 45000, imageUrl: null, goal: 50000, progress: 90 },
      { name: 'Johan', amount: 38000, imageUrl: null, goal: 40000, progress: 95 },
    ],
    lastSale: { seller_name: 'Anna', amount: 2500, timestamp: new Date().toISOString() },
    chartData: [
      { name: 'Anna', amount: 5000 },
      { name: 'Johan', amount: 3500 },
    ],
    kingQueen: { name: 'Anna', amount: 5000, imageUrl: null }
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
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
        layout_config: layout.layout_config || { 
          components: [], 
          gridColumns: 12, 
          gridRows: 20,
          globalTheme: {}
        },
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

  const saveLayout = async () => {
    if (!activeLayout) return;

    try {
      // First ensure this layout is active by deactivating others
      await supabase
        .from('dashboard_layouts')
        .update({ is_active: false })
        .neq('id', '');

      // Then save and activate the current layout
      const { error } = await supabase
        .from('dashboard_layouts')
        .update({
          layout_config: JSON.parse(JSON.stringify(activeLayout.layout_config)),
          theme_config: JSON.parse(JSON.stringify(activeLayout.theme_config)),
          is_active: true
        })
        .eq('id', activeLayout.id);

      if (error) throw error;

      toast({
        title: "Sparad och aktiverad",
        description: "Layout sparad och uppdateras nu på dashboarden!"
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
          layout_config: { 
            components: [], 
            gridColumns: 12, 
            gridRows: 20,
            globalTheme: {}
          },
          theme_config: {}
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
      setActiveLayout({
        ...data,
        layout_config: data.layout_config as any || { 
          components: [], 
          gridColumns: 12, 
          gridRows: 20,
          globalTheme: {}
        },
        theme_config: data.theme_config as any || {}
      } as Layout);
    } catch (error) {
      console.error('Error creating layout:', error);
      toast({
        title: "Fel",
        description: "Kunde inte skapa layout",
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
      size: 'md',
      width: 100,
      height: type === 'spacer' ? 50 : 200,
      position: { x: 0, y: 0 },
      styling: {
        backgroundColor: '#ffffff',
        textColor: '#000000',
        borderRadius: 8,
        padding: 16,
        margin: 8,
        borderWidth: 0,
        borderColor: '#e2e8f0',
        shadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
      },
      customData: type.startsWith('custom_') ? {
        title: type === 'custom_text' ? 'Ny text' : type === 'custom_image' ? 'Ny bild' : 'Ny video',
        text: type === 'custom_text' ? 'Din text här...' : undefined,
        imageUrl: type === 'custom_image' ? '' : undefined,
        videoUrl: type === 'custom_video' ? '' : undefined,
        fontSize: 16,
        fontWeight: 'normal',
        textAlign: 'left'
      } : undefined
    };

    const updatedLayout = {
      ...activeLayout,
      layout_config: {
        ...activeLayout.layout_config,
        components: [...activeLayout.layout_config.components, newComponent]
      }
    };

    setActiveLayout(updatedLayout);
    setSelectedComponent(newComponent);
  };

  const updateComponent = (updatedComponent: LayoutComponent) => {
    if (!activeLayout) return;

    const updatedComponents = activeLayout.layout_config.components.map(comp =>
      comp.id === updatedComponent.id ? updatedComponent : comp
    );

    const updatedLayout = {
      ...activeLayout,
      layout_config: {
        ...activeLayout.layout_config,
        components: updatedComponents
      }
    };

    setActiveLayout(updatedLayout);
    setSelectedComponent(updatedComponent);
  };

  const deleteComponent = (componentId: string) => {
    if (!activeLayout) return;

    const updatedComponents = activeLayout.layout_config.components.filter(
      comp => comp.id !== componentId
    );

    const updatedLayout = {
      ...activeLayout,
      layout_config: {
        ...activeLayout.layout_config,
        components: updatedComponents
      }
    };

    setActiveLayout(updatedLayout);
    setSelectedComponent(null);
  };

  const clearAllComponents = () => {
    if (!activeLayout) return;

    const updatedLayout = {
      ...activeLayout,
      layout_config: {
        ...activeLayout.layout_config,
        components: []
      }
    };

    setActiveLayout(updatedLayout);
    setSelectedComponent(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!activeLayout || !over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const oldIndex = activeLayout.layout_config.components.findIndex(item => item.id === activeId);
    const newIndex = activeLayout.layout_config.components.findIndex(item => item.id === overId);

    if (oldIndex !== newIndex) {
      const updatedComponents = arrayMove(activeLayout.layout_config.components, oldIndex, newIndex);
      
      const updatedLayout = {
        ...activeLayout,
        layout_config: {
          ...activeLayout.layout_config,
          components: updatedComponents
        }
      };

      setActiveLayout(updatedLayout);
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
        description: "Layout aktiverad och visas nu på dashboarden!"
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

  const previewStyles = {
    desktop: { width: '100%', maxWidth: '1200px' },
    tablet: { width: '768px', maxWidth: '768px' },
    mobile: { width: '375px', maxWidth: '375px' },
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold">Avancerad Layout-Editor</h2>
            <Badge variant="secondary">Beta</Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <Button
                variant={previewMode === 'desktop' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPreviewMode('desktop')}
              >
                <Monitor className="w-4 h-4" />
              </Button>
              <Button
                variant={previewMode === 'tablet' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPreviewMode('tablet')}
              >
                <Tablet className="w-4 h-4" />
              </Button>
              <Button
                variant={previewMode === 'mobile' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPreviewMode('mobile')}
              >
                <Smartphone className="w-4 h-4" />
              </Button>
            </div>
            
            <Separator orientation="vertical" className="h-6" />
            
            <Button
              variant={showPreview ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="w-4 h-4 mr-2" />
              Förhandsvisning
            </Button>
            
            <Button onClick={saveLayout} disabled={!activeLayout}>
              <Save className="w-4 h-4 mr-2" />
              Spara
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Component Library & Settings */}
        <div className="w-80 border-r bg-card flex flex-col">
          <Tabs defaultValue="components" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 m-4">
              <TabsTrigger value="components">Komponenter</TabsTrigger>
              <TabsTrigger value="layouts">Layouts</TabsTrigger>
              <TabsTrigger value="settings">Inställningar</TabsTrigger>
            </TabsList>
            
            <TabsContent value="components" className="flex-1 px-4 pb-4 mt-0">
              <ComponentPalette onAddComponent={addComponent} />
            </TabsContent>
            
            <TabsContent value="layouts" className="flex-1 px-4 pb-4 mt-0">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Layoutnamn"
                    value={newLayoutName}
                    onChange={(e) => setNewLayoutName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && createNewLayout()}
                  />
                  <Button onClick={createNewLayout}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {layouts.map((layout) => (
                      <Card 
                        key={layout.id} 
                        className={`cursor-pointer transition-colors ${
                          layout.id === activeLayout?.id ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => setActiveLayout(layout)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{layout.layout_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {layout.layout_config.components.length} komponenter
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {layout.is_active && (
                                <Badge variant="secondary">Aktiv</Badge>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveLayoutById(layout.id);
                                }}
                              >
                                Aktivera
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>
            
            <TabsContent value="settings" className="flex-1 px-4 pb-4 mt-0">
              <div className="space-y-4">
                <Button 
                  variant="destructive" 
                  onClick={clearAllComponents}
                  disabled={!activeLayout || activeLayout.layout_config.components.length === 0}
                  className="w-full"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Rensa alla komponenter
                </Button>
                
                <Separator />
                
                <div>
                  <Label>Globala inställningar</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Globala tema- och layoutinställningar kommer snart.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Center - Layout Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {showPreview ? (
            <div className="flex-1 p-4 overflow-auto bg-muted/30">
              <div 
                className="mx-auto bg-background border rounded-lg shadow-lg min-h-[600px] transition-all duration-300"
                style={previewStyles[previewMode]}
              >
                {activeLayout && activeLayout.layout_config.components.length > 0 ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={rectIntersection}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={activeLayout.layout_config.components.map(c => c.id)}
                      strategy={rectSortingStrategy}
                    >
                      <div className="p-4 space-y-4">
                        {activeLayout.layout_config.components
                          .sort((a, b) => a.order - b.order)
                          .map((component) => (
                            <DraggableComponent
                              key={component.id}
                              component={component}
                              isPreview={true}
                              onSelect={setSelectedComponent}
                              isSelected={selectedComponent?.id === component.id}
                              salesData={mockSalesData}
                              sellers={[]}
                              challenges={[]}
                              settings={{}}
                            />
                          ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <div className="flex items-center justify-center h-full text-center p-8">
                    <div>
                      <Grid className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                      <h3 className="text-lg font-semibold mb-2">Tom dashboard</h3>
                      <p className="text-muted-foreground mb-4">
                        Lägg till komponenter från biblioteket för att börja bygga din dashboard.
                      </p>
                      <Button onClick={() => addComponent('stats_cards')}>
                        <Plus className="w-4 h-4 mr-2" />
                        Lägg till första komponenten
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center flex-1 text-muted-foreground">
              <p>Förhandsvisning är avstängd</p>
            </div>
          )}
        </div>

        {/* Right Sidebar - Component Editor */}
        <div className="w-80 border-l bg-card">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Komponentredigerare</h3>
          </div>
          <ComponentEditor
            component={selectedComponent}
            onUpdate={updateComponent}
            onDelete={deleteComponent}
          />
        </div>
      </div>
    </div>
  );
}