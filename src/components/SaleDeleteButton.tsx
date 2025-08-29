import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SaleDeleteButtonProps {
  saleId: string;
  sellerName: string;
  amount: number;
  onDeleted?: () => void;
}

export const SaleDeleteButton: React.FC<SaleDeleteButtonProps> = ({
  saleId,
  sellerName,
  amount,
  onDeleted
}) => {
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', saleId);

      if (error) {
        console.error('Error deleting sale:', error);
        toast({
          title: "Fel",
          description: "Kunde inte ta bort försäljningen",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Försäljning borttagen",
        description: `${sellerName}s försäljning på ${amount.toLocaleString('sv-SE')} tb har tagits bort`,
      });

      if (onDeleted) {
        onDeleted();
      }
    } catch (error) {
      console.error('Error deleting sale:', error);
      toast({
        title: "Fel",
        description: "Ett oväntat fel inträffade",
        variant: "destructive"
      });
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ta bort försäljning?</AlertDialogTitle>
          <AlertDialogDescription>
            Är du säker på att du vill ta bort {sellerName}s försäljning på {amount.toLocaleString('sv-SE')} tb?
            Denna åtgärd kan inte ångras och kommer att uppdatera alla summor automatiskt.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Avbryt</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
            Ta bort
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};