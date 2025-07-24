import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { ChatService, MensajeChat, SesionChat, RespuestaChat } from '../../../services/chat.service';
import { NotificationService } from '../../../services/notification.service';
import { SpinnerService } from '../../../services/spinner.service';

@Component({
  selector: 'app-chat-ia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-ia.component.html',
  styleUrls: ['./chat-ia.component.scss']
})
export class ChatIaComponent implements OnInit, OnDestroy, AfterViewChecked {
  @Input() contratoId!: number;
  @Input() tituloChat: string = 'Asistente IA';
  @Input() placeholder: string = 'Escribe tu pregunta aquí...';
  @Input() mostrarHistorial: boolean = true;
  
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  @ViewChild('inputMensaje') private inputMensaje!: ElementRef;

  private destroy$ = new Subject<void>();
  
  // Estado del chat
  mensajes: MensajeChat[] = [];
  mensajeActual: string = '';
  sesionActual: SesionChat | null = null;
  sesionesAnteriores: SesionChat[] = [];
  
  // UI State
  isLoading = false;
  isSending = false;
  mostrarPanelHistorial = false;
  escribiendo = false;
  
  // Control de scroll
  private shouldScrollToBottom = true;

  constructor(
    private chatService: ChatService,
    private notificationService: NotificationService,
    private spinnerService: SpinnerService
  ) {}

  ngOnInit(): void {
    if (!this.contratoId) {
      console.error('ChatIaComponent: contratoId es requerido');
      return;
    }
    
    this.cargarSesionesAnteriores();
    this.iniciarNuevaConversacion();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch(err) {
      console.error('Error al hacer scroll:', err);
    }
  }

  cargarSesionesAnteriores(): void {
    if (!this.mostrarHistorial) return;
    
    this.chatService.listarSesiones(this.contratoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.sesionesAnteriores = response.sesiones || [];
        },
        error: (error) => {
          console.error('Error cargando sesiones:', error);
        }
      });
  }

  iniciarNuevaConversacion(): void {
    this.mensajes = [];
    this.sesionActual = null;
    this.shouldScrollToBottom = true;
    
    // Mensaje de bienvenida
    this.agregarMensajeSistema(
      `¡Hola! Soy tu asistente de actividades. 
      Puedo ayudarte a buscar información sobre las actividades registradas, 
      documentos adjuntos y obligaciones del contrato. ¿En qué puedo ayudarte?`
    );
  }

  cargarConversacion(sesion: SesionChat): void {
    this.isLoading = true;
    this.sesionActual = sesion;
    this.mensajes = [];
    
    this.chatService.obtenerHistorial(sesion.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.mensajes = response.mensajes || [];
          this.shouldScrollToBottom = true;
          this.mostrarPanelHistorial = false;
        },
        error: (error) => {
          this.notificationService.error('Error al cargar conversación');
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }

  async enviarMensaje(): Promise<void> {
    if (!this.mensajeActual.trim() || this.isSending) return;
    
    const pregunta = this.mensajeActual.trim();
    this.mensajeActual = '';
    this.isSending = true;
    
    // Agregar mensaje del usuario
    this.agregarMensajeUsuario(pregunta);
    
    // Mostrar indicador de escritura
    this.escribiendo = true;
    
    try {
      const response = await this.chatService.conversar({
        contrato_id: this.contratoId,
        pregunta: pregunta,
        continuar_sesion: !!this.sesionActual,
        sesion_id: this.sesionActual?.id
      }).toPromise();
      
      if (response) {
        // Actualizar sesión actual si es nueva
        if (!this.sesionActual && response.sesion_id) {
          this.sesionActual = {
            id: response.sesion_id,
            titulo: pregunta.substring(0, 100) + '...',
            mensajes_count: 2,
            fecha_inicio: new Date().toISOString(),
            fecha_ultimo_mensaje: new Date().toISOString()
          };
        }
        
        // Agregar respuesta de la IA
        this.agregarMensajeAsistente(response.respuesta, response.fuentes);
        
        // Actualizar lista de sesiones
        this.cargarSesionesAnteriores();
      }
      
    } catch (error: any) {
      console.error('Error en chat:', error);
      this.notificationService.error(error.message || 'Error al procesar tu pregunta');
      this.agregarMensajeSistema('Lo siento, ocurrió un error al procesar tu pregunta. Por favor, intenta nuevamente.');
    } finally {
      this.isSending = false;
      this.escribiendo = false;
      
      // Focus en el input
      setTimeout(() => {
        this.inputMensaje?.nativeElement?.focus();
      }, 100);
    }
  }

  private agregarMensajeUsuario(contenido: string): void {
    this.mensajes.push({
      rol: 'user',
      contenido,
      fecha_mensaje: new Date().toISOString()
    });
    this.shouldScrollToBottom = true;
  }

  private agregarMensajeAsistente(contenido: string, fuentes?: any[]): void {
    this.mensajes.push({
      rol: 'assistant',
      contenido,
      fecha_mensaje: new Date().toISOString()
    });
    this.shouldScrollToBottom = true;
  }

  private agregarMensajeSistema(contenido: string): void {
    this.mensajes.push({
      rol: 'system',
      contenido,
      fecha_mensaje: new Date().toISOString()
    });
    this.shouldScrollToBottom = true;
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.enviarMensaje();
    }
  }

  toggleHistorial(): void {
    this.mostrarPanelHistorial = !this.mostrarPanelHistorial;
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    
    const date = new Date(fecha);
    const ahora = new Date();
    const diffMs = ahora.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Justo ahora';
    if (diffMins < 60) return `hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    if (diffHoras < 24) return `hace ${diffHoras} hora${diffHoras > 1 ? 's' : ''}`;
    if (diffDias < 7) return `hace ${diffDias} día${diffDias > 1 ? 's' : ''}`;
    
    return date.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== ahora.getFullYear() ? 'numeric' : undefined
    });
  }
}