import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseLiveStockReturn {
  liveStock: Record<number, number>;
  isChecking: boolean;
  isInitialLoading: boolean;
  lastChecked: Date | null;
  error: string | null;
  useFallback: boolean;
}

export function useLiveStock(intervalMs: number = 10000): UseLiveStockReturn {
  const [liveStock, setLiveStock] = useState<Record<number, number>>({});
  const [isChecking, setIsChecking] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);

  const checkStock = useCallback(async () => {
    setIsChecking(true);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('dongvan-api', {
        body: { action: 'get_products' }
      });

      if (fnError) throw fnError;
      
      if (data?.data && Array.isArray(data.data)) {
        const stockMap: Record<number, number> = {};
        data.data.forEach((product: { id: number; quality: number }) => {
          stockMap[product.id] = product.quality;
        });
        setLiveStock(stockMap);
        setLastChecked(new Date());
        setIsInitialLoading(false);
        setError(null);
        setUseFallback(false);
        setConsecutiveErrors(0);
      }
    } catch (err) {
      console.error('Live stock check failed:', err);
      const newErrorCount = consecutiveErrors + 1;
      setConsecutiveErrors(newErrorCount);
      
      // After 3 consecutive errors, switch to fallback mode
      if (newErrorCount >= 3) {
        setUseFallback(true);
        setError('Using cached stock data');
      } else {
        setError('Failed to fetch live stock');
      }
      setIsInitialLoading(false);
    } finally {
      setIsChecking(false);
    }
  }, [consecutiveErrors]);

  useEffect(() => {
    // Initial check
    checkStock();

    // Set up interval
    const interval = setInterval(checkStock, intervalMs);

    return () => clearInterval(interval);
  }, [checkStock, intervalMs]);

  return { liveStock, isChecking, isInitialLoading, lastChecked, error, useFallback };
}
