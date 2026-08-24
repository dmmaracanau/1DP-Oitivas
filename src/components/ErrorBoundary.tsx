import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error caught:', event.error);
      setHasError(true);
      setErrorMessage(event.error?.message || event.message || 'Erro de execução');
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen bg-[#07050d] text-zinc-200 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#130f20] border border-purple-900/40 rounded-2xl p-6 shadow-2xl text-center space-y-4">
          <div className="w-14 h-14 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto text-red-400">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Ocorreu um erro inesperado
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            O aplicativo encontrou um problema ao inicializar. Clique no botão abaixo para tentar recarregar.
          </p>
          {errorMessage && (
            <div className="p-3 bg-black/40 border border-zinc-800 rounded-lg text-left text-[11px] font-mono text-red-300 overflow-x-auto max-h-32">
              {errorMessage}
            </div>
          )}
          <button
            onClick={() => window.location.reload()}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-purple-900/30 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Recarregar Página
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
