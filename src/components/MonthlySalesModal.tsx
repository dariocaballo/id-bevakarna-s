import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Calendar, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SaleDeleteButton } from '@/components/SaleDeleteButton';

interface Sale {
  id: string;
  seller_name: string;
  amount_tb: number;
  timestamp: string;
}

interface MonthlySalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellerName: string;
  totalAmount: number;
}

export const MonthlySalesModal: React.FC<MonthlySalesModalProps> = ({
  isOpen,
  onClose,
  sellerName,
  totalAmount
}) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadMonthlySales = async () => {
    if (!sellerName) return;
    
    setIsLoading(true);
    try {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('seller_name', sellerName)
        .gte('timestamp', startOfMonth.toISOString())
        .lte('timestamp', endOfMonth.toISOString())
        .order('timestamp', { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (error) {
      console.error('Error loading monthly sales:', error);
      setSales([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && sellerName) {
      loadMonthlySales();

      // Set up real-time subscription for this seller's sales
      const channel = supabase
        .channel(`monthly-sales-${sellerName}`)
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'sales',
            filter: `seller_name=eq.${sellerName}`
          },
          () => loadMonthlySales()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOpen, sellerName]);

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('sv-SE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' tb';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            {sellerName} - Månadens försäljningar
          </DialogTitle>
          <DialogDescription>
            <div className="flex items-center justify-between">
              <span>Totalt: {formatCurrency(totalAmount)}</span>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                {new Date().toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' })}
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Laddar försäljningar...</span>
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Inga försäljningar hittades för denna månad
            </div>
          ) : (
            <div className="space-y-2">
              {sales.map((sale) => (
                <Card key={sale.id} className="border border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-lg text-blue-700">
                            {formatCurrency(sale.amount_tb)}
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatDate(sale.timestamp)}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <SaleDeleteButton
                          saleId={sale.id}
                          sellerName={sale.seller_name}
                          amount={sale.amount_tb}
                          onDeleted={loadMonthlySales}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose} variant="outline">
            Stäng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};