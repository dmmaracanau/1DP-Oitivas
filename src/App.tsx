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
import { AuthModal } from './components/AuthModal';
import { GoogleWorkspaceModal } from './components/GoogleWorkspaceModal';
import { UserProfileModal } from './components/UserProfileModal';
import { oitivaService } from './services/oitivaService';
import { authService } from './services/authService';
import { calendarService } from './services/calendarService';
import { driveService } from './services/driveService';
import { Oitiva, HearingStatus, UserProfile } from './types/oitiva';
import { CheckCircle2, Shield, AlertCircle, Info } from 'lucide-react';

export default function App() {
  // State
  const [oitivas, setOitivas] = useState<Oitiva[]>([]);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day' | 'list'>('month');
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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState<boolean>(false);
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

  // Oitivas real-time listener restrito ao UID do usuário autenticado
  useEffect(() => {
    if (!user?.uid) {
      setOitivas([]);
      setSyncStatus('connected');
      return;
    }

    const unsubOitivas = oitivaService.subscribe(
      user.uid,
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

  const handleEditOitiva = (oitiva: Oitiva) => {
    setEditingOitiva(oitiva);
    setIsDetailModalOpen(false);
    setIsNewModalOpen(true);
  };

  const handleSaveOitiva = async (data: Omit<Oitiva, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const currentUid = user?.uid;
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
          createdBy: user?.email || user?.displayName || 'plantao'
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
    try {
      await oitivaService.update(id, { status: newStatus }, user?.uid);
      showToast(`Status atualizado para "${newStatus}".`);
      if (selectedOitiva && selectedOitiva.id === id) {
        setSelectedOitiva(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err: any) {
      showToast('Erro ao alterar status.', 'error');
    }
  };

  const handleUpdateOitivaDirect = async (id: string, updates: Partial<Oitiva>) => {
    try {
      await oitivaService.update(id, updates, user?.uid);
      if (selectedOitiva && selectedOitiva.id === id) {
        setSelectedOitiva(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (err: any) {
      console.error('Erro ao atualizar oitiva:', err);
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
        onViewChange={setCurrentView}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenNewModal={handleOpenNewModal}
        onOpenPrintModal={() => setIsPrintModalOpen(true)}
        onOpenWorkspaceModal={() => handleOpenWorkspace('calendar')}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        hasWorkspaceToken={hasWorkspaceToken}
        syncStatus={syncStatus}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-1 w-full">
        {/* Quick summary stats & filter bar */}
        <StatsBar
          oitivas={oitivas}
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
            statusFilter={statusFilter}
          />
        )}

        {currentView === 'week' && (
          <CalendarWeekView
            oitivas={displayedOitivas}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            onSelectOitiva={handleSelectOitiva}
            onAddOitivaForDate={handleAddOitivaForDate}
            statusFilter={statusFilter}
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
            statusFilter={statusFilter}
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
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            onAddOitiva={handleOpenNewModal}
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
      />

      <OitivaDetailModal
        oitiva={selectedOitiva}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedOitiva(null);
        }}
        onEdit={handleEditOitiva}
        onDelete={handleDeleteOitiva}
        onStatusChange={handleStatusChange}
        onOpenPrint={() => setIsPrintModalOpen(true)}
        onOpenPrintIntimacao={() => {
          if (selectedOitiva) {
            handleOpenPrintIntimacao(selectedOitiva);
          }
        }}
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
            await oitivaService.update(oitivaId, { intimationSent: true });
            showToast('Intimação marcada como emitida!');
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
        onUpdateProfile={(updatedUser) => {
          setUser(updatedUser);
          setHasWorkspaceToken(authService.hasGoogleWorkspaceAccess());
          showToast('Perfil atualizado com sucesso!');
        }}
        onOpenWorkspaceModal={() => {
          setIsProfileModalOpen(false);
          handleOpenWorkspace('calendar');
        }}
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
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
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
