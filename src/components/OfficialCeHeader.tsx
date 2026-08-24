import React, { useState } from 'react';

interface OfficialCeHeaderProps {
  scale?: number; // default 80% as requested
  className?: string;
}

// Drive ID: 1H0TRKiVUk9VHOJA0j2ShtFNqQKhzRFW7
const DRIVE_DIRECT_CDN = 'https://lh3.googleusercontent.com/d/1H0TRKiVUk9VHOJA0j2ShtFNqQKhzRFW7';
const DRIVE_THUMBNAIL = 'https://drive.google.com/thumbnail?id=1H0TRKiVUk9VHOJA0j2ShtFNqQKhzRFW7&sz=w1600';

export const OfficialCeHeader: React.FC<OfficialCeHeaderProps> = ({
  scale = 80,
  className = ''
}) => {
  const [currentSrcIndex, setCurrentSrcIndex] = useState(0);
  const [hasError, setHasError] = useState(false);

  // Succession of reliable sources: public image -> Google UserContent direct CDN -> Drive Thumbnail
  const sources = [
    '/images/cabecalho-oficial.png',
    './images/cabecalho-oficial.png',
    DRIVE_DIRECT_CDN,
    DRIVE_THUMBNAIL
  ];

  const handleImageError = () => {
    if (currentSrcIndex < sources.length - 1) {
      setCurrentSrcIndex(prev => prev + 1);
    } else {
      setHasError(true);
    }
  };

  return (
    <div 
      className={`mx-auto flex flex-col items-center justify-center ${className}`}
      style={{ width: `${scale}%`, maxWidth: `${scale}%` }}
    >
      {!hasError ? (
        <img
          src={sources[currentSrcIndex]}
          alt="Cabeçalho Oficial - Polícia Civil do Estado do Ceará"
          className="w-full h-auto object-contain mx-auto select-none print:w-full"
          referrerPolicy="no-referrer"
          onError={handleImageError}
        />
      ) : (
        /* Fallback estruturado oficial caso a imagem seja bloqueada pela rede */
        <div className="w-full border-b-2 border-black pb-3 text-center text-black font-serif">
          <p className="text-[13px] font-bold tracking-wider uppercase">
            GOVERNO DO ESTADO DO CEARÁ
          </p>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-800">
            SECRETARIA DA SEGURANÇA PÚBLICA E DEFESA SOCIAL
          </p>
          <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-900">
            POLÍCIA CIVIL DO ESTADO DO CEARÁ
          </p>
          <p className="text-[10px] font-medium text-zinc-700">
            1ª Delegacia Metropolitana de Maracanaú
          </p>
        </div>
      )}
    </div>
  );
};
