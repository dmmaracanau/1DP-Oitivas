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
  UserX
} from 'lucide-react';
import { UserProfile, HearingStatus } from '../types/oitiva';
import { hapticSelection, hapticToggle } from '../utils/haptics';

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
    { id: 'TODOS', label: 'Todas', activeClass: 'bg-purple-600 text-white border-purple-400' },
    { id: 'Agendada', label: 'Agendadas', activeClass: 'bg-amber-950 text-amber-200 border-amber-400' },
    { id: 'Realizada', label: 'Realizadas', activeClass: 'bg-emerald-950 text-emerald-200 border-emerald-400' },
    { id: 'Remarcada', label: 'Remarcadas', activeClass: 'bg-indigo-950 text-indigo-200 border-indigo-400' },
    { id: 'Não Compareceu', label: 'Faltas', activeClass: 'bg-red-950 text-red-200 border-red-400' },
    { id: 'Cancelada', label: 'Canceladas', activeClass: 'bg-zinc-800 text-zinc-300 border-zinc-500' }
  ];

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. TOP HEADER (CLEAN & SPACIOUS ON MOBILE, RICH ON DESKTOP)                */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-30 bg-[#0c0a14]/98 backdrop-blur-md border-b-2 border-purple-700/60 px-2.5 sm:px-4 py-2 sm:py-2.5 transition-colors no-print shadow-xl shadow-purple-950/40">
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
                  <h1 className="font-black text-xs text-white tracking-tight leading-none truncate">
                    Agenda de Oitivas
                  </h1>
                  <span 
                    title={syncStatus === 'connected' ? 'Tempo Real' : syncStatus === 'syncing' ? 'Sincronizando' : 'Offline'}
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      syncStatus === 'connected' ? 'bg-emerald-400 ring-2 ring-emerald-950' : syncStatus === 'syncing' ? 'bg-amber-400 ring-2 ring-amber-950 animate-pulse' : 'bg-zinc-500'
                    }`}
                  />
                </div>
                <p className="text-[10px] text-purple-300 font-medium leading-none mt-0.5 truncate max-w-[160px]">
                  {user?.unitName || '1ª DP Metropolitana'}
                </p>
              </div>
            </div>

            {/* Mobile Actions: Search toggle, + Nova, and Hamburger Menu Button */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Search Toggle */}
              <button
                type="button"
                onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                className={`p-1.5 rounded-xl border-2 transition-all ${
                  isMobileSearchOpen || searchQuery
                    ? 'bg-purple-900/80 border-purple-300 text-white'
                    : 'bg-[#18112b] border-purple-700/60 text-purple-200 hover:text-white'
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
                className="p-1.5 rounded-xl border-2 border-purple-500/80 bg-gradient-to-b from-[#251849] to-[#160d2e] text-purple-200 hover:text-white hover:border-purple-300 active:scale-95 shadow-md shadow-purple-950/70 transition-all flex items-center justify-center"
                title="Abrir Menu e Configurações"
                aria-label="Abrir Menu e Configurações"
              >
                <Menu className="w-4 h-4 text-purple-200" />
              </button>
            </div>

          </div>

          {/* Collapsible Mobile Search & Status Quick Filter Strip */}
          {isMobileSearchOpen && (
            <div className="sm:hidden mt-2 pt-2 border-t border-purple-800/50 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-purple-300" />
                  <input
                    ref={mobileSearchInputRef}
                    type="text"
                    placeholder="Buscar depoente, procedimento, CPF..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    autoFocus
                    className="w-full bg-[#18112b] border-2 border-purple-500 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-purple-300/60 focus:outline-none focus:ring-2 focus:ring-purple-400 shadow-inner"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => onSearchChange('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 hover:text-white"
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
                  className="px-2.5 py-1.5 text-xs font-bold text-purple-300 hover:text-white bg-[#1a1330] border border-purple-700/60 rounded-xl active:scale-95 transition-all"
                >
                  Fechar
                </button>
              </div>

              {/* Quick Status Filters for Mobile Search */}
              {onStatusFilterChange && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  <span className="text-[10px] font-bold text-purple-300/80 shrink-0 uppercase tracking-wider pl-0.5">
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
                            ? `${opt.activeClass} shadow-md shadow-purple-950 font-black scale-105`
                            : 'bg-[#140e24] border-purple-900/50 text-zinc-400 hover:text-zinc-200'
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
                    <h1 className="font-black text-base text-white tracking-tight leading-none">
                      Agenda de Oitivas
                    </h1>
                    <span className="px-2 py-0.5 text-[10px] font-black bg-purple-900/90 text-purple-200 border border-purple-400/60 rounded-md leading-none uppercase tracking-wider">
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
                          ? 'bg-emerald-950 text-emerald-200 border-emerald-400/80'
                          : syncStatus === 'syncing'
                            ? 'bg-amber-950 text-amber-200 border-amber-400/80 animate-pulse'
                            : 'bg-zinc-800 text-zinc-300 border-zinc-600'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${
                        syncStatus === 'connected' ? 'bg-emerald-400' : syncStatus === 'syncing' ? 'bg-amber-400' : 'bg-zinc-500'
                      }`} />
                      <span>{syncStatus === 'connected' ? 'Tempo Real' : syncStatus === 'syncing' ? 'Sincronizando...' : 'Offline'}</span>
                    </span>
                  </div>
                  <p className="text-xs text-purple-200/90 font-medium leading-tight mt-0.5 truncate max-w-[320px]">
                    {user?.unitName || '1ª Delegacia Metropolitana de Maracanaú'}
                  </p>
                </div>
              </div>

              {/* Col 2: Global Search Bar */}
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-300" />
                <input
                  id="global-search-input"
                  type="text"
                  placeholder="Buscar depoente, procedimento, CPF..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full bg-[#171128] border-2 border-purple-600/60 focus:border-purple-300 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-400/50 transition-all shadow-inner"
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 hover:text-white cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Col 3: User Status / Entrar Button */}
              <div className="flex items-center gap-2 shrink-0 ml-auto">
                {user ? (
                  <div className="flex items-center gap-2">
                    <button
                      id="btn-open-my-profile"
                      onClick={onOpenProfileModal}
                      className="flex items-center gap-2 p-1.5 hover:bg-[#1f1638] border-2 border-purple-700/60 hover:border-purple-400 rounded-xl transition-all text-left group cursor-pointer shadow-sm"
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
                          className="w-7 h-7 rounded-lg bg-purple-950 border border-purple-400 flex items-center justify-center text-purple-200 font-bold text-xs group-hover:bg-purple-900 transition-colors"
                        >
                          {user.displayName ? user.displayName.substring(0, 2).toUpperCase() : 'OP'}
                        </div>
                      )}
                      <div className="text-left">
                        <div className="flex items-center gap-1">
                          <p className="text-xs font-bold text-white leading-none max-w-[120px] truncate group-hover:text-purple-300 transition-colors">
                            {user.displayName || 'Servidor'}
                          </p>
                          {(user.role === 'admin' || user.isAdmin) && (
                            <span className="px-1 py-0.2 bg-amber-950 text-amber-200 border border-amber-400 rounded text-[8px] font-black">
                              ADMIN
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-purple-300 leading-none mt-0.5 truncate max-w-[120px] font-medium">
                          {user.cargo || 'Perfil'}
                        </p>
                      </div>
                    </button>

                    <button
                      id="logout-btn"
                      onClick={onLogout}
                      className="p-2 text-zinc-300 hover:text-rose-200 hover:bg-rose-950 border-2 border-purple-900/60 hover:border-rose-500 rounded-xl transition-all cursor-pointer shadow-sm"
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
            <div className="flex items-center justify-between gap-2 pt-1 border-t-2 border-purple-700/40">
              
              {/* Col 1: View Mode Toggles */}
              <div className="flex items-center bg-[#130e24] border-2 border-purple-400 p-1 rounded-2xl gap-1 shadow-lg shadow-purple-950/80">
                <button
                  id="view-mode-month-btn"
                  onClick={() => onViewChange('month')}
                  className={`flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[13px] font-black transition-all cursor-pointer ${
                    currentView === 'month'
                      ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white shadow-md shadow-purple-950 ring-2 ring-purple-300 scale-[1.02]'
                      : 'text-zinc-200 hover:text-white hover:bg-purple-900/60'
                  }`}
                >
                  <CalendarIcon className="w-4 h-4 text-purple-200" />
                  <span>Mês</span>
                </button>

                <button
                  id="view-mode-week-btn"
                  onClick={() => onViewChange('week')}
                  className={`flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[13px] font-black transition-all cursor-pointer ${
                    currentView === 'week'
                      ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white shadow-md shadow-purple-950 ring-2 ring-purple-300 scale-[1.02]'
                      : 'text-zinc-200 hover:text-white hover:bg-purple-900/60'
                  }`}
                >
                  <Columns className="w-4 h-4 text-purple-200" />
                  <span>Semana</span>
                </button>

                <button
                  id="view-mode-day-btn"
                  onClick={() => onViewChange('day')}
                  className={`flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[13px] font-black transition-all cursor-pointer ${
                    currentView === 'day'
                      ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white shadow-md shadow-purple-950 ring-2 ring-purple-300 scale-[1.02]'
                      : 'text-zinc-200 hover:text-white hover:bg-purple-900/60'
                  }`}
                >
                  <Clock className="w-4 h-4 text-purple-200" />
                  <span>Dia</span>
                </button>

                <button
                  id="view-mode-list-btn"
                  onClick={() => onViewChange('list')}
                  className={`flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[13px] font-black transition-all cursor-pointer ${
                    currentView === 'list'
                      ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white shadow-md shadow-purple-950 ring-2 ring-purple-300 scale-[1.02]'
                      : 'text-zinc-200 hover:text-white hover:bg-purple-900/60'
                  }`}
                >
                  <List className="w-4 h-4 text-purple-200" />
                  <span>Lista</span>
                </button>
              </div>

              {/* Col 2: Action Buttons Group */}
              <div className="flex items-center gap-2">
                {/* Google Workspace Button */}
                <button
                  id="google-workspace-nav-btn"
                  onClick={onOpenWorkspaceModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#171228] hover:bg-purple-900/60 text-purple-200 hover:text-white border-2 border-purple-600/70 hover:border-purple-400 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                  title="Google Workspace (Drive, Gmail, Agenda)"
                >
                  <span className={`w-2 h-2 rounded-full ${hasWorkspaceToken ? 'bg-emerald-400 ring-2 ring-emerald-950' : 'bg-amber-400 ring-2 ring-amber-950'}`}></span>
                  <span>Workspace</span>
                </button>

                {/* Delegados & Oficiais Button */}
                {onOpenDelegadosModal && (
                  <button
                    id="delegados-nav-btn"
                    onClick={onOpenDelegadosModal}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#171228] hover:bg-purple-900/60 text-purple-200 hover:text-white border-2 border-purple-600/70 hover:border-purple-400 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                    title="Catálogo de Autoridades & Oficiais Policiais (DPC / OIP)"
                  >
                    <Shield className="w-3.5 h-3.5 text-purple-300" />
                    <span>DPC / OIP</span>
                  </button>
                )}

                {/* Admin Feriados Button */}
                {isAdmin && onOpenHolidaysModal && (
                  <button
                    id="admin-holidays-nav-btn"
                    onClick={onOpenHolidaysModal}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2a0c16] hover:bg-[#3d1220] text-red-300 hover:text-white border-2 border-red-500/80 hover:border-red-400 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                    title="Gerenciar Feriados e Fins de Semana (Admin)"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-red-400" />
                    <span>Feriados</span>
                  </button>
                )}

                {/* Print Pauta Button */}
                <button
                  id="print-pauta-btn"
                  onClick={onOpenPrintModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#171228] hover:bg-[#251e3d] text-zinc-100 hover:text-white border-2 border-purple-600/70 hover:border-purple-400 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                  title="Imprimir Pauta Oficial de Oitivas"
                >
                  <Printer className="w-3.5 h-3.5 text-purple-300" />
                  <span>Pauta do Dia</span>
                </button>

                {/* Exportar Backup Button */}
                {onExportBackup && (
                  <button
                    id="export-backup-nav-btn"
                    onClick={onExportBackup}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#121a36] hover:bg-[#1a2754] text-blue-200 hover:text-white border-2 border-blue-500/70 hover:border-blue-400 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                    title="Exportar Backup das Oitivas (Download JSON)"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-300" />
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
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d091b]/98 backdrop-blur-xl border-t-2 border-purple-700/60 shadow-2xl px-4 py-1.5 flex items-center justify-around no-print pb-safe"
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
              : 'text-purple-300/80 hover:text-white font-medium'
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
          className={`flex flex-col items-center justify-center py-1.5 px-4 rounded-xl transition-all min-w-[72px] min-h-[44px] ${
            (currentView === 'month' || currentView === 'week') && !isMobileSearchOpen
              ? 'bg-gradient-to-b from-purple-600 to-indigo-700 text-white shadow-md shadow-purple-950 ring-1 ring-purple-300 font-black scale-105'
              : 'text-purple-300/80 hover:text-white font-medium'
          }`}
          title="Alternar entre visão Mensal e Semanal"
        >
          <CalendarIcon className="w-4 h-4" />
          <span className="text-[10px] mt-0.5 leading-none">
            {currentView === 'week' ? 'Semana' : 'Mês'}
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
              : 'text-purple-300/80 hover:text-white font-medium'
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
        <div className="sm:hidden fixed inset-0 z-50 flex justify-end bg-black/85 backdrop-blur-md no-print animate-in fade-in duration-200">
          <div className="w-full max-w-full sm:max-w-md h-full bg-[#0e0a1d] border-l-2 border-purple-600/80 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            
            {/* Drawer Header */}
            <div className="p-4 border-b-2 border-purple-800/80 bg-[#160f2e] flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-800 border-2 border-purple-400/80 flex items-center justify-center text-white shadow-md shadow-purple-950/60">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base tracking-tight leading-tight">
                    Menu & Configurações
                  </h3>
                  <p className="text-[11px] text-purple-300 font-medium">Painel de Gestão e Ferramentas</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-2 rounded-xl text-purple-200 hover:text-white bg-purple-950/80 border-2 border-purple-700/80 active:scale-95 transition-all shadow-sm"
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
                  <span className="text-[11px] font-black text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-purple-400" />
                    <span>Perfil & Acesso</span>
                  </span>
                  {user && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-purple-950 text-purple-300 border border-purple-500/50">
                      Conectado
                    </span>
                  )}
                </div>

                {user ? (
                  <div className="bg-[#171030] border-2 border-purple-600/70 rounded-2xl p-3.5 shadow-md flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="Perfil" className="w-12 h-12 rounded-xl object-cover border-2 border-purple-400 shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-purple-950 border-2 border-purple-400 flex items-center justify-center text-purple-200 font-black text-base shrink-0 shadow-inner">
                          {user.displayName ? user.displayName.substring(0, 2).toUpperCase() : 'OP'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-black text-white truncate">{user.displayName || 'Servidor Policial'}</p>
                          {(user.role === 'admin' || user.isAdmin) && (
                            <span className="px-1.5 py-0.5 bg-amber-950 text-amber-200 border border-amber-400 rounded-md text-[9px] font-black">
                              ADMIN
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-purple-300 font-medium truncate mt-0.5">{user.cargo || 'Policial Civil'}</p>
                        <p className="text-[10px] text-zinc-400 truncate mt-0.5 font-mono">{user.unitName || '1ª Delegacia Metropolitana'}</p>
                      </div>
                    </div>

                    {/* Botão de Abrir Configurações do Perfil */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileDrawerOpen(false);
                        onOpenProfileModal();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 bg-purple-900/60 hover:bg-purple-800 border-2 border-purple-500/60 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-98 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4 text-purple-300" />
                        <span>Configurações do Perfil & Senha</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-purple-300" />
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

              {/* SECTION 2: GESTÃO INSTITUCIONAL & CALENDÁRIO */}
              <div className="space-y-2">
                <span className="text-[11px] font-black text-purple-300 uppercase tracking-wider px-1 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-red-400" />
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
                      className="w-full flex items-center justify-between p-3 bg-[#240c16] hover:bg-[#381020] border-2 border-red-500/80 rounded-2xl text-left transition-all active:scale-98 shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-red-950 border border-red-400/80 flex items-center justify-center text-red-300 shrink-0">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-black text-red-100">Feriados & Fins de Semana</h4>
                            {isAdmin && (
                              <span className="text-[8px] font-black px-1.5 py-0.2 bg-red-950 text-red-300 border border-red-400/60 rounded">
                                Admin
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-red-300/80 leading-tight mt-0.5">
                            Pontos facultativos, feriados municipais/estaduais e plantões
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-red-400 shrink-0" />
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
                      className="w-full flex items-center justify-between p-3 bg-[#15112e] hover:bg-[#201844] border-2 border-purple-600/70 rounded-2xl text-left transition-all active:scale-98 shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-purple-950 border border-purple-400/80 flex items-center justify-center text-purple-200 shrink-0">
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-white">Catálogo DPC / OIP</h4>
                          <p className="text-[10px] text-purple-300/80 leading-tight mt-0.5">
                            Delegados de polícia e oficiais de cartório da unidade
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-purple-400 shrink-0" />
                    </button>
                  )}
                </div>
              </div>

              {/* SECTION 3: BACKUP & DADOS */}
              <div className="space-y-2">
                <span className="text-[11px] font-black text-purple-300 uppercase tracking-wider px-1 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-blue-400" />
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
                      className="w-full flex items-center justify-between p-3 bg-[#0d1b38] hover:bg-[#132752] border-2 border-blue-500/80 rounded-2xl text-left transition-all active:scale-98 shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-950 border border-blue-400/80 flex items-center justify-center text-blue-300 shrink-0">
                          <Download className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-blue-100">Exportar Backup Completo</h4>
                          <p className="text-[10px] text-blue-300/80 leading-tight mt-0.5">
                            Download de segurança em JSON com todas as oitivas cadastradas
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-blue-400 shrink-0" />
                    </button>
                  )}

                  {/* Google Workspace */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileDrawerOpen(false);
                      onOpenWorkspaceModal();
                    }}
                    className="w-full flex items-center justify-between p-3 bg-[#15112e] hover:bg-[#201844] border-2 border-purple-600/70 rounded-2xl text-left transition-all active:scale-98 shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-purple-950 border border-purple-400/80 flex items-center justify-center text-purple-200 shrink-0">
                        <span className={`w-3 h-3 rounded-full ${hasWorkspaceToken ? 'bg-emerald-400 ring-2 ring-emerald-950' : 'bg-amber-400 ring-2 ring-amber-950'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-black text-white">Google Workspace</h4>
                          <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                            hasWorkspaceToken ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50' : 'bg-amber-950 text-amber-300 border border-amber-500/50'
                          }`}>
                            {hasWorkspaceToken ? 'Conectado' : 'Configurar'}
                          </span>
                        </div>
                        <p className="text-[10px] text-purple-300/80 leading-tight mt-0.5">
                          Google Agenda, Drive e videoconferências
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-purple-400 shrink-0" />
                  </button>
                </div>
              </div>

              {/* SECTION 4: IMPRESSÃO & RELATÓRIOS */}
              <div className="space-y-2">
                <span className="text-[11px] font-black text-purple-300 uppercase tracking-wider px-1 flex items-center gap-1.5">
                  <Printer className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Impressão de Documentos</span>
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onOpenPrintModal();
                  }}
                  className="w-full flex items-center justify-between p-3 bg-[#15112e] hover:bg-[#201844] border-2 border-purple-600/70 rounded-2xl text-left transition-all active:scale-98 shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-950 border border-purple-400/80 flex items-center justify-center text-purple-200 shrink-0">
                      <Printer className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white">Imprimir Pauta do Dia</h4>
                      <p className="text-[10px] text-purple-300/80 leading-tight mt-0.5">
                        Relatório formatado pronto para afixação e despacho
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-purple-400 shrink-0" />
                </button>
              </div>

            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t-2 border-purple-800/80 bg-[#140e2b] flex flex-col gap-2">
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onLogout();
                  }}
                  className="w-full py-2.5 px-3 bg-rose-950/80 hover:bg-rose-900 border-2 border-rose-500/80 text-rose-200 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all active:scale-98 shadow-md"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair da Conta ({user.displayName ? user.displayName.split(' ')[0] : 'Sair'})</span>
                </button>
              ) : (
                <div className="text-center py-1">
                  <span className="text-[11px] text-zinc-400">Sistema de Agenda de Oitivas Policiais</span>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
};

