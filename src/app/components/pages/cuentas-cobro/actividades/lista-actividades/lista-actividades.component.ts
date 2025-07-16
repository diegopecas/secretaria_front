import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HasPermissionDirective } from '../../../../../directives/has-permission.directive';
import { AuthService } from '../../../../../services/auth.service';
import { NotificationService } from '../../../../../services/notification.service';
import { ActividadesService, Actividad } from '../../../../../services/actividades.service';
import { ContratosService } from '../../../../../services/contratos.service';

// Interfaz extendida para incluir el campo que viene del backend
interface ContratoConNombreCorto {
  id?: number;
  numero_contrato: string;
  contratista_id: number;
  contratista_nombre?: string;
  entidad_id: number;
  entidad_nombre?: string;
  entidad_nombre_corto?: string;
  fecha_inicio: string;
  fecha_terminacion: string;
  valor_total: number;
  estado?: 'activo' | 'suspendido' | 'finalizado' | 'liquidado';
  [key: string]: any; // Para otros campos que puedan venir del backend
}
import { ContratistasService, Contratista } from '../../../../../services/contratistas.service';
import { UsuariosContratistasService } from '../../../../../services/usuarios-contratistas.service';
import { BreadcrumbComponent } from '../../../../common/breadcrumb/breadcrumb.component';
import { LayoutComponent } from '../../../../common/layout/layout.component';
import { TablasComponent } from '../../../../common/tablas/tablas.component';

@Component({
  selector: 'app-lista-actividades',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    LayoutComponent, 
    HasPermissionDirective, 
    TablasComponent, 
    BreadcrumbComponent
  ],
  templateUrl: './lista-actividades.component.html',
  styleUrls: ['./lista-actividades.component.scss']
})
export class ListaActividadesComponent implements OnInit {
  actividades: any[] = [];
  contratistas: Contratista[] = [];
  contratos: ContratoConNombreCorto[] = [];
  titulos: any[] = [];
  columnasFiltro = ['fecha_actividad', 'descripcion_actividad'];
  isLoading = false;
  
  // Filtros en cascada
  contratistaSeleccionado: number | null = null;
  contratoSeleccionado: number | null = null;
  mesSeleccionado: number = new Date().getMonth() + 1;
  anioSeleccionado: number = new Date().getFullYear();
  
  // Control de filtros
  mostrarFiltros = true; // Siempre visible
  filtrosAplicados = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService,
    private actividadesService: ActividadesService,
    private contratosService: ContratosService,
    private contratistasService: ContratistasService,
    private usuariosContratistasService: UsuariosContratistasService
  ) {}

  ngOnInit() {
    this.configurarTitulos();
    this.cargarContratistas();
  }

  configurarTitulos() {
    this.titulos = [
      {
        clave: 'id',
        alias: 'ID',
        alinear: 'centrado',
        tipo: 'integer'
      },
      {
        clave: 'fecha_actividad',
        alias: 'Fecha',
        alinear: 'centrado',
        tipo: 'fecha'
      },
      {
        clave: 'descripcion_actividad',
        alias: 'Descripción',
        alinear: 'izquierda'
      },
      {
        clave: 'procesado_badge',
        alias: 'Estado IA',
        alinear: 'centrado',
        tipo: 'html'
      }
    ];
  }

  cargarContratistas() {
    this.isLoading = true;
    
    // Obtener contratistas según permisos
    this.usuariosContratistasService.obtenerMisContratistas().subscribe({
      next: (contratistas) => {
        this.contratistas = contratistas.filter(c => c.activo);
        
        // Si solo hay un contratista, seleccionarlo automáticamente
        if (this.contratistas.length === 1) {
          this.contratistaSeleccionado = this.contratistas[0].id!;
          this.cargarContratos();
        } else if (this.contratistas.length > 1) {
          // Buscar si hay uno principal
          const principal = this.contratistas.find(c => c.es_principal === true);
          if (principal) {
            this.contratistaSeleccionado = principal.id!;
            this.cargarContratos();
          }
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar contratistas:', error);
        this.notificationService.error('Error al cargar contratistas');
        this.isLoading = false;
      }
    });
  }

  cargarContratos() {
    if (!this.contratistaSeleccionado) {
      this.contratos = [];
      this.contratoSeleccionado = null;
      return;
    }
    
    this.isLoading = true;
    
    this.contratosService.obtenerPorContratista(this.contratistaSeleccionado).subscribe({
      next: (contratos: any[]) => {
        this.contratos = contratos;
        
        // Si había un contrato seleccionado que ya no existe, limpiarlo
        if (this.contratoSeleccionado && !contratos.find(c => c.id === this.contratoSeleccionado)) {
          this.contratoSeleccionado = null;
        }
        
        // Si solo hay un contrato activo, seleccionarlo
        const activos = contratos.filter(c => c.estado === 'activo');
        if (activos.length === 1) {
          this.contratoSeleccionado = activos[0].id!;
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar contratos:', error);
        this.notificationService.error('Error al cargar contratos');
        this.isLoading = false;
        this.contratos = [];
      }
    });
  }

  aplicarFiltros() {
    if (!this.contratistaSeleccionado || !this.contratoSeleccionado) {
      this.notificationService.warning('Debe seleccionar contratista y contrato');
      return;
    }
    
    this.isLoading = true;
    this.filtrosAplicados = true;
    
    const filtros = {
      contrato_id: this.contratoSeleccionado,
      mes: this.mesSeleccionado,
      anio: this.anioSeleccionado
    };
    
    this.actividadesService.obtenerTodas(filtros).subscribe({
      next: (actividades) => {
        this.actividades = actividades.map(actividad => ({
          ...actividad,
          procesado_badge: this.generarProcesadoBadge(actividad)
        }));
        
        this.isLoading = false;
        
        if (this.actividades.length === 0) {
          this.notificationService.info('No se encontraron actividades para los filtros seleccionados');
        }
      },
      error: (error) => {
        console.error('Error al cargar actividades:', error);
        this.notificationService.error('Error al cargar actividades');
        this.isLoading = false;
        this.actividades = [];
      }
    });
  }

  limpiarFiltros() {
    this.contratistaSeleccionado = null;
    this.contratoSeleccionado = null;
    this.mesSeleccionado = new Date().getMonth() + 1;
    this.anioSeleccionado = new Date().getFullYear();
    this.contratos = [];
    this.actividades = [];
    this.filtrosAplicados = false;
  }

  onContratistaChange() {
    this.contratoSeleccionado = null;
    this.actividades = [];
    this.filtrosAplicados = false;
    
    if (this.contratistaSeleccionado) {
      this.cargarContratos();
    } else {
      this.contratos = [];
    }
  }

  onContratoChange() {
    this.actividades = [];
    this.filtrosAplicados = false;
  }

  generarProcesadoBadge(actividad: Actividad): string {
    if (actividad.procesado_ia) {
      return '<span class="badge badge-success"><i class="fas fa-robot"></i> Procesado</span>';
    }
    
    return '<span class="badge badge-warning"><i class="fas fa-clock"></i> Pendiente</span>';
  }

  ejecutarAccion(event: any) {
    switch (event.accion) {
      case 'consultar':
        this.verDetalle(event.id);
        break;
      
      case 'editar':
        this.editar(event.id);
        break;
      
      case 'eliminar':
        this.eliminar(event.id, event.registro);
        break;
      
      default:
        console.warn('Acción no reconocida:', event.accion);
    }
  }

  crear() {
    // Guardar filtros actuales en localStorage para precargarlos en el formulario
    if (this.contratistaSeleccionado) {
      localStorage.setItem('ultimoContratistaSeleccionado', this.contratistaSeleccionado.toString());
    }
    if (this.contratoSeleccionado) {
      localStorage.setItem('ultimoContratoSeleccionado', this.contratoSeleccionado.toString());
    }
    
    this.router.navigate(['/cuentas-cobro/actividades/crear']);
  }

  verDetalle(id: number) {
    this.router.navigate(['/cuentas-cobro/actividades/detalle', id]);
  }

  editar(id: number) {
    this.router.navigate(['/cuentas-cobro/actividades/editar', id]);
  }

  eliminar(id: number, actividad: any) {
    this.notificationService.confirm(
      `¿Está seguro de eliminar la actividad del ${this.formatearFecha(actividad.fecha_actividad)}?`,
      () => {
        this.actividadesService.eliminar(id).subscribe({
          next: () => {
            this.notificationService.success('Actividad eliminada correctamente');
            // Recargar actividades
            if (this.filtrosAplicados) {
              this.aplicarFiltros();
            }
          },
          error: (error) => {
            const mensaje = error.message || 'Error al eliminar actividad';
            this.notificationService.error(mensaje);
          }
        });
      }
    );
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return 'N/A';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-CO', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  getMeses() {
    return [
      { value: 1, label: 'Enero' },
      { value: 2, label: 'Febrero' },
      { value: 3, label: 'Marzo' },
      { value: 4, label: 'Abril' },
      { value: 5, label: 'Mayo' },
      { value: 6, label: 'Junio' },
      { value: 7, label: 'Julio' },
      { value: 8, label: 'Agosto' },
      { value: 9, label: 'Septiembre' },
      { value: 10, label: 'Octubre' },
      { value: 11, label: 'Noviembre' },
      { value: 12, label: 'Diciembre' }
    ];
  }

  getAnios(): number[] {
    const anioActual = new Date().getFullYear();
    const anios = [];
    for (let i = anioActual; i >= anioActual - 5; i--) {
      anios.push(i);
    }
    return anios;
  }

  hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }
}