import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { StatsBar } from './components/StatsBar';
import { CalendarMonthView } from './components/CalendarMonthView';
import { CalendarWeekView } from './components/CalendarWeekView';
import { CalendarDayView } from './components/CalendarDayView';
import { OitivaListView } from './components/OitivaListView';
import { OitivaModal } from './components/OitivaModal';
import { OitivaDetailModal } from './components/OitivaDetailModal';
import { PrintPautaModal } from './components/PrintPautaModal';
import { PrintIntimacaoModal } from './components/PrintIntimacaoModal';
import { WhatsAppShareModal } from './components/WhatsAppShareModal';
import { AuthModal } from './components/AuthModal';
import { GoogleWorkspaceModal } from './components/GoogleWorkspaceModal';
import { UserProfileModal } from './components/UserProfileModal';
import { DelegadoSelectorModal } from './components/DelegadoSelectorModal';
import { HolidaysModal } from './components/HolidaysModal';
import { oitivaService } from './services/oitivaService';
import { authService } from './services/authService';
import { calendarService } from './services/calendarService';
import { driveService } from './services/driveService';
import { specialDateService } from './services/specialDateService';
import { backupService } from './services/backupService';
import { Oitiva, HearingStatus, UserProfile, CalendarSpecialDate } from './types/oitiva';
import { formatDateBR } from './utils/formatters';
import { CheckCircle2, Shield, AlertCircle, Info } from 'lucide-react';

export default function App() {
  // State
  const [oitivas, setOitivas] = useState<Oitiva[]>([]);
  const [specialDates, setSpecialDates] = useState<CalendarSpecialDate[]>([]);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  // Default view: 'month' on desktop (>= 768px), 'week' on mobile (< 768px)
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768 ? 'month' : 'week';
    }
    return 'month';
  });
  const [userSelectedView, setUserSelectedView] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<HearingStatus | 'TODOS'>('TODOS');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // User Session
  const [user, setUser] = useState<UserProfile | null>(null);
  const [hasWorkspaceToken, setHasWorkspaceToken] = useState<boolean>(authService.hasGoogleWorkspaceAccess());
  const [syncStatus, setSyncStatus] = useState<'connected' | 'syncing' | 'offline'>('syncing');

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isPrintIntimacaoModalOpen, setIsPrintIntimacaoModalOpen] = useState<boolean>(false);
  const [selectedOitivaForIntimacao, setSelectedOitivaForIntimacao] = useState<Oitiva | null>(null);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState<boolean>(false);
  const [selectedOitivaForWhatsApp, setSelectedOitivaForWhatsApp] = useState<Oitiva | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState<boolean>(false);
  const [isDelegadosModalOpen, setIsDelegadosModalOpen] = useState<boolean>(false);
  const [isHolidaysModalOpen, setIsHolidaysModalOpen] = useState<boolean>(false);
  const [selectedDateForHolidays, setSelectedDateForHolidays] = useState<string | undefined>(undefined);
  const [workspaceInitialTab, setWorkspaceInitialTab] = useState<'calendar' | 'gmail' | 'drive'>('calendar');
  const [selectedOitivaForWorkspace, setSelectedOitivaForWorkspace] = useState<Oitiva | null>(null);
  
  const [selectedOitiva, setSelectedOitiva] = useState<Oitiva | null>(null);
  const [editingOitiva, setEditingOitiva] = useState<Oitiva | null>(null);
  const [defaultModalDate, setDefaultModalDate] = useState<string>('');

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Auth observer
  useEffect(() => {
    const unsubAuth = authService.onAuthChange((currentUser) => {
      setUser(currentUser);
      setHasWorkspaceToken(authService.hasGoogleWorkspaceAccess());
    });
    return () => unsubAuth();
  }, []);

  // Oitivas real-time listener isolado por usuário no Firestore e Realtime Database
  useEffect(() => {
    const activeUid = user?.uid || 'guest_user';
    const unsubOitivas = oitivaService.subscribe(
      activeUid,
      (list) => {
        setOitivas(list);
      },
      (err) => {
        console.warn("Realtime Firestore notice:", err);
      },
      (status) => {
        setSyncStatus(status);
      }
    );
    return () => unsubOitivas();
  }, [user?.uid]);

  // Special Dates real-time listener (Feriados e Fins de Semana no Firestore e RTDB)
  useEffect(() => {
    const unsubSpecial = specialDateService.subscribe(
      (list) => {
        setSpecialDates(list);
      },
      (err) => {
        console.warn('Special dates sync notice:', err);
      }
    );
    return () => unsubSpecial();
  }, []);

  // DLP: Auto-snapshot contínuo de segurança a cada alteração relevante
  useEffect(() => {
    if (oitivas.length > 0) {
      const timer = setTimeout(() => {
        backupService.createLocalSnapshot(
          oitivas,
          'Auto-Save Contínuo de Segurança',
          user?.uid || 'guest_default',
          specialDates
        );
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [oitivas, user?.uid, specialDates]);

  // DLP: Proteção de Perda de Dados contra fechamento acidental da aba enquanto edita
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isNewModalOpen || editingOitiva) {
        e.preventDefault();
        e.returnValue = 'Você possui informações de oitiva não salvas. Deseja realmente sair?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isNewModalOpen, editingOitiva]);

  // DLP: Monitoramento de conectividade em tempo real com auto-recuperação
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus('connected');
      showToast('Conexão restabelecida! Banco de dados sincronizado.', 'success');
    };
    const handleOffline = () => {
      setSyncStatus('offline');
      showToast('Sem conexão com a internet. O modo offline seguro com auto-save está ativo.', 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isAdmin = specialDateService.isUserAdmin(user);

  const handleOpenHolidaysModal = (dateStr?: string) => {
    setSelectedDateForHolidays(dateStr);
    setIsHolidaysModalOpen(true);
  };

  // View Change Handler
  const handleViewChange = (view: 'month' | 'week' | 'day' | 'list') => {
    setUserSelectedView(true);
    setCurrentView(view);
  };

  // DLP: Responsive default view adaptation (Desktop: month, Mobile: week)
  useEffect(() => {
    const handleResize = () => {
      // If user has not manually clicked/selected a specific view mode, adapt intelligently to screen size
      if (!userSelectedView) {
        const isDesktop = window.innerWidth >= 768;
        setCurrentView(isDesktop ? 'month' : 'week');
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [userSelectedView]);

  // Handlers
  const handleAddOitivaForDate = (dateStr: string) => {
    setDefaultModalDate(dateStr);
    setEditingOitiva(null);
    setIsNewModalOpen(true);
  };

  const handleOpenNewModal = () => {
    setDefaultModalDate(new Date().toISOString().split('T')[0]);
    setEditingOitiva(null);
    setIsNewModalOpen(true);
  };

  const handleSelectOitiva = (oitiva: Oitiva) => {
    setSelectedOitiva(oitiva);
    setIsDetailModalOpen(true);
  };

  const handleOpenPrintIntimacao = (oitiva: Oitiva) => {
    setSelectedOitivaForIntimacao(oitiva);
    setIsPrintIntimacaoModalOpen(true);
  };

  const handleOpenWhatsApp = (oitiva: Oitiva) => {
    setSelectedOitivaForWhatsApp(oitiva);
    setIsWhatsAppModalOpen(true);
  };

  const handleEditOitiva = (oitiva: Oitiva) => {
    setEditingOitiva(oitiva);
    setIsDetailModalOpen(false);
    setIsNewModalOpen(true);
  };

  const handleSaveOitiva = async (data: Omit<Oitiva, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const currentUid = user?.uid || 'cartorio_maracanau';
      if (editingOitiva) {
        await oitivaService.update(editingOitiva.id, {
          ...data,
          uid: editingOitiva.uid || currentUid
        }, currentUid);
        showToast(`Oitiva de "${data.personName}" atualizada com sucesso!`);
        if (selectedOitiva && selectedOitiva.id === editingOitiva.id) {
          setSelectedOitiva({ ...editingOitiva, ...data, uid: editingOitiva.uid || currentUid, updatedAt: Date.now() });
        }
      } else {
        await oitivaService.create({
          ...data,
          uid: currentUid,
          createdBy: user?.displayName || user?.email || 'Cartório de Oitivas'
        }, currentUid);
        showToast(`Oitiva de "${data.personName}" agendada com sucesso!`);
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar oitiva.', 'error');
    }
  };

  const handleDeleteOitiva = async (id: string) => {
    try {
      await oitivaService.delete(id, user?.uid);
      showToast('Oitiva removida do sistema.', 'info');
      setIsDetailModalOpen(false);
    } catch (err: any) {
      showToast('Erro ao remover oitiva.', 'error');
    }
  };

  const handleStatusChange = async (id: string, newStatus: HearingStatus) => {
    // 1. Atualização otimista imediata na memória para feedback instantâneo (0ms de atraso percebido)
    setOitivas(prev => prev.map(o => o.id === id ? { ...o, status: newStatus, updatedAt: Date.now() } : o));
    if (selectedOitiva && selectedOitiva.id === id) {
      setSelectedOitiva(prev => prev ? { ...prev, status: newStatus, updatedAt: Date.now() } : null);
    }
    showToast(`Status atualizado para "${newStatus}".`);

    try {
      await oitivaService.update(id, { status: newStatus }, user?.uid);
    } catch (err: any) {
      showToast('Erro ao persistir status na nuvem.', 'error');
    }
  };

  const handleMoveOitivaDate = async (oitivaId: string, newDate: string) => {
    const oitiva = oitivas.find(o => o.id === oitivaId);
    if (!oitiva) return;
    if (oitiva.date === newDate) return;

    // Atualização otimista imediata
    setOitivas(prev => prev.map(o => o.id === oitivaId ? { ...o, date: newDate, updatedAt: Date.now() } : o));
    if (selectedOitiva && selectedOitiva.id === oitivaId) {
      setSelectedOitiva(prev => prev ? { ...prev, date: newDate, updatedAt: Date.now() } : null);
    }
    showToast(`Oitiva transferida para ${formatDateBR(newDate)}!`);

    try {
      await oitivaService.updateDate(oitivaId, newDate, user?.uid);
    } catch (err: any) {
      showToast(err.message || 'Erro ao mover data da oitiva.', 'error');
    }
  };

  const handleRescheduleOitiva = async (oitivaId: string, newDate: string, newTime: string, reason?: string) => {
    const oitiva = oitivas.find(o => o.id === oitivaId);
    if (!oitiva) return;

    // Atualização otimista imediata
    setOitivas(prev => prev.map(o => o.id === oitivaId ? { ...o, date: newDate, time: newTime, status: 'Remarcada', updatedAt: Date.now() } : o));
    if (selectedOitiva && selectedOitiva.id === oitivaId) {
      setSelectedOitiva(prev => prev ? { ...prev, date: newDate, time: newTime, status: 'Remarcada', updatedAt: Date.now() } : null);
    }
    showToast(`Oitiva de "${oitiva.personName}" remarcada para ${formatDateBR(newDate)} às ${newTime}h!`);

    try {
      await oitivaService.reschedule(oitivaId, newDate, newTime, reason, user?.uid);
    } catch (err: any) {
      showToast(err.message || 'Erro ao remarcar oitiva.', 'error');
    }
  };

  const handleUpdateOitivaDirect = async (id: string, updates: Partial<Oitiva>) => {
    // Atualização otimista imediata
    setOitivas(prev => prev.map(o => o.id === id ? { ...o, ...updates, updatedAt: Date.now() } : o));
    if (selectedOitiva && selectedOitiva.id === id) {
      setSelectedOitiva(prev => prev ? { ...prev, ...updates, updatedAt: Date.now() } : null);
    }

    try {
      await oitivaService.update(id, updates, user?.uid);
    } catch (err: any) {
      console.error('Erro ao atualizar oitiva:', err);
    }
  };

  const handleToggleIntimationSent = async (id: string, nextVal: boolean) => {
    // Atualização otimista instantânea
    setOitivas(prev => prev.map(o => o.id === id ? { ...o, intimationSent: nextVal, updatedAt: Date.now() } : o));
    if (selectedOitiva && selectedOitiva.id === id) {
      setSelectedOitiva(prev => prev ? { ...prev, intimationSent: nextVal, updatedAt: Date.now() } : null);
    }
    showToast(nextVal ? 'Intimação marcada como ENVIADA!' : 'Intimação marcada como PENDENTE.');

    try {
      await oitivaService.update(id, { intimationSent: nextVal }, user?.uid);
    } catch (e) {
      showToast('Erro ao atualizar status da intimação.', 'error');
    }
  };

  const handleClearPersonHistory = async (personName: string, cpf?: string) => {
    try {
      await oitivaService.clearPersonHistory(personName, cpf, user?.uid);
      showToast(`Histórico de "${personName}" limpo com sucesso!`);
      // Forçar atualização do modal se estiver aberto
      if (selectedOitiva) {
        setSelectedOitiva(prev => prev ? { ...prev, history: [] } : null);
      }
    } catch (err: any) {
      showToast('Erro ao limpar histórico da pessoa.', 'error');
    }
  };

  // Google Workspace Direct Actions
  const handleOpenWorkspace = (tab: 'calendar' | 'gmail' | 'drive' = 'calendar', oitiva?: Oitiva) => {
    setWorkspaceInitialTab(tab);
    if (oitiva) {
      setSelectedOitivaForWorkspace(oitiva);
    }
    setIsWorkspaceModalOpen(true);
  };

  const handleDirectSyncCalendar = async (oitiva: Oitiva) => {
    const token = authService.getAccessToken();
    if (!token) {
      handleOpenWorkspace('calendar', oitiva);
      return;
    }
    try {
      if (oitiva.googleCalendarEventId) {
        await calendarService.updateEvent(token, oitiva.googleCalendarEventId, oitiva);
        showToast(`Evento de "${oitiva.personName}" atualizado no Google Calendar!`);
      } else {
        const created = await calendarService.createEvent(token, oitiva);
        await handleUpdateOitivaDirect(oitiva.id, { googleCalendarEventId: created.id });
        showToast(`Oitiva de "${oitiva.personName}" adicionada à Google Agenda!`);
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao sincronizar com Google Agenda.', 'error');
    }
  };

  const handleDirectSaveDrive = async (oitiva: Oitiva) => {
    const token = authService.getAccessToken();
    if (!token) {
      handleOpenWorkspace('drive', oitiva);
      return;
    }
    try {
      const file = await driveService.saveOitivaTermToDrive(token, oitiva);
      await handleUpdateOitivaDirect(oitiva.id, {
        googleDriveDocId: file.id,
        googleDriveDocUrl: file.webViewLink
      });
      showToast(`Termo de "${oitiva.personName}" salvo no Google Drive com sucesso!`);
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar termo no Google Drive.', 'error');
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
    setHasWorkspaceToken(false);
    showToast('Sessão encerrada com sucesso.', 'info');
  };

  const handleExportBackup = () => {
    try {
      backupService.exportBackup(oitivas, user, specialDates);
      showToast('Backup JSON gerado com integridade e audit trail!');
    } catch (err: any) {
      showToast(err.message || 'Erro ao exportar backup.', 'error');
    }
  };

  // Filter oitivas by search query if any
  const displayedOitivas = oitivas.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.personName.toLowerCase().includes(q) ||
      (item.procedureNumber && item.procedureNumber.toLowerCase().includes(q)) ||
      (item.cpf && item.cpf.includes(q)) ||
      (item.phone && item.phone.includes(q)) ||
      (item.officerName && item.officerName.toLowerCase().includes(q)) ||
      (item.role && item.role.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-[#09080E] text-zinc-100 flex flex-col selection:bg-purple-500 selection:text-white">
      
      {/* Top Navigation */}
      <Navbar
        currentView={currentView}
        onViewChange={handleViewChange}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenNewModal={handleOpenNewModal}
        onOpenPrintModal={() => setIsPrintModalOpen(true)}
        onOpenWorkspaceModal={() => handleOpenWorkspace('calendar')}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onOpenDelegadosModal={() => setIsDelegadosModalOpen(true)}
        onOpenHolidaysModal={() => handleOpenHolidaysModal()}
        onExportBackup={handleExportBackup}
        isAdmin={isAdmin}
        hasWorkspaceToken={hasWorkspaceToken}
        syncStatus={syncStatus}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-1 w-full">
        {/* Quick summary stats & filter bar (Separado por Mês de Visualização) */}
        <StatsBar
          oitivas={oitivas}
          currentDate={currentDate}
          selectedStatusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />

        {/* Dynamic Views */}
        {currentView === 'month' && (
          <CalendarMonthView
            oitivas={displayedOitivas}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            onSelectOitiva={handleSelectOitiva}
            onAddOitivaForDate={handleAddOitivaForDate}
            onQuickStatusChange={handleStatusChange}
            onToggleIntimationSent={handleToggleIntimationSent}
            onOpenWhatsApp={handleOpenWhatsApp}
            onMoveOitivaDate={handleMoveOitivaDate}
            statusFilter={statusFilter}
            specialDates={specialDates}
            onOpenHolidaysModal={handleOpenHolidaysModal}
            isAdmin={isAdmin}
          />
        )}

        {currentView === 'week' && (
          <CalendarWeekView
            oitivas={displayedOitivas}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            onSelectOitiva={handleSelectOitiva}
            onAddOitivaForDate={handleAddOitivaForDate}
            onQuickStatusChange={handleStatusChange}
            onToggleIntimationSent={handleToggleIntimationSent}
            onOpenWhatsApp={handleOpenWhatsApp}
            onMoveOitivaDate={handleMoveOitivaDate}
            statusFilter={statusFilter}
            specialDates={specialDates}
            onOpenHolidaysModal={handleOpenHolidaysModal}
            isAdmin={isAdmin}
          />
        )}

        {currentView === 'day' && (
          <CalendarDayView
            oitivas={displayedOitivas}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            onSelectOitiva={handleSelectOitiva}
            onAddOitivaForDate={handleAddOitivaForDate}
            onQuickStatusChange={handleStatusChange}
            onToggleIntimationSent={handleToggleIntimationSent}
            onOpenWhatsApp={handleOpenWhatsApp}
            statusFilter={statusFilter}
            specialDates={specialDates}
            onOpenHolidaysModal={handleOpenHolidaysModal}
            isAdmin={isAdmin}
          />
        )}

        {currentView === 'list' && (
          <OitivaListView
            oitivas={oitivas}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectOitiva={handleSelectOitiva}
            onEditOitiva={handleEditOitiva}
            onDeleteOitiva={handleDeleteOitiva}
            onPrintIntimacao={handleOpenPrintIntimacao}
            onOpenWhatsApp={handleOpenWhatsApp}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            onAddOitiva={handleOpenNewModal}
            onExportBackup={handleExportBackup}
          />
        )}
      </main>

      {/* Modals */}
      <OitivaModal
        isOpen={isNewModalOpen}
        onClose={() => {
          setIsNewModalOpen(false);
          setEditingOitiva(null);
        }}
        onSave={handleSaveOitiva}
        initialData={editingOitiva}
        defaultDate={defaultModalDate}
        user={user}
      />

      <OitivaDetailModal
        oitiva={selectedOitiva}
        allOitivas={oitivas}
        user={user}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedOitiva(null);
        }}
        onEdit={handleEditOitiva}
        onDelete={handleDeleteOitiva}
        onStatusChange={handleStatusChange}
        onReschedule={handleRescheduleOitiva}
        onClearPersonHistory={handleClearPersonHistory}
        onToggleIntimationSent={handleToggleIntimationSent}
        onOpenPrint={() => setIsPrintModalOpen(true)}
        onOpenPrintIntimacao={() => {
          if (selectedOitiva) {
            handleOpenPrintIntimacao(selectedOitiva);
          }
        }}
        onOpenWhatsApp={handleOpenWhatsApp}
        onSyncCalendar={handleDirectSyncCalendar}
        onSendGmail={(o) => handleOpenWorkspace('gmail', o)}
        onSaveDrive={handleDirectSaveDrive}
      />

      <PrintIntimacaoModal
        isOpen={isPrintIntimacaoModalOpen}
        onClose={() => {
          setIsPrintIntimacaoModalOpen(false);
          setSelectedOitivaForIntimacao(null);
        }}
        oitiva={selectedOitivaForIntimacao}
        user={user}
        onMarkIntimationSent={async (oitivaId) => {
          try {
            await handleUpdateOitivaDirect(oitivaId, { intimationSent: true });
            showToast('Intimação marcada como emitida!');
          } catch (e) {
            console.error('Erro ao atualizar status da intimação:', e);
          }
        }}
      />

      <WhatsAppShareModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => {
          setIsWhatsAppModalOpen(false);
          setSelectedOitivaForWhatsApp(null);
        }}
        oitiva={selectedOitivaForWhatsApp}
        user={user}
        onMarkIntimationSent={async (oitivaId) => {
          try {
            await handleUpdateOitivaDirect(oitivaId, { intimationSent: true });
            showToast('Intimação via WhatsApp enviada!');
          } catch (e) {
            console.error('Erro ao atualizar status da intimação:', e);
          }
        }}
      />

      <PrintPautaModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        oitivas={oitivas}
        currentDate={currentDate}
        onOpenWorkspaceWithPauta={(tab) => handleOpenWorkspace(tab)}
      />

      <GoogleWorkspaceModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => {
          setIsWorkspaceModalOpen(false);
          setSelectedOitivaForWorkspace(null);
          setHasWorkspaceToken(authService.hasGoogleWorkspaceAccess());
        }}
        oitivas={oitivas}
        currentDate={currentDate}
        onUpdateOitiva={handleUpdateOitivaDirect}
        onShowToast={showToast}
        initialTab={workspaceInitialTab}
        selectedOitivaForAction={selectedOitivaForWorkspace}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(u) => {
          setUser(u);
          setHasWorkspaceToken(authService.hasGoogleWorkspaceAccess());
          showToast(`Conectado como ${u.displayName || u.email}!`);
        }}
      />

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        oitivas={oitivas}
        specialDates={specialDates}
        onDataRestored={async () => {
          const list = await oitivaService.getAll(user?.uid);
          setOitivas(list);
        }}
        onUpdateProfile={(updatedUser) => {
          setUser(updatedUser);
          setHasWorkspaceToken(authService.hasGoogleWorkspaceAccess());
          showToast('Perfil atualizado com sucesso!');
        }}
        onOpenWorkspaceModal={() => {
          setIsProfileModalOpen(false);
          handleOpenWorkspace('calendar');
        }}
        onOpenDelegadosModal={() => {
          setIsProfileModalOpen(false);
          setIsDelegadosModalOpen(true);
        }}
      />

      {/* Global Catálogo Unificado de Delegados (DPC) */}
      <DelegadoSelectorModal
        isOpen={isDelegadosModalOpen}
        onClose={() => setIsDelegadosModalOpen(false)}
        user={user}
        onSelectDelegado={(del) => {
          showToast(`Delegado(a) ${del.nome} selecionado(a)!`, 'info');
        }}
      />

      {/* Gestão de Feriados e Fins de Semana (Exclusivo Administrador) */}
      <HolidaysModal
        isOpen={isHolidaysModalOpen}
        onClose={() => {
          setIsHolidaysModalOpen(false);
          setSelectedDateForHolidays(undefined);
        }}
        user={user}
        specialDates={specialDates}
        initialDate={selectedDateForHolidays}
        onShowToast={showToast}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-in flex items-center gap-3 bg-[#191428] border border-purple-500/50 text-white px-4 py-3 rounded-2xl shadow-2xl shadow-purple-950/80 no-print">
          {toastMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          {toastMessage.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          {toastMessage.type === 'info' && <Info className="w-5 h-5 text-purple-400 shrink-0" />}
          <span className="text-xs font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-purple-900/30 bg-[#0a0812] py-4 text-center text-xs text-zinc-500 no-print">
        <div className="w-full max-w-[98.5%] 2xl:max-w-[1920px] mx-auto px-2 sm:px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-purple-400" />
            <span>Sistema de Agenda de Oitivas • Delegacia Metropolitana de Maracanaú</span>
          </p>
          <p className="text-[11px] text-purple-400/70 font-mono">
            Google Workspace (Drive • Gmail • Calendar) • {oitivas.length} registros ativos
          </p>
        </div>
      </footer>

    </div>
  );
}
