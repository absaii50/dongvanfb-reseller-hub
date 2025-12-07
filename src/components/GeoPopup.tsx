import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { getUserCountry } from '@/lib/geoip';
import { X } from 'lucide-react';

interface Popup {
  id: string;
  title: string;
  message: string;
  image_url: string | null;
  button_text: string;
  button_link: string | null;
  target_countries: string[];
  priority: number;
}

const POPUP_STORAGE_PREFIX = 'popup_seen_';
const POPUP_DISMISSED_PREFIX = 'popup_dismissed_';
const MAX_VIEWS = 2;

export function GeoPopup() {
  const [popup, setPopup] = useState<Popup | null>(null);
  const [open, setOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPopup = async () => {
      try {
        // 1. Get user's country
        const countryCode = await getUserCountry();
        
        // 2. Fetch active popups
        const { data: popups, error } = await supabase
          .from('popups')
          .select('*')
          .eq('is_active', true)
          .order('priority', { ascending: false });
        
        if (error || !popups?.length) {
          setLoading(false);
          return;
        }

        // 3. Find matching popup (country-specific or universal)
        const matchingPopup = popups.find((p: Popup) => {
          // Check if already dismissed
          const dismissed = localStorage.getItem(`${POPUP_DISMISSED_PREFIX}${p.id}`);
          if (dismissed === 'true') return false;
          
          // Check view count
          const viewCount = parseInt(localStorage.getItem(`${POPUP_STORAGE_PREFIX}${p.id}`) || '0', 10);
          if (viewCount >= MAX_VIEWS) return false;
          
          // Check country targeting
          const isUniversal = !p.target_countries || p.target_countries.length === 0;
          const matchesCountry = p.target_countries?.includes(countryCode);
          
          return isUniversal || matchesCountry;
        });

        if (matchingPopup) {
          setPopup(matchingPopup);
          setOpen(true);
          
          // Increment view count
          const currentViews = parseInt(localStorage.getItem(`${POPUP_STORAGE_PREFIX}${matchingPopup.id}`) || '0', 10);
          localStorage.setItem(`${POPUP_STORAGE_PREFIX}${matchingPopup.id}`, String(currentViews + 1));
        }
      } catch (error) {
        console.error('Error loading popup:', error);
      } finally {
        setLoading(false);
      }
    };

    // Small delay to not block initial render
    const timer = setTimeout(loadPopup, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    if (dontShowAgain && popup) {
      localStorage.setItem(`${POPUP_DISMISSED_PREFIX}${popup.id}`, 'true');
    }
    setOpen(false);
  };

  const handleButtonClick = () => {
    if (popup?.button_link) {
      window.open(popup.button_link, '_blank');
    }
    handleClose();
  };

  if (loading || !popup) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md bg-card border-border/50 backdrop-blur-xl">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        
        <DialogHeader className="pt-2">
          <DialogTitle className="text-xl font-bold text-foreground">
            {popup.title}
          </DialogTitle>
        </DialogHeader>
        
        {popup.image_url && (
          <div className="relative w-full h-40 rounded-lg overflow-hidden">
            <img
              src={popup.image_url}
              alt={popup.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <DialogDescription className="text-muted-foreground whitespace-pre-wrap">
          {popup.message}
        </DialogDescription>
        
        <div className="flex flex-col gap-4 mt-2">
          <Button onClick={handleButtonClick} className="w-full">
            {popup.button_text || 'OK'}
          </Button>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="dont-show"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
            />
            <Label
              htmlFor="dont-show"
              className="text-sm text-muted-foreground cursor-pointer"
            >
              Don't show this again
            </Label>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
