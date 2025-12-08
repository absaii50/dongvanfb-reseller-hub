import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, User, Settings, Wallet, ShoppingBag, Mail, Shield, Menu, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

export function Navbar() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setMobileMenuOpen(false);
    navigate('/');
  };

  const handleNavigate = (path: string) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  return (
    <nav className="sticky top-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="relative">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="absolute -inset-1 rounded-lg bg-primary/20 blur-sm -z-10" />
            </div>
            <span className="text-xl font-bold text-gradient">CryptoMails</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              Products
            </Link>
            <Link to="/tools" className="text-muted-foreground hover:text-foreground transition-colors">
              Tools
            </Link>
            {user && (
              <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                Dashboard
              </Link>
            )}
            {isAdmin && (
              <Link to="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
                Admin
              </Link>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Desktop User Menu */}
            {user ? (
              <>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border/50">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">${profile?.balance?.toFixed(2) || '0.00'}</span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full hidden md:flex">
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{profile?.email}</p>
                      <p className="text-xs text-muted-foreground">Balance: ${profile?.balance?.toFixed(2)}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/deposit')}>
                      <Wallet className="mr-2 h-4 w-4" />
                      Deposit Funds
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/settings')}>
                      <Settings className="mr-2 h-4 w-4" />
                      Account Settings
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem onClick={() => navigate('/admin')}>
                        <Shield className="mr-2 h-4 w-4" />
                        Admin Panel
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Button variant="ghost" onClick={() => navigate('/auth')}>
                  Sign In
                </Button>
                <Button variant="glow" onClick={() => navigate('/auth?mode=signup')}>
                  Get Started
                </Button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[350px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    CryptoMails
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4 mt-6">
                  {user && (
                    <div className="p-4 rounded-lg bg-secondary/50 border border-border/50">
                      <p className="text-sm text-muted-foreground">Signed in as</p>
                      <p className="font-medium truncate">{profile?.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Wallet className="h-4 w-4 text-primary" />
                        <span className="font-bold text-primary">${profile?.balance?.toFixed(2) || '0.00'}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <Button 
                      variant="ghost" 
                      className="justify-start" 
                      onClick={() => handleNavigate('/')}
                    >
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      Products
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start" 
                      onClick={() => handleNavigate('/tools')}
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Tools
                    </Button>
                    {user && (
                      <>
                        <Button 
                          variant="ghost" 
                          className="justify-start" 
                          onClick={() => handleNavigate('/dashboard')}
                        >
                          <ShoppingBag className="mr-2 h-4 w-4" />
                          Dashboard
                        </Button>
                        <Button 
                          variant="ghost" 
                          className="justify-start" 
                          onClick={() => handleNavigate('/deposit')}
                        >
                          <Wallet className="mr-2 h-4 w-4" />
                          Deposit Funds
                        </Button>
                        <Button 
                          variant="ghost" 
                          className="justify-start" 
                          onClick={() => handleNavigate('/settings')}
                        >
                          <Settings className="mr-2 h-4 w-4" />
                          Account Settings
                        </Button>
                        {isAdmin && (
                          <Button 
                            variant="ghost" 
                            className="justify-start" 
                            onClick={() => handleNavigate('/admin')}
                          >
                            <Shield className="mr-2 h-4 w-4" />
                            Admin Panel
                          </Button>
                        )}
                      </>
                    )}
                  </div>

                  <div className="border-t border-border/50 pt-4">
                    {user ? (
                      <Button 
                        variant="outline" 
                        className="w-full text-destructive" 
                        onClick={handleSignOut}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </Button>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <Button 
                          variant="outline" 
                          className="w-full" 
                          onClick={() => handleNavigate('/auth')}
                        >
                          Sign In
                        </Button>
                        <Button 
                          variant="glow" 
                          className="w-full" 
                          onClick={() => handleNavigate('/auth?mode=signup')}
                        >
                          Get Started
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}