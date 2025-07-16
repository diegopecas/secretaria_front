import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HasPermissionDirective } from '../../../../../directives/has-permission.directive';
import { AuthService } from '../../../../../services/auth.service';
import { NotificationService } from '../../../../../services/notification.service';
import { ActividadesService, Actividad } from '../../../../../services/actividades.service';
import { ContratosService, Contrato } from '../../../../../services/contratos.service';
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
  contratos: Contrato[] = [];
  titulos: any[] = [];
  columnasFiltro = ['Fecha', 'Contratista', 'Contrato', 'Descripción', 'Obligaciones'];
  isLoading = false;
  
  // Filtros en cascada
  contratistaSeleccionado: number | null = null;
  contratoSeleccionado: number | null = null;
  mesSeleccionado: number = new Date().getMonth() + 1;
  anioSeleccionado: number = new Date().getFullYear();
  
  // Control de filtros
  mostrarFiltros = true;
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
        clave: 'contratista_nombre',
        alias: 'Contratista',
        alinear: 'izquierda'
      },
      {
        clave: 'numero_contrato',
        alias: 'Contrato',
        alinear: 'izquierda'
      },
      {
        clave: 'entidad_nombre',
        alias: 'Entidad',
        alinear: 'izquierda'
      },
      {
        clave: 'descripcion_corta',
        alias: 'Descripción',
        alinear: 'izquierda',
        tipo: 'html'
      },
      {
        clave: 'obligaciones_badge',
        alias: 'Obligaciones',
        alinear: 'centrado',
        tipo: 'html'
      },
      {
        clave: 'adjuntos_badge',
        alias: 'Archivos',
        alinear: 'centrado',
        tipo: 'html'
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
      next: (contratos) => {
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
    if (!this.contratistaSeleccionado) {
      this.notificationService.warning('Debe seleccionar un contratista');
      return;
    }
    
    this.isLoading = true;
    this.filtrosAplicados = true;
    
    const filtros = {
      contratista_id: this.contratistaSeleccionado,
      contrato_id: this.contratoSeleccionado || undefined,
      mes: this.mesSeleccionado,
      anio: this.anioSeleccionado
    };
    
    this.actividadesService.obtenerTodas(filtros).subscribe({
      next: (actividades) => {
        this.actividades = actividades.map(actividad => ({
          ...actividad,
          descripcion_corta: this.generarDescripcionCorta(actividad),
          obligaciones_badge: this.generarObligacionesBadge(actividad),
          adjuntos_badge: this.generarAdjuntosBadge(actividad),
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

  generarDescripcionCorta(actividad: Actividad): string {
    const descripcion = actividad.descripcion_actividad || '';
    const corta = descripcion.length > 80 ? descripcion.substring(0, 80) + '...' : descripcion;
    
    let html = `<div>${corta}</div>`;
    
    // Indicar si tiene transcripción
    if (actividad.transcripcion_texto) {
      html += '<small class="text-muted d-block mt-1"><i class="fas fa-microphone"></i> Con transcripción</small>';
    }
    
    return html;
  }

  generarObligacionesBadge(actividad: Actividad): string {
    if (!actividad.obligaciones || actividad.obligaciones.length === 0) {
      return '<span class="badge badge-secondary">Sin obligaciones</span>';
    }
    
    const total = actividad.obligaciones.length;
    const numeros = actividad.obligaciones
      .map(o => o.numero_obligacion)
      .sort((a, b) => a - b)
      .join(', ');
    
    return `<span class="badge badge-info" title="Obligaciones: ${numeros}">${total} obligación${total !== 1 ? 'es' : ''}</span>`;
  }

  generarAdjuntosBadge(actividad: any): string {
    if (!actividad.total_archivos || actividad.total_archivos === 0) {
      return '<span class="badge badge-secondary">Sin archivos</span>';
    }
    
    return `<span class="badge badge-primary">${actividad.total_archivos} archivo${actividad.total_archivos !== 1 ? 's' : ''}</span>`;
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