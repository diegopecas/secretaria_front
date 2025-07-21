import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export interface SpeechNotification {
  event: 'start' | 'end' | 'result' | 'error';
  content?: string;
  error?: string;
  isFinal?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SpeechRecognizerService {
  private recognition: any = null;
  private language = 'es-ES';
  private isListening = false;
  
  private speechEvents = new Subject<SpeechNotification>();
  
  constructor() {
    this.initializeSpeechRecognition();
  }
  
  private initializeSpeechRecognition(): boolean {
    const win = window as any;
    
    if (!('webkitSpeechRecognition' in win) && !('SpeechRecognition' in win)) {
      console.error('Web Speech API no está soportada en este navegador');
      return false;
    }
    
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    // Configuración
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.language;
    this.recognition.maxAlternatives = 1;
    
    // Eventos
    this.setupEventListeners();
    
    return true;
  }
  
  private setupEventListeners(): void {
    if (!this.recognition) return;
    
    this.recognition.onstart = () => {
      console.log('Speech recognition iniciado');
      this.isListening = true;
      this.speechEvents.next({ event: 'start' });
    };
    
    this.recognition.onend = () => {
      console.log('Speech recognition terminado');
      this.isListening = false;
      this.speechEvents.next({ event: 'end' });
      
      // Si se detuvo inesperadamente y deberíamos estar escuchando, reintentar
      if (this.isListening) {
        console.log('Reconocimiento terminó inesperadamente, reintentando...');
        setTimeout(() => {
          this.start().catch(err => console.error('Error al reintentar:', err));
        }, 500);
      }
    };
    
    this.recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      
      if (finalTranscript) {
        this.speechEvents.next({
          event: 'result',
          content: finalTranscript,
          isFinal: true
        });
      } else if (interimTranscript) {
        this.speechEvents.next({
          event: 'result',
          content: interimTranscript,
          isFinal: false
        });
      }
    };
    
    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      
      let errorMessage = '';
      
      switch (event.error) {
        case 'not-allowed':
          errorMessage = 'Permisos de micrófono denegados. Por favor, permite el acceso al micrófono.';
          break;
        case 'no-speech':
          // No es un error real, solo no detectó voz
          console.log('No se detectó voz, esperando...');
          return;
        case 'audio-capture':
          errorMessage = 'No se puede acceder al micrófono. Verifica que esté conectado.';
          break;
        case 'network':
          errorMessage = 'Error de red. Verifica tu conexión a internet.';
          // Intentar reconectar si estamos escuchando
          if (this.isListening) {
            setTimeout(() => this.start(), 1000);
          }
          return;
        default:
          errorMessage = `Error de reconocimiento: ${event.error}`;
      }
      
      if (errorMessage) {
        this.speechEvents.next({
          event: 'error',
          error: errorMessage
        });
      }
    };
    
    // Manejar cuando el navegador detiene automáticamente el reconocimiento
    this.recognition.onspeechend = () => {
      console.log('Speech ended - usuario dejó de hablar');
    };
    
    this.recognition.onaudiostart = () => {
      console.log('Audio captura iniciada');
    };
    
    this.recognition.onaudioend = () => {
      console.log('Audio captura terminada');
    };
    
    this.recognition.onspeechstart = () => {
      console.log('Se detectó inicio de voz');
    };
    
    this.recognition.onnomatch = () => {
      console.log('No se pudo reconocer la voz');
    };
  }
  
  async start(): Promise<void> {
    if (!this.recognition) {
      throw new Error('Speech Recognition no está inicializado');
    }
    
    if (this.isListening) {
      console.log('Ya está escuchando');
      return;
    }
    
    try {
      // Primero solicitar permisos de micrófono explícitamente
      console.log('Solicitando permisos de micrófono...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Permisos de micrófono concedidos');
      
      // Detener el stream inmediatamente (solo necesitábamos los permisos)
      stream.getTracks().forEach(track => track.stop());
      
      // Pequeña demora para asegurar que el micrófono esté listo
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Luego iniciar reconocimiento
      this.recognition.start();
      console.log('Iniciando reconocimiento de voz...');
    } catch (error: any) {
      console.error('Error al iniciar reconocimiento:', error);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        this.speechEvents.next({
          event: 'error',
          error: 'Permisos de micrófono denegados. Por favor, permite el acceso al micrófono y recarga la página.'
        });
      } else if (error.name === 'NotFoundError') {
        this.speechEvents.next({
          event: 'error',
          error: 'No se encontró ningún micrófono. Verifica que esté conectado.'
        });
      } else {
        this.speechEvents.next({
          event: 'error',
          error: 'Error al acceder al micrófono: ' + error.message
        });
      }
      
      throw error;
    }
  }
  
  stop(): void {
    if (!this.recognition || !this.isListening) {
      return;
    }
    
    try {
      this.recognition.stop();
      console.log('Deteniendo reconocimiento de voz...');
    } catch (error) {
      console.error('Error al detener:', error);
    }
  }
  
  setLanguage(language: string): void {
    this.language = language;
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }
  
  getEvents(): Observable<SpeechNotification> {
    return this.speechEvents.asObservable();
  }
  
  getIsListening(): boolean {
    return this.isListening;
  }
  
  isAvailable(): boolean {
    const win = window as any;
    return 'webkitSpeechRecognition' in win || 'SpeechRecognition' in win;
  }
  
  // Método de diagnóstico para verificar el estado
  async testMicrophone(): Promise<boolean> {
    try {
      console.log('Probando acceso al micrófono...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Micrófono accesible:', stream.getAudioTracks());
      
      // Verificar que hay al menos una pista de audio
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        console.error('No se encontraron dispositivos de audio');
        return false;
      }
      
      // Mostrar información del micrófono
      audioTracks.forEach(track => {
        console.log('Micrófono encontrado:', {
          label: track.label,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState
        });
      });
      
      // Limpiar
      stream.getTracks().forEach(track => track.stop());
      
      return true;
    } catch (error: any) {
      console.error('Error al acceder al micrófono:', error);
      return false;
    }
  }
}