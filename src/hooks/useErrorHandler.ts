import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { parseError, isAuthError, AppError } from '@/lib/errorHandler';

export function useErrorHandler() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleError = async (error: unknown, context?: string): Promise<AppError> => {
    const parsedError = parseError(error);
    
    console.error(`[${context || 'Error'}]`, {
      code: parsedError.code,
      message: parsedError.message,
      details: parsedError.details,
      action: parsedError.action,
      rawError: error,
    });

    // Handle auth errors - sign out and redirect
    if (isAuthError(error)) {
      toast({
        title: parsedError.message,
        description: parsedError.details,
        variant: 'destructive',
      });
      
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.error('Error signing out:', signOutError);
      }
      
      navigate('/auth');
      return parsedError;
    }

    // Show toast for other errors
    toast({
      title: parsedError.message,
      description: parsedError.details,
      variant: 'destructive',
    });

    return parsedError;
  };

  // Check session before sensitive operations
  const checkSession = async (): Promise<boolean> => {
    try {
      const { data: sessionData, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Session check error:', error);
        await handleError(error, 'SessionCheck');
        return false;
      }

      if (!sessionData.session) {
        toast({
          title: 'Session Expired',
          description: 'Please log in again to continue.',
          variant: 'destructive',
        });
        navigate('/auth');
        return false;
      }

      console.log('Session valid:', {
        userId: sessionData.session.user.id,
        expiresAt: sessionData.session.expires_at,
      });

      return true;
    } catch (error) {
      console.error('Session check failed:', error);
      await handleError(error, 'SessionCheck');
      return false;
    }
  };

  return {
    handleError,
    checkSession,
  };
}
