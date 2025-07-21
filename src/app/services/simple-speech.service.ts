import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SimpleSpeechService {
  private recognition: any = null;
  private transcriptSubject = new BehaviorSubject<string>('');
  private isListeningSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string>('');
  
  private finalTranscript = '';
  private isRecognizing = false;
  
  constructor() {
    this.initializeRecognition();
  }
  
  private initializeRecognition(): void {
    const win = window as any;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('Web Speech API no soportada');
      return;
    }
    
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'es-ES';
    
    // Manejar resultados
    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          this.finalTranscript += transcript + ' ';
        } else {
          interimTranscript = transcript;
        }
      }
      
      // Emitir el texto completo
      const fullText = this.finalTranscript + interimTranscript;
      this.transcriptSubject.next(fullText);
    };
    
    // Manejar inicio
    this.recognition.onstart = () => {
      console.log('Reconocimiento iniciado exitosamente');
      this.isRecognizing = true;
      this.isListeningSubject.next(true);
      this.errorSubject.next('');
    };
    
    // Manejar fin
    this.recognition.onend = () => {
      console.log('Reconocimiento terminado');
      this.isRecognizing = false;
      this.isListeningSubject.next(false);
      
      // Si deberíamos estar grabando aún, reiniciar
      if (this.isListeningSubject.value) {
        console.log('Reiniciando reconocimiento...');
        setTimeout(() => this.startListening(), 100);
      }
    };
    
    // Manejar errores
    this.recognition.onerror = (event: any) => {
      console.error('Error de reconocimiento:', event.error);
      
      // Solo manejar errores reales
      if (event.error === 'no-speech') {
        console.log('No se detectó voz aún, continuando...');
        return;
      }
      
      if (event.error === 'not-allowed') {
        this.errorSubject.next('Permisos de micrófono denegados');
        this.stopListening();
      } else if (event.error === 'network') {
        console.log('Error de red, reintentando...');
      } else if (event.error !== 'aborted') {
        this.errorSubject.next(`Error: ${event.error}`);
      }
    };
  }
  
  async startListening(): Promise<void> {
    if (!this.recognition) {
      throw new Error('Reconocimiento no inicializado');
    }
    
    try {
      // Reset del texto final
      this.finalTranscript = '';
      this.transcriptSubject.next('');
      
      // Verificar permisos primero
      console.log('Verificando permisos de micrófono...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      console.log('Permisos concedidos, iniciando reconocimiento...');
      
      // Importante: mantener el stream activo un momento
      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop());
      }, 1000);
      
      // Iniciar reconocimiento
      if (!this.isRecognizing) {
        this.recognition.start();
        this.isListeningSubject.next(true);
      }
      
    } catch (error: any) {
      console.error('Error al iniciar:', error);
      
      if (error.name === 'NotAllowedError') {
        this.errorSubject.next('Por favor permite el acceso al micrófono');
      } else {
        this.errorSubject.next('Error al acceder al micrófono');
      }
      
      throw error;
    }
  }
  
  stopListening(): void {
    if (this.recognition && this.isRecognizing) {
      this.isListeningSubject.next(false);
      this.recognition.stop();
      console.log('Deteniendo reconocimiento...');
    }
  }
  
  getTranscript(): Observable<string> {
    return this.transcriptSubject.asObservable();
  }
  
  getIsListening(): Observable<boolean> {
    return this.isListeningSubject.asObservable();
  }
  
  getError(): Observable<string> {
    return this.errorSubject.asObservable();
  }
  
  getCurrentTranscript(): string {
    return this.transcriptSubject.value;
  }
  
  isAvailable(): boolean {
    const win = window as any;
    return !!(win.SpeechRecognition || win.webkitSpeechRecognition);
  }
}