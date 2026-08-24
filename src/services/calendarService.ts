import { Oitiva } from '../types/oitiva';

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  htmlLink?: string;
  status?: string;
}

export const calendarService = {
  /**
   * Cria um evento na Google Agenda do usuário a partir dos dados da Oitiva
   */
  async createEvent(token: string, oitiva: Oitiva): Promise<GoogleCalendarEvent> {
    const time = oitiva.time || '09:00';
    const [hours, minutes] = time.split(':').map(Number);
    
    // Início da oitiva
    const startDate = new Date(`${oitiva.date}T${time}:00`);
    // Duração estimada: 45 minutos
    const endDate = new Date(startDate.getTime() + 45 * 60 * 1000);

    const pad = (n: number) => n.toString().padStart(2, '0');
    const endHours = pad(endDate.getHours());
    const endMins = pad(endDate.getMinutes());
    const endTimeStr = `${endHours}:${endMins}`;

    const eventPayload = {
      summary: `[OITIVA] ${oitiva.personName} - ${oitiva.procedureNumber || 'DP Maracanaú'}`,
      description: [
        `AUDIÊNCIA / OITIVA POLICIAL`,
        `==================================`,
        `Depoente: ${oitiva.personName}`,
        `Condição: ${oitiva.role || 'Não especificada'}`,
        `Procedimento: ${oitiva.procedureNumber || 'A designar'} (${oitiva.procedureType || 'Policial'})`,
        oitiva.cpf ? `CPF: ${oitiva.cpf}` : '',
        oitiva.phone ? `Telefone/WhatsApp: ${oitiva.phone}` : '',
        oitiva.officerName ? `Autoridade Policial: ${oitiva.officerName}` : '',
        oitiva.clerkName ? `Escrivão(ã): ${oitiva.clerkName}` : '',
        `Modalidade: ${oitiva.modality || 'Presencial'}`,
        oitiva.locationOrLink ? `Local / Link: ${oitiva.locationOrLink}` : '',
        oitiva.notes ? `\nObservações: ${oitiva.notes}` : '',
        `\nSistema de Cartório - Delegacia Metropolitana de Maracanaú`
      ].filter(Boolean).join('\n'),
      location: oitiva.modality === 'Videoconferência' 
        ? (oitiva.locationOrLink || 'Videoconferência / Link Meet') 
        : `Delegacia Metropolitana de Maracanaú, CE - ${oitiva.locationOrLink || 'Cartório de Oitivas'}`,
      start: {
        dateTime: `${oitiva.date}T${time}:00-03:00`,
        timeZone: 'America/Fortaleza',
      },
      end: {
        dateTime: `${oitiva.date}T${endTimeStr}:00-03:00`,
        timeZone: 'America/Fortaleza',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 30 },
          { method: 'popup', minutes: 120 },
        ],
      },
    };

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventPayload),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Falha ao sincronizar com o Google Calendar.');
    }

    return await response.json();
  },

  /**
   * Atualiza um evento existente na Google Agenda
   */
  async updateEvent(token: string, eventId: string, oitiva: Oitiva): Promise<GoogleCalendarEvent> {
    const time = oitiva.time || '09:00';
    const [hours, minutes] = time.split(':').map(Number);
    const startDate = new Date(`${oitiva.date}T${time}:00`);
    const endDate = new Date(startDate.getTime() + 45 * 60 * 1000);

    const pad = (n: number) => n.toString().padStart(2, '0');
    const endHours = pad(endDate.getHours());
    const endMins = pad(endDate.getMinutes());

    const eventPayload = {
      summary: `[OITIVA] ${oitiva.personName} - ${oitiva.procedureNumber || 'DP Maracanaú'}`,
      description: [
        `AUDIÊNCIA / OITIVA POLICIAL (Atualizada)`,
        `==================================`,
        `Depoente: ${oitiva.personName}`,
        `Condição: ${oitiva.role || 'Não especificada'}`,
        `Status Atual: ${oitiva.status}`,
        `Procedimento: ${oitiva.procedureNumber || 'A designar'}`,
        oitiva.phone ? `Telefone: ${oitiva.phone}` : '',
        oitiva.officerName ? `Autoridade: ${oitiva.officerName}` : '',
        `Modalidade: ${oitiva.modality || 'Presencial'}`,
        oitiva.notes ? `\nObservações: ${oitiva.notes}` : '',
      ].filter(Boolean).join('\n'),
      location: oitiva.modality === 'Videoconferência'
        ? (oitiva.locationOrLink || 'Videoconferência')
        : `Delegacia Metropolitana de Maracanaú - ${oitiva.locationOrLink || 'Cartório'}`,
      start: {
        dateTime: `${oitiva.date}T${time}:00-03:00`,
        timeZone: 'America/Fortaleza',
      },
      end: {
        dateTime: `${oitiva.date}T${endHours}:${endMins}:00-03:00`,
        timeZone: 'America/Fortaleza',
      },
    };

    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventPayload),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Falha ao atualizar evento no Google Calendar.');
    }

    return await response.json();
  },

  /**
   * Remove evento da Google Agenda
   */
  async deleteEvent(token: string, eventId: string): Promise<void> {
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Falha ao remover evento do Google Calendar.');
    }
  },

  /**
   * Lista próximos eventos da agenda
   */
  async listEvents(token: string, maxResults = 20): Promise<GoogleCalendarEvent[]> {
    const now = new Date().toISOString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(now)}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Falha ao buscar eventos do Google Calendar.');
    }

    const data = await response.json();
    return data.items || [];
  }
};
