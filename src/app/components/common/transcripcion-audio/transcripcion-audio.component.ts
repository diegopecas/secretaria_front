import { Component, EventEmitter, Input, OnInit, OnDestroy, Output, forwardRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { IAModelo, IAModelosService } from '../../../services/ia-modelo.service';
import { NotificationService } from '../../../services/notification.service';
import { ModalComponent } from '../modal/modal.component';
import { SimpleSpeechService } from '../../../services/simple-speech.service';
import { Subject, takeUntil } from 'rxjs';

export interface TranscripcionResultado {
  texto: string;
  modeloId: number;
  proveedor: string;
  modelo: string;
  confianza?: number;
  duracionAudio?: number;
}

@Component({
  selector: 'app-transcripcion-audio',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './transcripcion-audio.component.html',
  styleUrls: ['./transcripcion-audio.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TranscripcionAudioComponent),
      multi: true
    }
  ]
})
export class TranscripcionAudioComponent implements OnInit, OnDestroy, ControlValueAccessor {
  @Input() limiteSegundos: number = 300;
  @Input() placeholder: string = 'Escriba o use el micrófono para transcribir...';
  @Input() label: string = '';
  @Input() requerido: boolean = false;
  @Input() mostrarSelectorModelo: boolean = true;
  @Input() modoInline: boolean = true;
  
  @Output() textoTranscrito = new EventEmitter<TranscripcionResultado>();

  // Modelos disponibles
  modelosDisponibles: IAModelo[] = [];
  modeloSeleccionado: IAModelo | null = null;
  cargandoModelos = false;

  // Estados simplificados
  estaGrabando = false;
  estaProcesando = false;

  // Grabación para IA
  mediaRecorder: MediaRecorder | null = null;
  audioChunks: Blob[] = [];
  tiempoGrabacion = 0;
  intervaloTiempo: any;

  // Transcripción
  textoTranscritoActual: string = '';
  textoTranscritoTemporal: string = '';
  confianzaTranscripcion: number = 0;

  // UI
  mostrarDropdown = false;
  mostrarModalConfirmacion = false;

  // Web Speech API
  recognition: any = null;
  soportaWebSpeech = false;
  transcripcionContinua = '';
  reconocimientoActivo = false;

  // Mensajes
  mensajeError: string = '';

  // Observable cleanup
  private destroy$ = new Subject<void>();

  // ControlValueAccessor
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};
  disabled = false;
  
  private _value: string = '';
  
  get value(): string {
    return this._value;
  }
  
  set value(val: string) {
    this._value = val;
    this.textoTranscritoActual = val;
    this.onChange(val);
  }

  constructor(
    private iaModelosService: IAModelosService,
    private notificationService: NotificationService,
    private speechService: SimpleSpeechService
  ) {
    this.soportaWebSpeech = this.speechService.isAvailable();
  }

  ngOnInit() {
    this.cargarModelos();
    this.configurarSpeechRecognizer();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.detenerTodo();
  }

  // ControlValueAccessor Methods
  writeValue(value: string): void {
    if (value !== undefined) {
      this._value = value;
      this.textoTranscritoActual = value;
    }
  }
  
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
  
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onTextoModificado() {
    this.value = this.textoTranscritoActual;
    this.onTouched();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.modelo-selector')) {
      this.mostrarDropdown = false;
    }
  }

  toggleDropdown() {
    this.mostrarDropdown = !this.mostrarDropdown;
  }

  seleccionarModelo(modelo: IAModelo) {
    this.modeloSeleccionado = modelo;
    this.mostrarDropdown = false;
  }

  private configurarSpeechRecognizer() {
    if (!this.soportaWebSpeech) return;

    // Suscribirse al texto transcrito
    this.speechService.getTranscript()
      .pipe(takeUntil(this.destroy$))
      .subscribe(texto => {
        if (texto && texto !== this.textoTranscritoActual) {
          this.textoTranscritoActual = texto;
          this.onTextoModificado();
        }
      });

    // Suscribirse al estado de escucha
    this.speechService.getIsListening()
      .pipe(takeUntil(this.destroy$))
      .subscribe(isListening => {
        this.reconocimientoActivo = isListening;
        
        // Si se detuvo y estábamos grabando, procesar el resultado
        if (!isListening && this.estaGrabando && this.modeloSeleccionado?.proveedor === 'navegador') {
          this.procesarResultadoWebSpeech();
        }
      });

    // Suscribirse a errores
    this.speechService.getError()
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        if (error) {
          this.mensajeError = error;
          this.estaGrabando = false;
        }
      });
  }

  private cargarModelos() {
    this.cargandoModelos = true;

    // Primero agregar Web Speech API si está soportado
    if (this.soportaWebSpeech) {
      this.modelosDisponibles = [{
        id: 0,
        proveedor: 'navegador',
        modelo: 'Web Speech API',
        tipo_modelo_id: 0,
        activo: true,
        es_predeterminado: true,
        costo_por_1k_tokens: 0,
        tipo_nombre: 'Transcripción del navegador',
        tipo_codigo: 'transcripcion'
      }];
      
      this.modeloSeleccionado = this.modelosDisponibles[0];
    }

    // Luego cargar modelos de IA
    this.iaModelosService.obtenerPorTipo('transcripcion').subscribe({
      next: (response: any) => {
        const modelosIA = response.modelos || [];
        
        if (this.soportaWebSpeech) {
          this.modelosDisponibles = [...this.modelosDisponibles, ...modelosIA];
        } else {
          this.modelosDisponibles = modelosIA;
          const modeloPredeterminado = modelosIA.find((m: IAModelo) => m.es_predeterminado);
          this.modeloSeleccionado = modeloPredeterminado || modelosIA[0] || null;
        }

        this.cargandoModelos = false;
      },
      error: (error: any) => {
        console.error('Error cargando modelos:', error);
        this.cargandoModelos = false;
        // Si hay error, al menos tenemos Web Speech API
      }
    });
  }

  async iniciarGrabacion() {
    if (!this.modeloSeleccionado) {
      this.notificationService.warning('Por favor seleccione un modelo de transcripción');
      return;
    }

    this.mensajeError = '';
    
    // Guardar el texto actual como base
    this.transcripcionContinua = this.textoTranscritoActual || '';

    try {
      if (this.modeloSeleccionado.proveedor === 'navegador') {
        // Marcar como grabando antes de iniciar
        this.estaGrabando = true;
        await this.speechService.startListening();
        console.log('Transcripción iniciada');
      } else {
        this.estaGrabando = true;
        await this.iniciarGrabacionAudio();
      }
    } catch (error: any) {
      console.error('Error al iniciar grabación:', error);
      this.estaGrabando = false;
      
      if (error.name === 'NotAllowedError' || error.message?.includes('denied')) {
        this.mensajeError = 'Permisos de micrófono denegados. Por favor, permite el acceso al micrófono.';
      } else {
        this.mensajeError = 'No se pudo acceder al micrófono: ' + (error.message || 'Error desconocido');
      }
    }
  }

  private async iniciarGrabacionAudio() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    this.mediaRecorder = new MediaRecorder(stream);
    this.audioChunks = [];

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start();
    this.iniciarTemporizador();
  }

  private iniciarTemporizador() {
    this.tiempoGrabacion = 0;

    this.intervaloTiempo = setInterval(() => {
      this.tiempoGrabacion++;

      if (this.tiempoGrabacion >= this.limiteSegundos) {
        this.detenerGrabacion();
        this.notificationService.warning(`Límite de grabación alcanzado (${this.limiteSegundos} segundos)`);
      }
    }, 1000);
  }

  async detenerGrabacion() {
    if (!this.estaGrabando) return;

    this.estaGrabando = false;

    if (this.intervaloTiempo) {
      clearInterval(this.intervaloTiempo);
    }

    try {
      if (this.modeloSeleccionado?.proveedor === 'navegador') {
        this.speechService.stopListening();
        // El procesamiento se hace en el subscribe cuando isListening cambia a false
      } else {
        // Lógica para IA
        this.estaProcesando = true;
        
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop();

          await new Promise(resolve => {
            this.mediaRecorder!.onstop = resolve;
          });

          await this.procesarTranscripcionIA();
        }
      }
    } catch (error) {
      console.error('Error al detener grabación:', error);
      this.mensajeError = 'Error al procesar la grabación';
    } finally {
      this.limpiarRecursos();
      this.estaProcesando = false;
    }
  }

  private procesarResultadoWebSpeech() {
    const textoNuevo = this.speechService.getCurrentTranscript().trim();
    const textoOriginal = (this.transcripcionContinua || '').trim();
    
    console.log('Procesando resultado:', { textoNuevo, textoOriginal });
    
    if (textoNuevo && textoNuevo !== textoOriginal) {
      this.textoTranscritoTemporal = textoNuevo;
      this.confianzaTranscripcion = 0.95;
      
      if (textoOriginal) {
        this.mostrarModalConfirmacion = true;
      } else {
        this.usarTextoCompleto();
      }
    } else if (!textoNuevo) {
      this.notificationService.info('No se detectó ninguna transcripción. Habla más cerca del micrófono.');
    }
  }

  private async procesarTranscripcionIA() {
    if (this.audioChunks.length === 0) {
      this.mensajeError = 'No se grabó audio';
      return;
    }

    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('audio', audioBlob, 'grabacion.webm');
    formData.append('modelo_id', this.modeloSeleccionado!.id.toString());

    try {
      const resultado = await this.iaModelosService.transcribir(formData).toPromise();

      if (resultado?.success && resultado.texto) {
        this.textoTranscritoTemporal = resultado.texto;
        this.confianzaTranscripcion = resultado.confianza || 0.95;

        if (this.value && this.value.trim()) {
          this.mostrarModalConfirmacion = true;
        } else {
          this.usarTextoCompleto();
        }
      } else {
        throw new Error(resultado?.error || 'Error en la transcripción');
      }

    } catch (error: any) {
      console.error('Error en transcripción:', error);
      this.mensajeError = error.message || 'Error al transcribir el audio';
    }
  }

  private limpiarRecursos() {
    if (this.mediaRecorder && this.mediaRecorder.stream) {
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  private detenerTodo() {
    if (this.soportaWebSpeech) {
      this.speechService.stopListening();
    }
    this.limpiarRecursos();
    
    if (this.intervaloTiempo) {
      clearInterval(this.intervaloTiempo);
    }
  }

  // Métodos del modal
  cancelarTranscripcion() {
    this.mostrarModalConfirmacion = false;
    this.textoTranscritoTemporal = '';
  }

  reemplazarTexto() {
    this.value = this.textoTranscritoTemporal;
    this.mostrarModalConfirmacion = false;
    this.textoTranscritoTemporal = '';
  }

  agregarAlFinal() {
    const textoActual = this.value || '';
    const separador = textoActual.endsWith('.') || !textoActual ? ' ' : '. ';
    this.value = textoActual + separador + this.textoTranscritoTemporal;
    this.mostrarModalConfirmacion = false;
    this.textoTranscritoTemporal = '';
  }

  usarTextoCompleto() {
    this.value = this.textoTranscritoTemporal;
    this.mostrarModalConfirmacion = false;
    this.textoTranscritoTemporal = '';
  }

  formatearTiempo(segundos: number): string {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}