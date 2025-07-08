import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HasPermissionDirective } from '../../../../../directives/has-permission.directive';
import { AuthService } from '../../../../../services/auth.service';
import { NotificationService } from '../../../../../services/notification.service';
import { EntidadesService, Entidad } from '../../../../../services/entidades.service';
import { BreadcrumbComponent } from '../../../../common/breadcrumb/breadcrumb.component';
import { LayoutComponent } from '../../../../common/layout/layout.component';
import { TablasComponent } from '../../../../common/tablas/tablas.component';

@Component({
  selector: 'app-lista-entidades',
  standalone: true,
  imports: [
    CommonModule, 
    LayoutComponent, 
    HasPermissionDirective, 
    TablasComponent, 
    BreadcrumbComponent
  ],
  templateUrl: './lista-entidades.component.html',
  styleUrls: ['./lista-entidades.component.scss']
})
export class ListaEntidadesComponent implements OnInit {
  entidades: any[] = [];
  titulos: any[] = [];
  columnasFiltro = ['Nombre', 'Identificación', 'Email', 'Teléfono'];
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService,
    private entidadesService: EntidadesService
  ) {}

  ngOnInit() {
    this.configurarTitulos();
    this.cargarEntidades();
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
        clave: 'tipo_identificacion_codigo',
        alias: 'Tipo ID',
        alinear: 'centrado'
      },
      {
        clave: 'identificacion',
        alias: 'Identificación',
        alinear: 'izquierda'
      },
      {
        clave: 'nombre',
        alias: 'Nombre de la Entidad',
        alinear: 'izquierda'
      },
      {
        clave: 'email',
        alias: 'Email',
        alinear: 'izquierda'
      },
      {
        clave: 'telefono',
        alias: 'Teléfono',
        alinear: 'izquierda'
      },
      {
        clave: 'contratos_info',
        alias: 'Contratos',
        alinear: 'centrado',
        tipo: 'html'
      },
      {
        clave: 'activo_badge',
        alias: 'Estado',
        alinear: 'centrado',
        tipo: 'html'
      }
    ];
  }

  cargarEntidades() {
    this.isLoading = true;
    
    this.entidadesService.obtenerTodos().subscribe({
      next: (entidades) => {
        console.log('Entidades recibidas:', entidades);
        this.entidades = entidades.map(entidad => ({
          ...entidad,
          contratos_info: this.generarInfoContratos(entidad),
          activo_badge: this.generarBadgeEstado(entidad.activo)
        }));
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error detallado al cargar entidades:', error);
        this.notificationService.error(error.message || 'Error al cargar entidades');
        this.isLoading = false;
        this.entidades = [];
      }
    });
  }

  generarInfoContratos(entidad: Entidad): string {
    const total = entidad.total_contratos || 0;
    const activos = entidad.contratos_activos || 0;
    
    if (total === 0) {
      return '<span class="text-muted">Sin contratos</span>';
    }
    
    let html = `<div class="text-center">`;
    
    if (activos > 0) {
      html += `<span class="badge badge-success me-1">${activos} activo${activos !== 1 ? 's' : ''}</span>`;
    }
    
    const inactivos = total - activos;
    if (inactivos > 0) {
      html += `<span class="badge badge-secondary">${inactivos} inactivo${inactivos !== 1 ? 's' : ''}</span>`;
    }
    
    html += `<div class="small text-muted mt-1">Total: ${total}</div>`;
    html += '</div>';
    
    return html;
  }

  generarBadgeEstado(activo?: boolean): string {
    if (activo === undefined || activo === null) {
      return '<span class="badge badge-secondary">Desconocido</span>';
    }
    
    return activo 
      ? '<span class="badge badge-success">Activa</span>'
      : '<span class="badge badge-danger">Inactiva</span>';
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
    this.router.navigate(['/cuentas-cobro/entidades/crear']);
  }

  verDetalle(id: number) {
    this.router.navigate(['/cuentas-cobro/entidades/detalle', id]);
  }

  editar(id: number) {
    this.router.navigate(['/cuentas-cobro/entidades/editar', id]);
  }

  eliminar(id: number, entidad: any) {
    // Verificar si tiene contratos activos
    if (entidad.contratos_activos > 0) {
      this.notificationService.warning(
        'No se puede eliminar una entidad con contratos activos'
      );
      return;
    }

    this.notificationService.confirm(
      `¿Está seguro de eliminar la entidad "${entidad.nombre}"?`,
      () => {
        this.entidadesService.eliminar(id).subscribe({
          next: () => {
            this.notificationService.success('Entidad eliminada correctamente');
            this.cargarEntidades();
          },
          error: (error) => {
            const mensaje = error.message || 'Error al eliminar entidad';
            this.notificationService.error(mensaje);
          }
        });
      }
    );
  }

  hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }
}