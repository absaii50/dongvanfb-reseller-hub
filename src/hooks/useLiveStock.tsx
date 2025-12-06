import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LiveStockData {
  dongvan_id: number;
  stock: number;
}

interface UseLiveStockReturn {
  liveStock: Record<number, number>;
  isChecking: boolean;
  lastChecked: Date | null;
  error: string | null;
}

export function useLiveStock(intervalMs: number = 10000): UseLiveStockReturn {
  const [liveStock, setLiveStock] = useState<Record<number, number>>({});
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkStock = useCallback(async () => {
    setIsChecking(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('dongvan-api', {
        body: { action: 'products' }
      });

      if (fnError) throw fnError;
      
      if (data?.data && Array.isArray(data.data)) {
        const stockMap: Record<number, number> = {};
        data.data.forEach((product: { id: number; quality: number }) => {
          stockMap[product.id] = product.quality;
        });
        setLiveStock(stockMap);
        setLastChecked(new Date());
      }
    } catch (err) {
      console.error('Live stock check failed:', err);
      setError('Failed to fetch live stock');
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkStock();

    // Set up interval
    const interval = setInterval(checkStock, intervalMs);

    return () => clearInterval(interval);
  }, [checkStock, intervalMs]);

  return { liveStock, isChecking, lastChecked, error };
}
