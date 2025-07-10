import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HasPermissionDirective } from '../../../../../directives/has-permission.directive';
import { AuthService } from '../../../../../services/auth.service';
import { NotificationService } from '../../../../../services/notification.service';
import { ActividadesService, Actividad } from '../../../../../services/actividades.service';
import { ContratosService, Contrato } from '../../../../../services/contratos.service';
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
  contratos: Contrato[] = [];
  titulos: any[] = [];
  columnasFiltro = ['Fecha', 'Contrato', 'Descripción', 'Obligación'];
  isLoading = false;
  
  // Filtros
  contratoSeleccionado: number | null = null;
  mesSeleccionado: number = new Date().getMonth() + 1;
  anioSeleccionado: number = new Date().getFullYear();

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService,
    private actividadesService: ActividadesService,
    private contratosService: ContratosService
  ) {}

  ngOnInit() {
    this.configurarTitulos();
    this.cargarContratos();
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
        clave: 'contrato_numero',
        alias: 'Contrato',
        alinear: 'izquierda'
      },
      {
        clave: 'descripcion_corta',
        alias: 'Descripción',
        alinear: 'izquierda',
        tipo: 'html'
      },
      {
        clave: 'obligacion_info',
        alias: 'Obligación',
        alinear: 'izquierda',
        tipo: 'html'
      },
      {
        clave: 'adjuntos_badge',
        alias: 'Adjuntos',
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

  cargarContratos() {
    this.isLoading = true;
    
    this.contratosService.obtenerTodos().subscribe({
      next: (contratos) => {
        // Filtrar solo contratos activos
        this.contratos = contratos.filter(c => c.estado === 'activo');
        
        // Si es un usuario básico (contratista), filtrar solo sus contratos
        // Usar el email del localStorage como referencia
        const userEmail = localStorage.getItem('userEmail');
        if (userEmail && !this.authService.hasPermission('contratos.gestionar')) {
          this.contratos = this.contratos.filter(c => 
            c.contratista_identificacion === userEmail
          );
        }
        
        // Si solo hay un contrato, seleccionarlo automáticamente
        if (this.contratos.length === 1) {
          this.contratoSeleccionado = this.contratos[0].id!;
          this.cargarActividades();
        } else if (this.contratos.length > 1) {
          // Verificar si hay contrato guardado
          const contratoGuardado = localStorage.getItem('ultimoContratoSeleccionado');
          if (contratoGuardado && this.contratos.find(c => c.id === parseInt(contratoGuardado))) {
            this.contratoSeleccionado = parseInt(contratoGuardado);
            this.cargarActividades();
          }
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar contratos:', error);
        this.notificationService.error('Error al cargar contratos');
        this.isLoading = false;
      }
    });
  }

  cargarActividades() {
    if (!this.contratoSeleccionado) return;
    
    this.isLoading = true;
    localStorage.setItem('ultimoContratoSeleccionado', this.contratoSeleccionado.toString());
    
    this.actividadesService.obtenerPorPeriodo(
      this.contratoSeleccionado, 
      this.mesSeleccionado, 
      this.anioSeleccionado
    ).subscribe({
      next: (actividades) => {
        const contrato = this.contratos.find(c => c.id === this.contratoSeleccionado);
        
        this.actividades = actividades.map(actividad => ({
          ...actividad,
          contrato_numero: contrato?.numero_contrato || 'N/A',
          descripcion_corta: this.generarDescripcionCorta(actividad),
          obligacion_info: this.generarObligacionInfo(actividad),
          adjuntos_badge: this.generarAdjuntosBadge(actividad),
          procesado_badge: this.generarProcesadoBadge(actividad)
        }));
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar actividades:', error);
        this.notificationService.error('Error al cargar actividades');
        this.isLoading = false;
        this.actividades = [];
      }
    });
  }

  generarDescripcionCorta(actividad: Actividad): string {
    const descripcion = actividad.descripcion_actividad || '';
    const corta = descripcion.length > 100 ? descripcion.substring(0, 100) + '...' : descripcion;
    
    let html = `<div>${corta}</div>`;
    
    // Indicar si tiene transcripción
    if (actividad.transcripcion_texto) {
      html += '<small class="text-muted"><i class="fas fa-microphone"></i> Con transcripción</small>';
    }
    
    return html;
  }

generarObligacionInfo(actividad: Actividad): string {
    // Verificar si tiene obligaciones (array)
    if (!actividad.obligaciones || actividad.obligaciones.length === 0) {
      return '<span class="text-muted">Sin asociar</span>';
    }
    
    // Si tiene la información concatenada del backend
    if (actividad.obligaciones_info) {
      return `<div class="small">${actividad.obligaciones_info}</div>`;
    }
    
    // Si tiene el array de obligaciones, construir el HTML
    const obligacionesHtml = actividad.obligaciones.map(obl => 
      `<strong>${obl.numero_obligacion}.</strong> ${obl.descripcion.substring(0, 50)}...`
    ).join(' | ');
    
    return `<div class="small">${obligacionesHtml}</div>`;
  }

  generarAdjuntosBadge(actividad: any): string {
    if (!actividad.total_archivos || actividad.total_archivos === 0) {
      return '<span class="badge badge-secondary">Sin archivos</span>';
    }
    
    return `<span class="badge badge-info">${actividad.total_archivos} archivo(s)</span>`;
  }

  generarProcesadoBadge(actividad: Actividad): string {
    if (actividad.procesado_ia) {
      return '<span class="badge badge-success"><i class="fas fa-robot"></i> Procesado</span>';
    }
    
    return '<span class="badge badge-warning">Pendiente</span>';
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
            this.cargarActividades();
          },
          error: (error) => {
            const mensaje = error.message || 'Error al eliminar actividad';
            this.notificationService.error(mensaje);
          }
        });
      }
    );
  }

  onContratoChange() {
    if (this.contratoSeleccionado) {
      this.cargarActividades();
    }
  }

  onPeriodoChange() {
    if (this.contratoSeleccionado) {
      this.cargarActividades();
    }
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