import React, { useState, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Printer, 
  Search, 
  User, 
  LogOut, 
  Shield, 
  Clock, 
  List, 
  Columns,
  Sparkles,
  SlidersHorizontal,
  Download,
  Menu,
  X,
  ChevronRight,
  Settings,
  Database,
  LogIn,
  Users,
  LayoutDashboard,
  CheckCircle2,
  UserX,
  ArrowLeftRight,
  Sun,
  Moon
} from 'lucide-react';
import { UserProfile, HearingStatus } from '../types/oitiva';
import { hapticSelection, hapticToggle } from '../utils/haptics';
import { useTheme } from '../context/ThemeContext';

interface NavbarProps {
  currentView: 'month' | 'week' | 'day' | 'list';
  onViewChange: (view: 'month' | 'week' | 'day' | 'list') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter?: HearingStatus | 'TODOS';
  onStatusFilterChange?: (status: HearingStatus | 'TODOS') => void;
  onOpenNewModal: () => void;
  onOpenPrintModal: () => void;
  onOpenWorkspaceModal: () => void;
  onOpenAuthModal: () => void;
  onOpenProfileModal: () => void;
  onOpenDelegadosModal?: () => void;
  onOpenHolidaysModal?: () => void;
  onExportBackup?: () => void;
  isAdmin?: boolean;
  hasWorkspaceToken: boolean;
  syncStatus?: 'connected' | 'syncing' | 'offline';
  user: UserProfile | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onViewChange,
  searchQuery,
  onSearchChange,
  statusFilter = 'TODOS',
  onStatusFilterChange,
  onOpenNewModal,
  onOpenPrintModal,
  onOpenWorkspaceModal,
  onOpenAuthModal,
  onOpenProfileModal,
  onOpenDelegadosModal,
  onOpenHolidaysModal,
  onExportBackup,
  isAdmin = false,
  hasWorkspaceToken,
  syncStatus = 'connected',
  user,
  onLogout
}) => {
  const { isDark, toggleTheme } = useTheme();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  const handleOpenMobileSearch = () => {
    hapticSelection();
    setIsMobileSearchOpen(prev => !prev);
    if (!isMobileSearchOpen) {
      setTimeout(() => {
        mobileSearchInputRef.current?.focus();
      }, 150);
    }
  };

  // Alterna entre visualização Mensal e Semanal ao clicar no botão de Calendário no mobile
  const handleToggleCalendarView = () => {
    hapticSelection();
    setIsMobileSearchOpen(false);
    if (currentView === 'month') {
      onViewChange('week');
    } else {
      onViewChange('month');
    }
  };

  const statusOptions: Array<{ id: HearingStatus | 'TODOS'; label: string; activeClass: string }> = [
    { id: 'TODOS', label: 'Todas', activeClass: isDark ? 'bg-purple-600 text-white border-purple-400' : 'bg-purple-600 text-white border-purple-700' },
    { id: 'Agendada', label: 'Agendadas', activeClass: isDark ? 'bg-amber-950 text-amber-200 border-amber-400' : 'bg-amber-100 text-amber-950 border-amber-400 font-bold' },
    { id: 'Realizada', label: 'Realizadas', activeClass: isDark ? 'bg-emerald-950 text-emerald-200 border-emerald-400' : 'bg-emerald-100 text-emerald-950 border-emerald-400 font-bold' },
    { id: 'Remarcada', label: 'Remarcadas', activeClass: isDark ? 'bg-indigo-950 text-indigo-200 border-indigo-400' : 'bg-indigo-100 text-indigo-950 border-indigo-400 font-bold' },
    { id: 'Não Compareceu', label: 'Faltas', activeClass: isDark ? 'bg-red-950 text-red-200 border-red-400' : 'bg-rose-100 text-rose-950 border-rose-400 font-bold' },
    { id: 'Cancelada', label: 'Canceladas', activeClass: isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-500' : 'bg-slate-200 text-slate-900 border-slate-400 font-bold' }
  ];

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. TOP HEADER (CLEAN & SPACIOUS ON MOBILE, RICH ON DESKTOP)                */}
      {/* ========================================================================= */}
      <header className={`sticky top-0 z-30 ${isDark ? 'bg-[#0c0a14]/98 border-purple-700/60 shadow-purple-950/40' : 'bg-white/98 border-slate-200 shadow-slate-200'} backdrop-blur-md border-b-2 px-2.5 sm:px-4 py-2 sm:py-2.5 transition-colors no-print shadow-xl`}>
        <div className="w-full max-w-[98.5%] 2xl:max-w-[1920px] mx-auto">
          
          {/* --------------------------------------------------------------------- */}
          {/* MOBILE TOP BAR (sm:hidden) - Zero Bloat, Fast Actions & Hamburger Menu  */}
          {/* --------------------------------------------------------------------- */}
          <div className="flex sm:hidden items-center justify-between gap-2">
            
            {/* Identity & Status */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-purple-950 flex items-center justify-center border-2 border-purple-400/80 shadow-md shadow-purple-950/60 shrink-0">
                <Shield className="w-4 h-4 text-purple-100" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className={`font-black text-xs tracking-tight leading-none truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Agenda de Oitivas
                  </h1>
                  <span 
                    title={syncStatus === 'connected' ? 'Tempo Real' : syncStatus === 'syncing' ? 'Sincronizando' : 'Offline'}
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      syncStatus === 'connected' ? 'bg-emerald-400 ring-2 ring-emerald-950' : syncStatus === 'syncing' ? 'bg-amber-400 ring-2 ring-amber-950 animate-pulse' : 'bg-zinc-500'
                    }`}
                  />
                </div>
                <p className={`text-[10px] font-medium leading-none mt-0.5 truncate max-w-[160px] ${isDark ? 'text-purple-300' : 'text-slate-600'}`}>
                  {user?.unitName || '1ª DP Metropolitana'}
                </p>
              </div>
            </div>

            {/* Mobile Actions: Theme toggle, Search toggle, + Nova, and Hamburger Menu Button */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Mobile Theme Toggle Button */}
              <button
                type="button"
                id="mobile-theme-toggle-btn"
                onClick={() => {
                  hapticToggle();
                  toggleTheme();
                }}
                className={`p-1.5 rounded-xl border-2 transition-all active:scale-95 shadow-sm ${
                  isDark 
                    ? 'bg-[#18112b] border-purple-700/60 text-purple-200 hover:text-white' 
                    : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
                }`}
                title={isDark ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
                aria-label={isDark ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
              >
                {isDark ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-500" />
                )}
              </button>

              {/* Search Toggle */}
              <button
                type="button"
                onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                className={`p-1.5 rounded-xl border-2 transition-all ${
                  isDark
                    ? isMobileSearchOpen || searchQuery
                      ? 'bg-purple-900/80 border-purple-300 text-white'
                      : 'bg-[#18112b] border-purple-700/60 text-purple-200 hover:text-white'
                    : isMobileSearchOpen || searchQuery
                      ? 'bg-purple-100 border-purple-400 text-purple-950'
                      : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
                }`}
                title="Buscar oitivas"
              >
                <Search className="w-4 h-4" />
              </button>

              {/* + Nova Oitiva Button */}
              <button
                type="button"
                id="mobile-btn-nova-oitiva"
                onClick={onOpenNewModal}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 active:from-purple-500 active:to-indigo-500 text-white border-2 border-purple-300/80 rounded-xl text-xs font-black shadow-md shadow-purple-950/80 active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova</span>
              </button>

              {/* Hamburger Menu Button (Opens Full-Screen Drawer) */}
              <button
                type="button"
                id="mobile-hamburger-btn"
                onClick={() => setIsMobileDrawerOpen(true)}
                className={`p-1.5 rounded-xl border-2 active:scale-95 shadow-md transition-all flex items-center justify-center ${
                  isDark 
                    ? 'border-purple-500/80 bg-gradient-to-b from-[#251849] to-[#160d2e] text-purple-200 hover:text-white hover:border-purple-300 shadow-purple-950/70' 
                    : 'border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200 shadow-slate-200'
                }`}
                title="Abrir Menu e Configurações"
                aria-label="Abrir Menu e Configurações"
              >
                <Menu className={`w-4 h-4 ${isDark ? 'text-purple-200' : 'text-slate-800'}`} />
              </button>
            </div>

          </div>

          {/* Collapsible Mobile Search & Status Quick Filter Strip */}
          {isMobileSearchOpen && (
            <div className={`sm:hidden mt-2 pt-2 border-t space-y-2 animate-in fade-in duration-150 ${isDark ? 'border-purple-800/50' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-purple-300' : 'text-slate-400'}`} />
                  <input
                    ref={mobileSearchInputRef}
                    type="text"
                    placeholder="Buscar depoente, procedimento, CPF..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    autoFocus
                    className={`w-full rounded-xl pl-8 pr-7 py-1.5 text-xs focus:outline-none focus:ring-2 shadow-inner ${
                      isDark 
                        ? 'bg-[#18112b] border-2 border-purple-500 text-white placeholder-purple-300/60 focus:ring-purple-400' 
                        : 'bg-white border-2 border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-purple-400'
                    }`}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => onSearchChange('')}
                      className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold ${isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
                <button
                  onClick={() => {
                    setIsMobileSearchOpen(false);
                    if (searchQuery) onSearchChange('');
                  }}
                  className={`px-2.5 py-1.5 text-xs font-bold rounded-xl active:scale-95 transition-all ${
                    isDark 
                      ? 'text-purple-300 hover:text-white bg-[#1a1330] border border-purple-700/60' 
                      : 'text-slate-700 hover:text-slate-900 bg-slate-100 border border-slate-300'
                  }`}
                >
                  Fechar
                </button>
              </div>

              {/* Quick Status Filters for Mobile Search */}
              {onStatusFilterChange && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  <span className={`text-[10px] font-bold shrink-0 uppercase tracking-wider pl-0.5 ${isDark ? 'text-purple-300/80' : 'text-slate-700'}`}>
                    Filtro:
                  </span>
                  {statusOptions.map((opt) => {
                    const isSelected = statusFilter === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          hapticToggle();
                          onStatusFilterChange(opt.id);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all shrink-0 active:scale-95 ${
                          isSelected
                            ? `${opt.activeClass} shadow-md font-black scale-105`
                            : isDark
                              ? 'bg-[#140e24] border-purple-900/50 text-zinc-400 hover:text-zinc-200'
                              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-sm'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* DESKTOP BAR (hidden sm:block) - EXACT UNTOUCHED DESKTOP UX             */}
          {/* --------------------------------------------------------------------- */}
          <div className="hidden sm:block space-y-2.5">
            {/* ROW 1: Brand & Sync Status (Left) | Search (Center) | User / Entrar (Right) */}
            <div className="flex items-center justify-between gap-3">
              
              {/* Col 1: Identity & Unit */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-950 flex items-center justify-center border-2 border-purple-400/80 shadow-md shadow-purple-950/60">
                  <Shield className="w-5 h-5 text-purple-100" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className={`font-black text-base tracking-tight leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Agenda de Oitivas
                    </h1>
                    <span className={`px-2 py-0.5 text-[10px] font-black rounded-md leading-none uppercase tracking-wider border ${
                      isDark ? 'bg-purple-900/90 text-purple-200 border-purple-400/60' : 'bg-purple-100 text-purple-950 border-purple-300'
                    }`}>
                      Cartório Digital
                    </span>
                    <span 
                      title={
                        syncStatus === 'connected' 
                          ? 'Banco de dados Firestore sincronizado em tempo real' 
                          : syncStatus === 'syncing' 
                            ? 'Sincronizando com Firestore...' 
                            : 'Modo offline'
                      }
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold rounded-md border ${
                        syncStatus === 'connected'
                          ? isDark ? 'bg-emerald-950 text-emerald-200 border-emerald-400/80' : 'bg-emerald-100 text-emerald-950 border-emerald-400'
                          : syncStatus === 'syncing'
                            ? isDark ? 'bg-amber-950 text-amber-200 border-amber-400/80 animate-pulse' : 'bg-amber-100 text-amber-950 border-amber-400 animate-pulse'
                            : isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-600' : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${
                        syncStatus === 'connected' ? 'bg-emerald-500' : syncStatus === 'syncing' ? 'bg-amber-500' : 'bg-zinc-500'
                      }`} />
                      <span>{syncStatus === 'connected' ? 'Tempo Real' : syncStatus === 'syncing' ? 'Sincronizando...' : 'Offline'}</span>
                    </span>
                  </div>
                  <p className={`text-xs font-medium leading-tight mt-0.5 truncate max-w-[320px] ${isDark ? 'text-purple-200/90' : 'text-slate-600'}`}>
                    {user?.unitName || '1ª Delegacia Metropolitana de Maracanaú'}
                  </p>
                </div>
              </div>

              {/* Col 2: Global Search Bar */}
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-purple-300' : 'text-slate-400'}`} />
                <input
                  id="global-search-input"
                  type="text"
                  placeholder="Buscar depoente, procedimento, CPF..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className={`w-full rounded-xl pl-9 pr-8 py-2 text-xs font-medium transition-all shadow-inner focus:outline-none focus:ring-2 ${
                    isDark 
                      ? 'bg-[#171128] border-2 border-purple-600/60 focus:border-purple-300 text-white placeholder-purple-300/50 focus:ring-purple-400/50' 
                      : 'bg-slate-50 border-2 border-slate-300 focus:border-purple-500 text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-purple-200'
                  }`}
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange('')}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold cursor-pointer ${isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Col 3: User Status, Theme Toggle & Entrar Button */}
              <div className="flex items-center gap-2 shrink-0 ml-auto">
                {/* Theme Toggle Button (Light / Dark) */}
                <button
                  id="theme-toggle-btn"
                  type="button"
                  onClick={() => {
                    hapticToggle();
                    toggleTheme();
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border-2 transition-all cursor-pointer shadow-sm text-xs font-bold active:scale-95 ${
                    isDark 
                      ? 'border-purple-700/60 bg-[#16102a] text-purple-200 hover:text-white hover:border-purple-400' 
                      : 'border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200 hover:border-slate-400'
                  }`}
                  title={isDark ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
                  aria-label={isDark ? "Alternar para Modo Claro" : "Alternar para Modo Escuro"}
                >
                  {isDark ? (
                    <>
                      <Sun className="w-4 h-4 text-amber-400" />
                      <span className="text-[11px] font-bold text-amber-300 hidden lg:inline">Modo Claro</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-4 h-4 text-indigo-500" />
                      <span className="text-[11px] font-bold text-indigo-700 hidden lg:inline">Modo Escuro</span>
                    </>
                  )}
                </button>

                {user ? (
                  <div className="flex items-center gap-2">
                    <button
                      id="btn-open-my-profile"
                      onClick={onOpenProfileModal}
                      className={`flex items-center gap-2 p-1.5 rounded-xl border-2 transition-all text-left group cursor-pointer shadow-sm ${
                        isDark 
                          ? 'hover:bg-[#1f1638] border-purple-700/60 hover:border-purple-400' 
                          : 'hover:bg-slate-100 border-slate-300 bg-white shadow-sm'
                      }`}
                      title="Gerenciar Perfil e Segurança"
                    >
                      {user.photoURL ? (
                        <img 
                          src={user.photoURL} 
                          alt={user.displayName || 'Perfil'} 
                          className="w-7 h-7 rounded-lg object-cover border border-purple-400"
                        />
                      ) : (
                        <div 
                          className={`w-7 h-7 rounded-lg border flex items-center justify-center font-bold text-xs transition-colors ${
                            isDark 
                              ? 'bg-purple-950 border-purple-400 text-purple-200 group-hover:bg-purple-900' 
                              : 'bg-purple-100 border-purple-400 text-purple-950 group-hover:bg-purple-200'
                          }`}
                        >
                          {user.displayName ? user.displayName.substring(0, 2).toUpperCase() : 'OP'}
                        </div>
                      )}
                      <div className="text-left">
                        <div className="flex items-center gap-1">
                          <p className={`text-xs font-bold leading-none max-w-[120px] truncate transition-colors ${
                            isDark ? 'text-white group-hover:text-purple-300' : 'text-slate-900 group-hover:text-purple-700'
                          }`}>
                            {user.displayName || 'Servidor'}
                          </p>
                          {(user.role === 'admin' || user.isAdmin) && (
                            <span className={`px-1 py-0.2 rounded text-[8px] font-black border ${
                              isDark ? 'bg-amber-950 text-amber-200 border-amber-400' : 'bg-amber-100 text-amber-950 border-amber-400'
                            }`}>
                              ADMIN
                            </span>
                          )}
                        </div>
                        <p className={`text-[10px] leading-none mt-0.5 truncate max-w-[120px] font-medium ${
                          isDark ? 'text-purple-300' : 'text-slate-600'
                        }`}>
                          {user.cargo || 'Perfil'}
                        </p>
                      </div>
                    </button>

                    <button
                      id="logout-btn"
                      onClick={onLogout}
                      className={`p-2 rounded-xl border-2 transition-all cursor-pointer shadow-sm ${
                        isDark 
                          ? 'text-zinc-300 hover:text-rose-200 hover:bg-rose-950 border-purple-900/60 hover:border-rose-500' 
                          : 'text-slate-600 hover:text-rose-700 hover:bg-rose-50 border-slate-300 hover:border-rose-400'
                      }`}
                      title="Sair da Conta"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    id="login-btn"
                    onClick={onOpenAuthModal}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-2 border-purple-400/80 rounded-xl text-xs font-black shadow-md shadow-purple-950/60 transition-all cursor-pointer"
                  >
                    <User className="w-4 h-4" />
                    <span>Entrar</span>
                  </button>
                )}
              </div>

            </div>

            {/* ROW 2: Multi-Column Navigation & Action Bar */}
            <div className={`flex items-center justify-between gap-2 pt-1 border-t-2 ${isDark ? 'border-purple-700/40' : 'border-slate-200'}`}>
              
              {/* Col 1: View Mode Toggles */}
              <div className={`flex items-center border-2 p-1 rounded-2xl gap-1 ${
                isDark 
                  ? 'bg-[#130e24] border-purple-400 shadow-lg shadow-purple-950/80' 
                  : 'bg-slate-100 border-slate-300 shadow-sm'
              }`}>
                <button
                  id="view-mode-month-btn"
                  onClick={() => onViewChange('month')}
                  className={`flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[13px] font-black transition-all cursor-pointer ${
                    currentView === 'month'
                      ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white shadow-md shadow-purple-950 ring-2 ring-purple-300 scale-[1.02]'
                      : isDark
                        ? 'text-zinc-200 hover:text-white hover:bg-purple-900/60'
                        : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200'
                  }`}
                >
                  <CalendarIcon className={`w-4 h-4 ${currentView === 'month' ? 'text-white' : isDark ? 'text-purple-200' : 'text-purple-600'}`} />
                  <span>Mês</span>
                </button>

                <button
                  id="view-mode-week-btn"
                  onClick={() => onViewChange('week')}
                  className={`flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[13px] font-black transition-all cursor-pointer ${
                    currentView === 'week'
                      ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white shadow-md shadow-purple-950 ring-2 ring-purple-300 scale-[1.02]'
                      : isDark
                        ? 'text-zinc-200 hover:text-white hover:bg-purple-900/60'
                        : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200'
                  }`}
                >
                  <Columns className={`w-4 h-4 ${currentView === 'week' ? 'text-white' : isDark ? 'text-purple-200' : 'text-purple-600'}`} />
                  <span>Semana</span>
                </button>

                <button
                  id="view-mode-day-btn"
                  onClick={() => onViewChange('day')}
                  className={`flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[13px] font-black transition-all cursor-pointer ${
                    currentView === 'day'
                      ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white shadow-md shadow-purple-950 ring-2 ring-purple-300 scale-[1.02]'
                      : isDark
                        ? 'text-zinc-200 hover:text-white hover:bg-purple-900/60'
                        : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200'
                  }`}
                >
                  <Clock className={`w-4 h-4 ${currentView === 'day' ? 'text-white' : isDark ? 'text-purple-200' : 'text-purple-600'}`} />
                  <span>Dia</span>
                </button>

                <button
                  id="view-mode-list-btn"
                  onClick={() => onViewChange('list')}
                  className={`flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[13px] font-black transition-all cursor-pointer ${
                    currentView === 'list'
                      ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white shadow-md shadow-purple-950 ring-2 ring-purple-300 scale-[1.02]'
                      : isDark
                        ? 'text-zinc-200 hover:text-white hover:bg-purple-900/60'
                        : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200'
                  }`}
                >
                  <List className={`w-4 h-4 ${currentView === 'list' ? 'text-white' : isDark ? 'text-purple-200' : 'text-purple-600'}`} />
                  <span>Lista</span>
                </button>
              </div>

              {/* Col 2: Action Buttons Group */}
              <div className="flex items-center gap-2">
                {/* Google Workspace Button */}
                <button
                  id="google-workspace-nav-btn"
                  onClick={onOpenWorkspaceModal}
                  className={`flex items-center gap-1.5 px-3 py-1.5 border-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
                    isDark 
                      ? 'bg-[#171228] hover:bg-purple-900/60 text-purple-200 hover:text-white border-purple-600/70 hover:border-purple-400' 
                      : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                  }`}
                  title="Google Workspace (Drive, Gmail, Agenda)"
                >
                  <span className={`w-2 h-2 rounded-full ${hasWorkspaceToken ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                  <span>Workspace</span>
                </button>

                {/* Delegados & Oficiais Button */}
                {onOpenDelegadosModal && (
                  <button
                    id="delegados-nav-btn"
                    onClick={onOpenDelegadosModal}
                    className={`flex items-center gap-1.5 px-3 py-1.5 border-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
                      isDark 
                        ? 'bg-[#171228] hover:bg-purple-900/60 text-purple-200 hover:text-white border-purple-600/70 hover:border-purple-400' 
                        : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                    }`}
                    title="Catálogo de Autoridades & Oficiais Policiais (DPC / OIP)"
                  >
                    <Shield className={`w-3.5 h-3.5 ${isDark ? 'text-purple-300' : 'text-purple-600'}`} />
                    <span>DPC / OIP</span>
                  </button>
                )}

                {/* Admin Feriados Button */}
                {isAdmin && onOpenHolidaysModal && (
                  <button
                    id="admin-holidays-nav-btn"
                    onClick={onOpenHolidaysModal}
                    className={`flex items-center gap-1.5 px-3 py-1.5 border-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
                      isDark 
                        ? 'bg-[#2a0c16] hover:bg-[#3d1220] text-red-300 hover:text-white border-red-500/80 hover:border-red-400' 
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-950 border-rose-300'
                    }`}
                    title="Gerenciar Feriados e Fins de Semana (Admin)"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-red-500" />
                    <span>Feriados</span>
                  </button>
                )}

                {/* Print Pauta Button */}
                <button
                  id="print-pauta-btn"
                  onClick={onOpenPrintModal}
                  className={`flex items-center gap-1.5 px-3 py-1.5 border-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
                    isDark 
                      ? 'bg-[#171228] hover:bg-[#251e3d] text-zinc-100 hover:text-white border-purple-600/70 hover:border-purple-400' 
                      : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                  }`}
                  title="Imprimir Pauta Oficial de Oitivas"
                >
                  <Printer className={`w-3.5 h-3.5 ${isDark ? 'text-purple-300' : 'text-slate-600'}`} />
                  <span>Pauta do Dia</span>
                </button>

                {/* Exportar Backup Button */}
                {onExportBackup && (
                  <button
                    id="export-backup-nav-btn"
                    onClick={onExportBackup}
                    className={`flex items-center gap-1.5 px-3 py-1.5 border-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
                      isDark 
                        ? 'bg-[#121a36] hover:bg-[#1a2754] text-blue-200 hover:text-white border-blue-500/70 hover:border-blue-400' 
                        : 'bg-blue-50 hover:bg-blue-100 text-blue-950 border-blue-300'
                    }`}
                    title="Exportar Backup das Oitivas (Download JSON)"
                  >
                    <Download className={`w-3.5 h-3.5 ${isDark ? 'text-blue-300' : 'text-blue-700'}`} />
                    <span>Backup</span>
                  </button>
                )}

                {/* Nova Oitiva Button */}
                <button
                  id="header-new-oitiva-btn"
                  onClick={onOpenNewModal}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-md shadow-purple-950/80 border-2 border-purple-300/80 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nova Oitiva</span>
                </button>
              </div>

            </div>
          </div>

        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MOBILE BOTTOM NAVIGATION BAR (sm:hidden)                                */}
      {/* ========================================================================= */}
      <nav 
        id="mobile-bottom-nav-bar"
        className={`sm:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl border-t-2 shadow-2xl px-4 py-1.5 flex items-center justify-around no-print pb-safe ${
          isDark 
            ? 'bg-[#0d091b]/98 border-purple-700/60' 
            : 'bg-white/98 border-slate-200 shadow-slate-300'
        }`}
      >
        
        {/* 1. Dashboard */}
        <button
          type="button"
          id="mobile-tab-dashboard"
          onClick={() => {
            hapticSelection();
            setIsMobileSearchOpen(false);
            onViewChange('day');
          }}
          className={`flex flex-col items-center justify-center py-1.5 px-4 rounded-xl transition-all min-w-[72px] min-h-[44px] ${
            currentView === 'day' && !isMobileSearchOpen
              ? 'bg-gradient-to-b from-purple-600 to-indigo-700 text-white shadow-md shadow-purple-950 ring-1 ring-purple-300 font-black scale-105'
              : isDark
                ? 'text-purple-300/80 hover:text-white font-medium'
                : 'text-slate-600 hover:text-slate-950 font-medium'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-[10px] mt-0.5 leading-none">Dashboard</span>
        </button>

        {/* 2. Calendário (Alterna entre Mensal e Semanal) */}
        <button
          type="button"
          id="mobile-tab-calendar"
          onClick={handleToggleCalendarView}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all min-w-[82px] min-h-[46px] relative select-none cursor-pointer ${
            (currentView === 'month' || currentView === 'week') && !isMobileSearchOpen
              ? 'bg-gradient-to-b from-purple-600 to-indigo-700 text-white shadow-lg shadow-purple-950 ring-2 ring-purple-300 font-black scale-105'
              : isDark
                ? 'text-purple-300/80 hover:text-white font-medium hover:bg-purple-950/40'
                : 'text-slate-600 hover:text-slate-950 font-medium hover:bg-slate-100'
          }`}
          title={
            currentView === 'month'
              ? 'Visão Mensal ativa. Toque para alternar para visão Semanal (Mês ⇄ Semana)'
              : currentView === 'week'
              ? 'Visão Semanal ativa. Toque para alternar para visão Mensal (Semana ⇄ Mês)'
              : 'Ir para o Calendário (Mês / Semana)'
          }
        >
          {/* Calendar Icon + Dynamic Indicator Badge */}
          <div className="relative flex items-center justify-center">
            <CalendarIcon className="w-4 h-4" />
            <span 
              className="absolute -top-1.5 -right-3.5 bg-amber-400 text-black text-[8px] font-black px-1 py-0.5 rounded-full leading-none shadow-sm flex items-center gap-0.5"
              title="Toque para alternar visualização"
            >
              <ArrowLeftRight className="w-2 h-2" />
            </span>
          </div>

          {/* Active View Label */}
          <span className="text-[10px] font-black leading-none mt-0.5">
            {currentView === 'week' ? 'Semana' : currentView === 'month' ? 'Mês' : 'Calendário'}
          </span>

          {/* Dynamic Switch Hint */}
          <span className={`text-[8px] font-bold leading-none mt-0.5 tracking-tight flex items-center gap-0.5 ${
            isDark ? 'text-amber-300' : 'text-amber-700'
          }`}>
            <span>⇄ {currentView === 'week' ? 'Mês' : 'Semana'}</span>
          </span>
        </button>

        {/* 3. Search (Busca Rápida com Filtros) */}
        <button
          type="button"
          id="mobile-tab-search"
          onClick={handleOpenMobileSearch}
          className={`flex flex-col items-center justify-center py-1.5 px-4 rounded-xl transition-all min-w-[72px] min-h-[44px] ${
            isMobileSearchOpen || (searchQuery.trim().length > 0 && currentView === 'list')
              ? 'bg-gradient-to-b from-purple-600 to-indigo-700 text-white shadow-md shadow-purple-950 ring-1 ring-purple-300 font-black scale-105'
              : isDark
                ? 'text-purple-300/80 hover:text-white font-medium'
                : 'text-slate-600 hover:text-slate-950 font-medium'
          }`}
        >
          <Search className="w-4 h-4" />
          <span className="text-[10px] mt-0.5 leading-none">Busca</span>
        </button>

      </nav>

      {/* ========================================================================= */}
      {/* 3. FULL-SCREEN MOBILE SLIDE-IN DRAWER (sm:hidden)                          */}
      {/* ========================================================================= */}
      {isMobileDrawerOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm no-print animate-in fade-in duration-200">
          <div className={`w-full max-w-full sm:max-w-md h-full border-l-2 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 ${
            isDark ? 'bg-[#0e0a1d] border-purple-600/80 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            
            {/* Drawer Header */}
            <div className={`p-4 border-b-2 flex items-center justify-between shadow-md ${
              isDark ? 'border-purple-800/80 bg-[#160f2e]' : 'border-purple-200 bg-purple-50'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-800 border-2 border-purple-400/80 flex items-center justify-center text-white shadow-md shadow-purple-950/60">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-black text-base tracking-tight leading-tight ${isDark ? 'text-white' : 'text-purple-950'}`}>
                    Menu & Configurações
                  </h3>
                  <p className={`text-[11px] font-medium ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>Painel de Gestão e Ferramentas</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className={`p-2 rounded-xl border-2 active:scale-95 transition-all shadow-sm ${
                  isDark 
                    ? 'text-purple-200 hover:text-white bg-purple-950/80 border-purple-700/80' 
                    : 'text-slate-700 hover:text-slate-950 bg-white border-slate-300'
                }`}
                title="Fechar Menu"
                aria-label="Fechar Menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* SECTION 1: PERFIL DO SERVIDOR & SEGURANÇA */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                    isDark ? 'text-purple-300' : 'text-purple-950'
                  }`}>
                    <User className="w-3.5 h-3.5 text-purple-600" />
                    <span>Perfil & Acesso</span>
                  </span>
                  {user && (
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${
                      isDark ? 'bg-purple-950 text-purple-300 border-purple-500/50' : 'bg-purple-100 text-purple-900 border-purple-300'
                    }`}>
                      Conectado
                    </span>
                  )}
                </div>

                {user ? (
                  <div className={`border-2 rounded-2xl p-3.5 shadow-md flex flex-col gap-3 ${
                    isDark ? 'bg-[#171030] border-purple-600/70' : 'bg-purple-50/50 border-purple-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="Perfil" className="w-12 h-12 rounded-xl object-cover border-2 border-purple-400 shrink-0" />
                      ) : (
                        <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center font-black text-base shrink-0 shadow-inner ${
                          isDark ? 'bg-purple-950 border-purple-400 text-purple-200' : 'bg-purple-100 border-purple-300 text-purple-800'
                        }`}>
                          {user.displayName ? user.displayName.substring(0, 2).toUpperCase() : 'OP'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className={`text-sm font-black truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{user.displayName || 'Servidor Policial'}</p>
                          {(user.role === 'admin' || user.isAdmin) && (
                            <span className={`px-1.5 py-0.5 border rounded-md text-[9px] font-black ${
                              isDark ? 'bg-amber-950 text-amber-200 border-amber-400' : 'bg-amber-100 text-amber-950 border-amber-300'
                            }`}>
                              ADMIN
                            </span>
                          )}
                        </div>
                        <p className={`text-xs font-medium truncate mt-0.5 ${isDark ? 'text-purple-300' : 'text-purple-800'}`}>{user.cargo || 'Policial Civil'}</p>
                        <p className={`text-[10px] truncate mt-0.5 font-mono ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>{user.unitName || '1ª Delegacia Metropolitana'}</p>
                      </div>
                    </div>

                    {/* Botão de Abrir Configurações do Perfil */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileDrawerOpen(false);
                        onOpenProfileModal();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 border-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-98 cursor-pointer ${
                        isDark 
                          ? 'bg-purple-900/60 hover:bg-purple-800 border-purple-500/60 text-white' 
                          : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Settings className={`w-4 h-4 ${isDark ? 'text-purple-300' : 'text-slate-700'}`} />
                        <span>Configurações do Perfil & Senha</span>
                      </div>
                      <ChevronRight className={`w-4 h-4 ${isDark ? 'text-purple-300' : 'text-slate-600'}`} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileDrawerOpen(false);
                      onOpenAuthModal();
                    }}
                    className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 active:from-purple-500 active:to-indigo-500 text-white rounded-2xl text-xs font-black flex items-center justify-between border-2 border-purple-400/90 shadow-lg shadow-purple-950/80 active:scale-98"
                  >
                    <div className="flex items-center gap-2.5">
                      <LogIn className="w-4 h-4 text-white" />
                      <span>Entrar ou Criar Conta</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-purple-200" />
                  </button>
                )}
              </div>

              {/* SECTION: APARÊNCIA E TEMA (MODO ESCURO / CLARO) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                    isDark ? 'text-purple-300' : 'text-purple-950'
                  }`}>
                    {isDark ? <Moon className="w-3.5 h-3.5 text-purple-400" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                    <span>Aparência do Sistema</span>
                  </span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${
                    isDark ? 'bg-purple-950 text-purple-200 border-purple-500/50' : 'bg-purple-100 text-purple-900 border-purple-300'
                  }`}>
                    {isDark ? 'Modo Escuro' : 'Modo Claro'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      hapticToggle();
                      if (!isDark) toggleTheme();
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all text-left cursor-pointer ${
                      isDark
                        ? 'bg-purple-600 border-purple-300 text-white font-black shadow-md shadow-purple-950'
                        : 'bg-slate-50 border-slate-300 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <Moon className={`w-4 h-4 shrink-0 ${isDark ? 'text-purple-200' : 'text-slate-700'}`} />
                    <div>
                      <div className="text-xs font-bold leading-tight">Modo Escuro</div>
                      <div className="text-[9px] opacity-75">Visual noturno</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      hapticToggle();
                      if (isDark) toggleTheme();
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all text-left cursor-pointer ${
                      !isDark
                        ? 'bg-purple-200 border-purple-500 text-purple-950 font-black shadow-sm'
                        : 'bg-[#15112e] border-purple-700/60 text-purple-200 hover:text-white'
                    }`}
                  >
                    <Sun className={`w-4 h-4 shrink-0 ${!isDark ? 'text-amber-300' : 'text-amber-400'}`} />
                    <div>
                      <div className="text-xs font-bold leading-tight">Modo Claro</div>
                      <div className="text-[9px] opacity-75">Visual claro</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* SECTION 2: MODOS DE VISUALIZAÇÃO DA AGENDA */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                    isDark ? 'text-purple-300' : 'text-purple-950'
                  }`}>
                    <CalendarIcon className="w-3.5 h-3.5 text-purple-600" />
                    <span>Visualização da Agenda</span>
                  </span>
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${
                    isDark ? 'text-amber-300 bg-amber-950/80 border-amber-500/50' : 'text-amber-950 bg-amber-100 border-amber-300'
                  }`}>
                    Mês ⇄ Semana
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Mês */}
                  <button
                    type="button"
                    onClick={() => {
                      hapticSelection();
                      onViewChange('month');
                      setIsMobileDrawerOpen(false);
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all text-left ${
                      currentView === 'month'
                        ? 'bg-purple-600 border-purple-300 text-white font-black shadow-md shadow-purple-950'
                        : isDark
                          ? 'bg-[#15112e] border-purple-700/60 text-purple-200 hover:text-white'
                          : 'bg-slate-50 border-slate-300 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <CalendarIcon className="w-4 h-4" />
                    <div>
                      <div className="text-xs font-bold leading-tight">Visão Mensal</div>
                      <div className="text-[9px] opacity-75">Grade de dias</div>
                    </div>
                  </button>

                  {/* Semana */}
                  <button
                    type="button"
                    onClick={() => {
                      hapticSelection();
                      onViewChange('week');
                      setIsMobileDrawerOpen(false);
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all text-left ${
                      currentView === 'week'
                        ? 'bg-purple-600 border-purple-300 text-white font-black shadow-md shadow-purple-950'
                        : isDark
                          ? 'bg-[#15112e] border-purple-700/60 text-purple-200 hover:text-white'
                          : 'bg-slate-50 border-slate-300 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <Columns className="w-4 h-4" />
                    <div>
                      <div className="text-xs font-bold leading-tight">Visão Semanal</div>
                      <div className="text-[9px] opacity-75">Fluxo da semana</div>
                    </div>
                  </button>

                  {/* Dashboard / Dia */}
                  <button
                    type="button"
                    onClick={() => {
                      hapticSelection();
                      onViewChange('day');
                      setIsMobileDrawerOpen(false);
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all text-left ${
                      currentView === 'day'
                        ? 'bg-purple-600 border-purple-300 text-white font-black shadow-md shadow-purple-950'
                        : isDark
                          ? 'bg-[#15112e] border-purple-700/60 text-purple-200 hover:text-white'
                          : 'bg-slate-50 border-slate-300 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <div>
                      <div className="text-xs font-bold leading-tight">Dashboard</div>
                      <div className="text-[9px] opacity-75">Pauta do dia</div>
                    </div>
                  </button>

                  {/* Lista */}
                  <button
                    type="button"
                    onClick={() => {
                      hapticSelection();
                      onViewChange('list');
                      setIsMobileDrawerOpen(false);
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all text-left ${
                      currentView === 'list'
                        ? 'bg-purple-600 border-purple-300 text-white font-black shadow-md shadow-purple-950'
                        : isDark
                          ? 'bg-[#15112e] border-purple-700/60 text-purple-200 hover:text-white'
                          : 'bg-slate-50 border-slate-300 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <List className="w-4 h-4" />
                    <div>
                      <div className="text-xs font-bold leading-tight">Lista Geral</div>
                      <div className="text-[9px] opacity-75">Todas as oitivas</div>
                    </div>
                  </button>
                </div>

                {/* Helper Tip */}
                <div className={`p-2 rounded-xl border flex items-center gap-2 text-[10px] ${
                  isDark ? 'bg-purple-950/60 border-purple-600/50 text-purple-200' : 'bg-purple-50 border-purple-200 text-purple-950'
                }`}>
                  <ArrowLeftRight className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-amber-300' : 'text-amber-600'}`} />
                  <span>
                    Toque no botão central da barra inferior para alternar diretamente entre <strong>Mês</strong> e <strong>Semana</strong>.
                  </span>
                </div>
              </div>

              {/* SECTION 3: GESTÃO INSTITUCIONAL & CALENDÁRIO */}
              <div className="space-y-2">
                <span className={`text-[11px] font-black uppercase tracking-wider px-1 flex items-center gap-1.5 ${
                  isDark ? 'text-purple-300' : 'text-purple-950'
                }`}>
                  <Sparkles className="w-3.5 h-3.5 text-red-500" />
                  <span>Configurações do Calendário & Equipe</span>
                </span>

                <div className="space-y-2">
                  {/* Feriados & Fins de Semana */}
                  {onOpenHolidaysModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileDrawerOpen(false);
                        onOpenHolidaysModal();
                      }}
                      className={`w-full flex items-center justify-between p-3 border-2 rounded-2xl text-left transition-all active:scale-98 shadow-md ${
                        isDark ? 'bg-[#240c16] hover:bg-[#381020] border-red-500/80' : 'bg-rose-50 hover:bg-rose-100 border-rose-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${
                          isDark ? 'bg-red-950 border-red-400/80 text-red-300' : 'bg-rose-100 border-rose-300 text-rose-700'
                        }`}>
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className={`text-xs font-black ${isDark ? 'text-red-100' : 'text-rose-950'}`}>Feriados & Fins de Semana</h4>
                            {isAdmin && (
                              <span className={`text-[8px] font-black px-1.5 py-0.2 border rounded ${
                                isDark ? 'bg-red-950 text-red-300 border-red-400/60' : 'bg-rose-200 text-rose-950 border-rose-400'
                              }`}>
                                Admin
                              </span>
                            )}
                          </div>
                          <p className={`text-[10px] leading-tight mt-0.5 ${isDark ? 'text-red-300/80' : 'text-rose-800'}`}>
                            Pontos facultativos, feriados municipais/estaduais e plantões
                          </p>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 ${isDark ? 'text-red-400' : 'text-rose-600'}`} />
                    </button>
                  )}

                  {/* Catálogo DPC / OIP */}
                  {onOpenDelegadosModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileDrawerOpen(false);
                        onOpenDelegadosModal();
                      }}
                      className={`w-full flex items-center justify-between p-3 border-2 rounded-2xl text-left transition-all active:scale-98 shadow-md ${
                        isDark ? 'bg-[#15112e] hover:bg-[#201844] border-purple-600/70' : 'bg-purple-50 hover:bg-purple-100 border-purple-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${
                          isDark ? 'bg-purple-950 border-purple-400/80 text-purple-200' : 'bg-purple-100 border-purple-300 text-purple-700'
                        }`}>
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className={`text-xs font-black ${isDark ? 'text-white' : 'text-purple-950'}`}>Catálogo DPC / OIP</h4>
                          <p className={`text-[10px] leading-tight mt-0.5 ${isDark ? 'text-purple-300/80' : 'text-purple-800'}`}>
                            Delegados de polícia e oficiais de cartório da unidade
                          </p>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                    </button>
                  )}
                </div>
              </div>

              {/* SECTION 3: BACKUP & DADOS */}
              <div className="space-y-2">
                <span className={`text-[11px] font-black uppercase tracking-wider px-1 flex items-center gap-1.5 ${
                  isDark ? 'text-purple-300' : 'text-purple-950'
                }`}>
                  <Database className="w-3.5 h-3.5 text-blue-500" />
                  <span>Backup & Sincronização</span>
                </span>

                <div className="space-y-2">
                  {/* Exportar Backup JSON */}
                  {onExportBackup && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileDrawerOpen(false);
                        onExportBackup();
                      }}
                      className={`w-full flex items-center justify-between p-3 border-2 rounded-2xl text-left transition-all active:scale-98 shadow-md ${
                        isDark ? 'bg-[#0d1b38] hover:bg-[#132752] border-blue-500/80' : 'bg-blue-50 hover:bg-blue-100 border-blue-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${
                          isDark ? 'bg-blue-950 border-blue-400/80 text-blue-300' : 'bg-blue-100 border-blue-300 text-blue-700'
                        }`}>
                          <Download className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className={`text-xs font-black ${isDark ? 'text-blue-100' : 'text-blue-950'}`}>Exportar Backup Completo</h4>
                          <p className={`text-[10px] leading-tight mt-0.5 ${isDark ? 'text-blue-300/80' : 'text-blue-800'}`}>
                            Download de segurança em JSON com todas as oitivas cadastradas
                          </p>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                    </button>
                  )}

                  {/* Google Workspace */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileDrawerOpen(false);
                      onOpenWorkspaceModal();
                    }}
                    className={`w-full flex items-center justify-between p-3 border-2 rounded-2xl text-left transition-all active:scale-98 shadow-md ${
                      isDark ? 'bg-[#15112e] hover:bg-[#201844] border-purple-600/70' : 'bg-slate-50 hover:bg-slate-100 border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${
                        isDark ? 'bg-purple-950 border-purple-400/80 text-purple-200' : 'bg-slate-200 border-slate-300 text-slate-700'
                      }`}>
                        <span className={`w-3 h-3 rounded-full ${hasWorkspaceToken ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className={`text-xs font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Google Workspace</h4>
                          <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                            hasWorkspaceToken 
                              ? isDark ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50' : 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                              : isDark ? 'bg-amber-950 text-amber-300 border border-amber-500/50' : 'bg-amber-100 text-amber-950 border border-amber-300'
                          }`}>
                            {hasWorkspaceToken ? 'Conectado' : 'Configurar'}
                          </span>
                        </div>
                        <p className={`text-[10px] leading-tight mt-0.5 ${isDark ? 'text-purple-300/80' : 'text-slate-600'}`}>
                          Google Agenda, Drive e videoconferências
                        </p>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 shrink-0 ${isDark ? 'text-purple-400' : 'text-slate-600'}`} />
                  </button>
                </div>
              </div>

              {/* SECTION 4: IMPRESSÃO & RELATÓRIOS */}
              <div className="space-y-2">
                <span className={`text-[11px] font-black uppercase tracking-wider px-1 flex items-center gap-1.5 ${
                  isDark ? 'text-purple-300' : 'text-purple-950'
                }`}>
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>Impressão de Documentos</span>
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onOpenPrintModal();
                  }}
                  className={`w-full flex items-center justify-between p-3 border-2 rounded-2xl text-left transition-all active:scale-98 shadow-md ${
                    isDark ? 'bg-[#15112e] hover:bg-[#201844] border-purple-600/70' : 'bg-slate-50 hover:bg-slate-100 border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${
                      isDark ? 'bg-purple-950 border-purple-400/80 text-purple-200' : 'bg-slate-200 border-slate-300 text-slate-700'
                    }`}>
                      <Printer className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className={`text-xs font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Imprimir Pauta do Dia</h4>
                      <p className={`text-[10px] leading-tight mt-0.5 ${isDark ? 'text-purple-300/80' : 'text-slate-600'}`}>
                        Relatório formatado pronto para afixação e despacho
                      </p>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 shrink-0 ${isDark ? 'text-purple-400' : 'text-slate-600'}`} />
                </button>
              </div>

            </div>

            {/* Drawer Footer */}
            <div className={`p-4 border-t-2 flex flex-col gap-2 ${
              isDark ? 'border-purple-800/80 bg-[#140e2b]' : 'border-slate-200 bg-slate-50'
            }`}>
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onLogout();
                  }}
                  className={`w-full py-2.5 px-3 border-2 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all active:scale-98 shadow-md ${
                    isDark 
                      ? 'bg-rose-950/80 hover:bg-rose-900 border-rose-500/80 text-rose-200' 
                      : 'bg-rose-100 hover:bg-rose-200 border-rose-300 text-rose-950'
                  }`}
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair da Conta ({user.displayName ? user.displayName.split(' ')[0] : 'Sair'})</span>
                </button>
              ) : (
                <div className="text-center py-1">
                  <span className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Sistema de Agenda de Oitivas Policiais</span>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
};

