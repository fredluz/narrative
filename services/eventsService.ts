import EventEmitter from 'eventemitter3';

class EventsService {
  private static instance: EventsService;
  private emitter: EventEmitter;

  private constructor() {
    this.emitter = new EventEmitter();
  }

  public static getInstance(): EventsService {
    if (!EventsService.instance) {
      EventsService.instance = new EventsService();
    }
    return EventsService.instance;
  }

  public emit(eventName: string, data: any) {
    this.emitter.emit(eventName, data);
  }

  public addListener(eventName: string, callback: (data: any) => void) {
    return this.emitter.addListener(eventName, callback);
  }

  public removeListener(eventName: string, callback: (data: any) => void) {
    this.emitter.removeListener(eventName, callback);  // Changed from removeAllListeners to removeListener
  }
}

export const eventsService = EventsService.getInstance();

// Event name constants
export const EVENT_NAMES = {
  ANALYZE_JOURNAL_ENTRY: 'analyzeJournalEntry',
  NEW_SUGGESTIONS: 'newSuggestions'
} as const;