import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';
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
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    
    try {
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', saleId);

      if (error) {
        toast({
          title: "Fel",
          description: `Kunde inte ta bort försäljningen: ${error.message}`,
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
      toast({
        title: "Fel",
        description: "Ett oväntat fel inträffade vid radering",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
          disabled={isDeleting}
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ta bort försäljning?</AlertDialogTitle>
          <AlertDialogDescription>
            Är du säker på att du vill ta bort {sellerName}s försäljning på {amount.toLocaleString('sv-SE')} tb?
            Denna åtgärd kan inte ångras och kommer att uppdatera alla summor automatiskt via realtid.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Avbryt</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete} 
            className="bg-red-600 hover:bg-red-700"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Raderar...
              </>
            ) : (
              'Ta bort'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};