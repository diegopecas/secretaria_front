import { Component, EventEmitter, Input, OnInit, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IAModelo, IAModelosService } from '../../../services/ia-modelo.service';
import { NotificationService } from '../../../services/notification.service';


export interface TranscripcionResultado {
  texto: string;
  modeloId: number;
  proveedor: string;
  modelo: string;
  confianza?: number;
  duracionAudio?: number;
}

interface TranscripcionHistorial {
  id: number;
  texto: string;
  fecha: Date;
  duracion: number;
  modelo: string;
}

@Component({
  selector: 'app-transcripcion-audio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transcripcion-audio.component.html',
  styleUrls: ['./transcripcion-audio.component.scss']
})
export class TranscripcionAudioComponent implements OnInit, OnDestroy {
  @Input() limiteSegundos: number = 300; // 5 minutos por defecto
  @Input() mostrarHistorial: boolean = true;
  @Input() modoEdicion: boolean = true;
  
  @Output() textoTranscrito = new EventEmitter<TranscripcionResultado>();

  // Modelos disponibles
  modelosDisponibles: IAModelo[] = [];
  modeloSeleccionado: IAModelo | null = null;
  cargandoModelos = false;

  // Estados de grabación
  estado: 'inicial' | 'grabando' | 'procesando' | 'completado' | 'error' = 'inicial';
  
  // Grabación
  mediaRecorder: MediaRecorder | null = null;
  audioChunks: Blob[] = [];
  tiempoGrabacion = 0;
  intervaloTiempo: any;
  nivelAudio = 0;
  audioContext: AudioContext | null = null;
  analyser: AnalyserNode | null = null;
  microphone: MediaStreamAudioSourceNode | null = null;
  animationId: number | null = null;

  // Transcripción - CORREGIDO: cambié el nombre de la variable
  textoTranscritoActual: string = '';
  confianzaTranscripcion: number = 0;
  editandoTexto = false;
  textoEditado: string = '';

  // Historial
  historial: TranscripcionHistorial[] = [];
  historialId = 0;

  // Web Speech API
  recognition: any = null;
  soportaWebSpeech = false;

  // Mensajes
  mensajeError: string = '';

  constructor(
    private iaModelosService: IAModelosService,
    private notificationService: NotificationService
  ) {
    // Verificar soporte de Web Speech API
    this.verificarSoporteWebSpeech();
  }

  ngOnInit() {
    this.cargarModelos();
  }

  ngOnDestroy() {
    this.detenerGrabacion();
    if (this.audioContext) {
      this.audioContext.close();
    }
  }

  private verificarSoporteWebSpeech() {
    const win = window as any;
    this.soportaWebSpeech = 'webkitSpeechRecognition' in win || 'SpeechRecognition' in win;
  }

  private cargarModelos() {
    this.cargandoModelos = true;
    
    this.iaModelosService.obtenerPorTipo('transcripcion').subscribe({
      next: (response: any) => {
        this.modelosDisponibles = response.modelos || [];
        
        // Agregar modelo del navegador si está soportado
        if (this.soportaWebSpeech) {
          this.modelosDisponibles.unshift({
            id: 0,
            proveedor: 'navegador',
            modelo: 'Web Speech API',
            tipo_modelo_id: 0,
            activo: true,
            es_predeterminado: false,
            costo_por_1k_tokens: 0,
            tipo_nombre: 'Transcripción del navegador',
            tipo_codigo: 'transcripcion'
          });
        }
        
        // Seleccionar modelo predeterminado
        const modeloPredeterminado = this.modelosDisponibles.find(m => m.es_predeterminado);
        this.modeloSeleccionado = modeloPredeterminado || this.modelosDisponibles[0] || null;
        
        this.cargandoModelos = false;
      },
      error: (error: any) => {
        console.error('Error cargando modelos:', error);
        this.notificationService.error('Error al cargar modelos de transcripción');
        this.cargandoModelos = false;
      }
    });
  }

  async iniciarGrabacion() {
    if (!this.modeloSeleccionado) {
      this.notificationService.warning('Por favor seleccione un modelo de transcripción');
      return;
    }

    this.mensajeError = '';
    
    try {
      // Si es modelo del navegador, usar Web Speech API
      if (this.modeloSeleccionado.proveedor === 'navegador') {
        this.iniciarWebSpeech();
      } else {
        // Para otros modelos, grabar audio
        await this.iniciarGrabacionAudio();
      }
      
      this.estado = 'grabando';
      this.iniciarTemporizador();
      
    } catch (error) {
      console.error('Error al iniciar grabación:', error);
      this.mensajeError = 'No se pudo acceder al micrófono';
      this.estado = 'error';
    }
  }

  private iniciarWebSpeech() {
    const win = window as any;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'es-ES';
    
    let textoFinal = '';
    
    this.recognition.onresult = (event: any) => {
      let textoInterino = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const resultado = event.results[i];
        if (resultado.isFinal) {
          textoFinal += resultado[0].transcript + ' ';
        } else {
          textoInterino = resultado[0].transcript;
        }
      }
      
      this.textoTranscritoActual = textoFinal + textoInterino;
    };
    
    this.recognition.onerror = (event: any) => {
      console.error('Error en reconocimiento:', event.error);
      this.mensajeError = 'Error en el reconocimiento de voz';
      this.estado = 'error';
    };
    
    this.recognition.start();
  }

  private async iniciarGrabacionAudio() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Configurar MediaRecorder
    this.mediaRecorder = new MediaRecorder(stream);
    this.audioChunks = [];
    
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };
    
    // Configurar análisis de audio para visualización
    this.configurarAnalizadorAudio(stream);
    
    // Iniciar grabación
    this.mediaRecorder.start();
  }

  private configurarAnalizadorAudio(stream: MediaStream) {
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.microphone = this.audioContext.createMediaStreamSource(stream);
    
    this.analyser.fftSize = 256;
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    this.microphone.connect(this.analyser);
    
    const actualizarNivelAudio = () => {
      if (this.estado !== 'grabando') return;
      
      this.analyser!.getByteFrequencyData(dataArray);
      const promedio = dataArray.reduce((a, b) => a + b) / bufferLength;
      this.nivelAudio = Math.min(100, (promedio / 128) * 100);
      
      this.animationId = requestAnimationFrame(actualizarNivelAudio);
    };
    
    actualizarNivelAudio();
  }

  private iniciarTemporizador() {
    this.tiempoGrabacion = 0;
    
    this.intervaloTiempo = setInterval(() => {
      this.tiempoGrabacion++;
      
      // Verificar límite de tiempo
      if (this.tiempoGrabacion >= this.limiteSegundos) {
        this.detenerGrabacion();
        this.notificationService.warning(`Límite de grabación alcanzado (${this.limiteSegundos} segundos)`);
      }
    }, 1000);
  }

  async detenerGrabacion() {
    if (this.estado !== 'grabando') return;
    
    // Detener temporizador
    if (this.intervaloTiempo) {
      clearInterval(this.intervaloTiempo);
    }
    
    // Detener animación
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    this.estado = 'procesando';
    
    try {
      if (this.modeloSeleccionado?.proveedor === 'navegador') {
        // Detener Web Speech API
        if (this.recognition) {
          this.recognition.stop();
          await this.procesarTranscripcionNavegador();
        }
      } else {
        // Detener grabación de audio
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop();
          
          // Esperar a que se procesen todos los chunks
          await new Promise(resolve => {
            this.mediaRecorder!.onstop = resolve;
          });
          
          await this.procesarTranscripcionIA();
        }
      }
    } catch (error) {
      console.error('Error al detener grabación:', error);
      this.mensajeError = 'Error al procesar la grabación';
      this.estado = 'error';
    } finally {
      // Limpiar recursos
      this.limpiarRecursos();
    }
  }

  private async procesarTranscripcionNavegador() {
    // La transcripción ya está en textoTranscritoActual
    
    if (this.textoTranscritoActual.trim()) {
      this.confianzaTranscripcion = 0.85; // Confianza estimada para Web Speech
      this.estado = 'completado';
      
      // Agregar al historial
      this.agregarAlHistorial();
      
      // Emitir resultado
      this.emitirResultado();
    } else {
      this.mensajeError = 'No se detectó ningún audio';
      this.estado = 'error';
    }
  }

  private async procesarTranscripcionIA() {
    if (this.audioChunks.length === 0) {
      this.mensajeError = 'No se grabó audio';
      this.estado = 'error';
      return;
    }
    
    // Crear blob de audio
    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
    
    // Crear FormData
    const formData = new FormData();
    formData.append('audio', audioBlob, 'grabacion.webm');
    formData.append('modelo_id', this.modeloSeleccionado!.id.toString());
    
    try {
      const resultado = await this.iaModelosService.transcribir(formData).toPromise();
      
      if (resultado?.success && resultado.texto) {
        this.textoTranscritoActual = resultado.texto;
        this.confianzaTranscripcion = resultado.confianza || 0.95;
        this.estado = 'completado';
        
        // Agregar al historial
        this.agregarAlHistorial();
        
        // Emitir resultado
        this.emitirResultado();
      } else {
        throw new Error(resultado?.error || 'Error en la transcripción');
      }
      
    } catch (error: any) {
      console.error('Error en transcripción:', error);
      this.mensajeError = error.message || 'Error al transcribir el audio';
      this.estado = 'error';
    }
  }

  private limpiarRecursos() {
    // Detener streams de audio
    if (this.mediaRecorder && this.mediaRecorder.stream) {
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    
    // Desconectar nodos de audio
    if (this.microphone) {
      this.microphone.disconnect();
    }
    
    // Resetear nivel de audio
    this.nivelAudio = 0;
  }

  editarTexto() {
    this.textoEditado = this.textoTranscritoActual;
    this.editandoTexto = true;
  }

  guardarEdicion() {
    this.textoTranscritoActual = this.textoEditado;
    this.editandoTexto = false;
    this.emitirResultado();
  }

  cancelarEdicion() {
    this.editandoTexto = false;
    this.textoEditado = '';
  }

  confirmarTranscripcion() {
    if (!this.textoTranscritoActual.trim()) {
      this.notificationService.warning('El texto no puede estar vacío');
      return;
    }
    
    this.emitirResultado();
  }

  private emitirResultado() {
    if (!this.modeloSeleccionado) return;
    
    const resultado: TranscripcionResultado = {
      texto: this.textoTranscritoActual,
      modeloId: this.modeloSeleccionado.id,
      proveedor: this.modeloSeleccionado.proveedor,
      modelo: this.modeloSeleccionado.modelo,
      confianza: this.confianzaTranscripcion,
      duracionAudio: this.tiempoGrabacion
    };
    
    this.textoTranscrito.emit(resultado);
  }

  private agregarAlHistorial() {
    if (!this.mostrarHistorial || !this.modeloSeleccionado) return;
    
    this.historial.unshift({
      id: ++this.historialId,
      texto: this.textoTranscritoActual,
      fecha: new Date(),
      duracion: this.tiempoGrabacion,
      modelo: this.modeloSeleccionado.modelo
    });
    
    // Limitar historial a 10 elementos
    if (this.historial.length > 10) {
      this.historial.pop();
    }
  }

  usarDeHistorial(item: TranscripcionHistorial) {
    this.textoTranscritoActual = item.texto;
    this.estado = 'completado';
    this.tiempoGrabacion = item.duracion;
    
    // Buscar el modelo usado
    const modelo = this.modelosDisponibles.find(m => m.modelo === item.modelo);
    if (modelo) {
      this.modeloSeleccionado = modelo;
    }
  }

  eliminarDeHistorial(item: TranscripcionHistorial) {
    const index = this.historial.findIndex(h => h.id === item.id);
    if (index > -1) {
      this.historial.splice(index, 1);
    }
  }

  nuevaGrabacion() {
    this.estado = 'inicial';
    this.textoTranscritoActual = '';
    this.confianzaTranscripcion = 0;
    this.tiempoGrabacion = 0;
    this.mensajeError = '';
    this.editandoTexto = false;
  }

  formatearTiempo(segundos: number): string {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  obtenerCostoEstimado(): string {
    if (!this.modeloSeleccionado) return '';
    
    if (this.modeloSeleccionado.proveedor === 'navegador') {
      return 'Gratis';
    }
    
    if (this.modeloSeleccionado.costo_por_1k_tokens) {
      // Estimación: 150 palabras por minuto, ~200 tokens por minuto
      const tokensEstimados = (this.limiteSegundos / 60) * 200;
      const costo = (tokensEstimados / 1000) * this.modeloSeleccionado.costo_por_1k_tokens;
      return `~$${costo.toFixed(4)} USD`;
    }
    
    return 'Variable';
  }

  get puedeGrabar(): boolean {
    return this.estado === 'inicial' && this.modeloSeleccionado !== null;
  }

  get estaGrabando(): boolean {
    return this.estado === 'grabando';
  }

  get estaProcesando(): boolean {
    return this.estado === 'procesando';
  }

  get tieneResultado(): boolean {
    return this.estado === 'completado' && this.textoTranscritoActual.length > 0;
  }
}