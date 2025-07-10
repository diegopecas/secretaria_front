import { Component, EventEmitter, OnInit, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NotificationService } from '../../../services/notification.service';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';

interface ModeloTranscripcion {
  id: number;
  proveedor: string;
  modelo: string;
  nombre_mostrar: string;
  descripcion: string;
  precision: string;
  costo_display: string;
  es_predeterminado: boolean;
}

interface TranscripcionResult {
  texto: string;
  proveedor: string;
  modelo: string;
  confianza?: number;
}

@Component({
  selector: 'app-grabador-audio',
  templateUrl: './grabador-audio.component.html',
  styleUrls: ['./grabador-audio.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class GrabadorAudioComponent implements OnInit, OnDestroy {
  @Output() transcripcionCompleta = new EventEmitter<TranscripcionResult>();

  // Estado de grabación
  isRecording = false;
  isPaused = false;
  recordingTime = 0;
  audioBlob: Blob | null = null;
  audioUrl: string | null = null;

  // Modelos disponibles
  modelosDisponibles: ModeloTranscripcion[] = [];
  modeloSeleccionado: ModeloTranscripcion | null = null;
  modeloSeleccionadoId: number | null = null;

  // Estado de transcripción
  isTranscribing = false;
  transcripcionTexto: string = '';
  error: string | null = null;

  // Para Speech-to-Text del navegador
  recognition: any = null;
  soportaReconocimientoVoz = false;

  // MediaRecorder para APIs
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private timerInterval: any;
  private startTime: number = 0;
  private stream: MediaStream | null = null;

  constructor(
    private http: HttpClient,
    private notificationService: NotificationService,
    private authService: AuthService
  ) {
    // Verificar soporte de Speech Recognition
    this.soportaReconocimientoVoz = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

  ngOnInit() {
    this.cargarModelos();
    this.inicializarSpeechRecognition();

    // Cargar preferencia guardada
    const ultimoModelo = localStorage.getItem('ultimoModeloTranscripcion');
    if (ultimoModelo) {
      this.modeloSeleccionadoId = parseInt(ultimoModelo);
    }
  }

  ngOnDestroy() {
    this.detenerGrabacion();
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
  }

  cargarModelos() {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getAccessToken()}`
    });

    // Llamar al endpoint para obtener modelos de transcripción
    this.http.get<any>(`${environment.api}ia-modelos/transcripcion`, { headers })
      .subscribe({
        next: (response) => {
          this.modelosDisponibles = response.modelos || [];

          // Si no hay modelo seleccionado, usar el predeterminado
          if (!this.modeloSeleccionadoId && this.modelosDisponibles.length > 0) {
            const modeloPredeterminado = this.modelosDisponibles.find(m => m.es_predeterminado);
            if (modeloPredeterminado) {
              this.modeloSeleccionadoId = modeloPredeterminado.id;
            } else {
              this.modeloSeleccionadoId = this.modelosDisponibles[0].id;
            }
          }

          this.onModeloChange();
        },
        error: (error) => {
          console.error('Error cargando modelos:', error);
          // Si falla la carga, agregar al menos el modelo del navegador
          this.agregarModeloNavegador();
        }
      });
  }

  agregarModeloNavegador() {
    if (this.soportaReconocimientoVoz) {
      this.modelosDisponibles = [{
        id: 0,
        proveedor: 'navegador',
        modelo: 'webkitSpeechRecognition',
        nombre_mostrar: 'Navegador (Gratis)',
        descripcion: 'Transcripción gratuita usando el navegador',
        precision: 'Media',
        costo_display: 'Gratis',
        es_predeterminado: true
      }];
      this.modeloSeleccionadoId = 0;
      this.onModeloChange();
    }
  }

  onModeloChange() {
    if (this.modeloSeleccionadoId !== null) {
      this.modeloSeleccionado = this.modelosDisponibles.find(m => m.id === this.modeloSeleccionadoId) || null;

      // Guardar preferencia
      localStorage.setItem('ultimoModeloTranscripcion', this.modeloSeleccionadoId.toString());

      // Resetear estado si estaba grabando
      if (this.isRecording) {
        this.detenerGrabacion();
      }
    }
  }

  inicializarSpeechRecognition() {
    if (!this.soportaReconocimientoVoz) return;

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    this.recognition = new SpeechRecognition();

    this.recognition.lang = 'es-ES';
    this.recognition.continuous = true;
    this.recognition.interimResults = true;

    this.recognition.onresult = (event: any) => {
      let textoActual = '';
      for (let i = 0; i < event.results.length; i++) {
        textoActual += event.results[i][0].transcript + ' ';
      }
      this.transcripcionTexto = textoActual.trim();
    };

    this.recognition.onend = () => {
      if (this.isRecording && this.modeloSeleccionado?.proveedor === 'navegador') {
        // Reiniciar si sigue grabando
        this.recognition.start();
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Error en reconocimiento:', event.error);
      this.error = `Error: ${event.error}`;
      this.isRecording = false;
    };
  }

  async toggleGrabacion() {
    if (!this.isRecording) {
      await this.iniciarGrabacion();
    } else {
      this.detenerGrabacion();
    }
  }

  async iniciarGrabacion() {
    if (!this.modeloSeleccionado) {
      this.notificationService.warning('Seleccione un modelo de transcripción');
      return;
    }

    this.error = null;
    this.transcripcionTexto = '';

    try {
      if (this.modeloSeleccionado.proveedor === 'navegador') {
        // Usar Speech-to-Text del navegador
        if (!this.soportaReconocimientoVoz) {
          throw new Error('Su navegador no soporta reconocimiento de voz');
        }

        this.recognition.start();
        this.isRecording = true;
        this.startTime = Date.now();
        this.iniciarTimer();

      } else {
        // Grabar audio para enviar a API
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        this.mediaRecorder = new MediaRecorder(this.stream, {
          mimeType: 'audio/webm'
        });

        this.audioChunks = [];

        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.audioChunks.push(event.data);
          }
        };

        this.mediaRecorder.onstop = async () => {
          this.audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          this.audioUrl = URL.createObjectURL(this.audioBlob);

          // Detener stream
          if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
          }

          // Transcribir con API
          await this.transcribirConAPI();
        };

        this.mediaRecorder.start();
        this.isRecording = true;
        this.startTime = Date.now();
        this.iniciarTimer();
      }

    } catch (error: any) {
      console.error('Error al iniciar grabación:', error);
      this.error = error.message || 'Error al acceder al micrófono';
      if (this.error) {
        this.notificationService.error(this.error);
      }
      this.isRecording = false;
    }
  }

  detenerGrabacion() {
    this.detenerTimer();
    this.isRecording = false;

    if (this.modeloSeleccionado?.proveedor === 'navegador') {
      // Detener Speech-to-Text
      if (this.recognition) {
        this.recognition.stop();
      }

      // Emitir resultado inmediatamente
      if (this.transcripcionTexto) {
        this.emitirTranscripcion();
      }

    } else {
      // Detener MediaRecorder
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
    }
  }

  async transcribirConAPI() {
    if (!this.audioBlob || !this.modeloSeleccionado) return;

    this.isTranscribing = true;
    this.error = null;

    const formData = new FormData();
    formData.append('audio', this.audioBlob, 'grabacion.webm');
    formData.append('modelo_id', this.modeloSeleccionado.id.toString());

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getAccessToken()}`
    });

    try {
      const response = await this.http.post<any>(
        `${environment.api}transcribir`,
        formData,
        { headers }
      ).toPromise();

      this.transcripcionTexto = response.texto;
      this.emitirTranscripcion();
      this.notificationService.success('Transcripción completada');

    } catch (error: any) {
      console.error('Error en transcripción:', error);
      this.error = error.error?.error || 'Error al transcribir el audio';
      if (this.error) {
        this.notificationService.error(this.error);
      }

    } finally {
      this.isTranscribing = false;
    }
  }

  emitirTranscripcion() {
    if (this.transcripcionTexto && this.modeloSeleccionado) {
      this.transcripcionCompleta.emit({
        texto: this.transcripcionTexto,
        proveedor: this.modeloSeleccionado.proveedor,
        modelo: this.modeloSeleccionado.modelo,
        confianza: this.modeloSeleccionado.proveedor === 'navegador' ? 0.85 : 0.95
      });
    }
  }

  resetear() {
    this.detenerGrabacion();
    this.audioBlob = null;
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
      this.audioUrl = null;
    }
    this.recordingTime = 0;
    this.transcripcionTexto = '';
    this.error = null;
  }

  // Timer
  private iniciarTimer() {
    this.timerInterval = setInterval(() => {
      this.recordingTime++;
    }, 1000);
  }

  private detenerTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}