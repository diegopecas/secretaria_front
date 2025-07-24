import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

// Directivas y componentes
import { HasPermissionDirective } from '../../../../../directives/has-permission.directive';
import { LayoutComponent } from '../../../../common/layout/layout.component';
import { BreadcrumbComponent } from '../../../../common/breadcrumb/breadcrumb.component';
import { ChatIaComponent } from '../../../../common/chat-ia/chat-ia.component';

// Servicios
import { NotificationService } from '../../../../../services/notification.service';
import { ContratosService, Contrato } from '../../../../../services/contratos.service';
import { ContratistasService, Contratista } from '../../../../../services/contratistas.service';
import { UsuariosContratistasService } from '../../../../../services/usuarios-contratistas.service';
import { AuthService } from '../../../../../services/auth.service';
import { ChatService } from '../../../../../services/chat.service';

@Component({
  selector: 'app-contratista-chat-ia',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LayoutComponent,
    BreadcrumbComponent,
    ChatIaComponent
  ],
  templateUrl: './contratista-chat-ia.component.html',
  styleUrls: ['./contratista-chat-ia.component.scss']
})
export class ContratistaChatIaComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Estado del componente
  isLoading = false;
  chatHabilitado = false;
  
  // Datos de usuario
  esUsuarioContratista = false;
  contratistaUsuario: Contratista | null = null;
  
  // Datos de selección
  contratistas: Contratista[] = [];
  contratos: Contrato[] = [];
  contratistaSeleccionado: number | null = null;
  contratoSeleccionado: number | null = null;
  contratoInfo: Contrato | null = null;
  
  // Configuración del chat
  tituloChat = 'Asistente de Actividades';
  placeholderChat = '¿Qué información necesitas sobre las actividades del contrato?';

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private contratosService: ContratosService,
    private contratistasService: ContratistasService,
    private usuariosContratistasService: UsuariosContratistasService,
    private chatService: ChatService
  ) {}

  ngOnInit(): void {
    this.verificarPermisos();
    this.cargarDatosUsuario();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private verificarPermisos(): void {
    if (!this.authService.hasPermission('actividades.chat')) {
      this.notificationService.error('No tiene permisos para usar el chat');
      // Redirigir o manejar según necesites
    }
  }

  private async cargarDatosUsuario(): Promise<void> {
    this.isLoading = true;
    
    try {
      // Obtener contratistas del usuario
      const contratistas = await this.usuariosContratistasService
        .obtenerMisContratistas()
        .toPromise();
      
      this.contratistas = contratistas || [];
      
      // Determinar si el usuario es contratista
      if (this.contratistas.length === 1) {
        this.esUsuarioContratista = true;
        this.contratistaUsuario = this.contratistas[0];
        this.contratistaSeleccionado = this.contratistaUsuario.id!;
        
        // Cargar contratos automáticamente
        await this.cargarContratos();
      } else if (this.contratistas.length > 1) {
        // Buscar si hay uno principal
        const principal = this.contratistas.find(c => c.es_principal === true);
        if (principal) {
          this.contratistaSeleccionado = principal.id!;
          await this.cargarContratos();
        }
      }
      
    } catch (error) {
      console.error('Error cargando datos del usuario:', error);
      this.notificationService.error('Error al cargar información del usuario');
    } finally {
      this.isLoading = false;
    }
  }

  async onContratistaChange(): Promise<void> {
    // Limpiar selecciones dependientes
    this.contratos = [];
    this.contratoSeleccionado = null;
    this.contratoInfo = null;
    this.chatHabilitado = false;
    
    if (this.contratistaSeleccionado) {
      await this.cargarContratos();
    }
  }

  private async cargarContratos(): Promise<void> {
    if (!this.contratistaSeleccionado) return;
    
    this.isLoading = true;
    
    try {
      const contratos = await this.contratosService
        .obtenerPorContratista(this.contratistaSeleccionado)
        .toPromise();
      
      this.contratos = contratos || [];
      
      // Si solo hay un contrato activo, preseleccionarlo
      const contratosActivos = this.contratos.filter(c => c.estado === 'activo');
      if (contratosActivos.length === 1) {
        this.contratoSeleccionado = contratosActivos[0].id!;
        await this.onContratoChange();
      }
      
    } catch (error) {
      console.error('Error cargando contratos:', error);
      this.notificationService.error('Error al cargar contratos');
    } finally {
      this.isLoading = false;
    }
  }

  async onContratoChange(): Promise<void> {
    this.chatHabilitado = false;
    this.contratoInfo = null;
    
    if (this.contratoSeleccionado) {
      await this.cargarInfoContrato();
    }
  }

  private async cargarInfoContrato(): Promise<void> {
    if (!this.contratoSeleccionado) return;
    
    this.isLoading = true;
    
    try {
      const contrato = await this.contratosService
        .obtenerPorId(this.contratoSeleccionado)
        .toPromise();
      
      if (contrato) {
        this.contratoInfo = contrato;
        this.chatHabilitado = true;
        
        // Personalizar título del chat
        this.tituloChat = `Chat IA - ${contrato.numero_contrato}`;
        
        // Intentar generar resumen si no existe
        if (!contrato.resumen_ia) {
          this.generarResumenContrato();
        }
      }
      
    } catch (error) {
      console.error('Error cargando información del contrato:', error);
      this.notificationService.error('Error al cargar información del contrato');
    } finally {
      this.isLoading = false;
    }
  }

  private async generarResumenContrato(): Promise<void> {
    if (!this.contratoSeleccionado) return;
    
    try {
      await this.chatService
        .generarResumenContrato(this.contratoSeleccionado)
        .toPromise();
      
      // No es crítico si falla, solo es para mejorar las respuestas
    } catch (error) {
      console.error('Error generando resumen:', error);
    }
  }

  get puedeUsarChat(): boolean {
    return this.chatHabilitado && 
           !!this.contratoSeleccionado && 
           this.authService.hasPermission('actividades.chat');
  }
}