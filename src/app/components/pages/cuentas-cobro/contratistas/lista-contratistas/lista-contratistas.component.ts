import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HasPermissionDirective } from '../../../../../directives/has-permission.directive';
import { AuthService } from '../../../../../services/auth.service';
import { NotificationService } from '../../../../../services/notification.service';
import { ContratistasService, Contratista } from '../../../../../services/contratistas.service';
import { BreadcrumbComponent } from '../../../../common/breadcrumb/breadcrumb.component';
import { LayoutComponent } from '../../../../common/layout/layout.component';
import { TablasComponent } from '../../../../common/tablas/tablas.component';

@Component({
  selector: 'app-lista-contratistas',
  standalone: true,
  imports: [
    CommonModule, 
    LayoutComponent, 
    HasPermissionDirective, 
    TablasComponent, 
    BreadcrumbComponent
  ],
  templateUrl: './lista-contratistas.component.html',
  styleUrls: ['./lista-contratistas.component.scss']
})
export class ListaContratistasComponent implements OnInit {
  contratistas: any[] = [];
  titulos: any[] = [];
  columnasFiltro = ['Identificación', 'Nombre', 'Email', 'Teléfono'];
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService,
    private contratistasService: ContratistasService
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
        clave: 'nombre_completo',
        alias: 'Nombre Completo',
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

  cargarContratistas() {
    this.isLoading = true;
    
    this.contratistasService.obtenerTodos().subscribe({
      next: (contratistas) => {
        console.log('Contratistas recibidos:', contratistas);
        this.contratistas = contratistas.map(contratista => ({
          ...contratista,
          contratos_info: this.generarInfoContratos(contratista),
          activo_badge: this.generarBadgeEstado(contratista.activo)
        }));
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error detallado al cargar contratistas:', error);
        this.notificationService.error(error.message || 'Error al cargar contratistas');
        this.isLoading = false;
        this.contratistas = []; // Limpiar la lista en caso de error
      }
    });
  }

  generarInfoContratos(contratista: Contratista): string {
    const total = contratista.total_contratos || 0;
    const activos = contratista.contratos_activos || 0;
    
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
      ? '<span class="badge badge-success">Activo</span>'
      : '<span class="badge badge-danger">Inactivo</span>';
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
    this.router.navigate(['/cuentas-cobro/contratistas/crear']);
  }

  verDetalle(id: number) {
    this.router.navigate(['/cuentas-cobro/contratistas/detalle', id]);
  }

  editar(id: number) {
    this.router.navigate(['/cuentas-cobro/contratistas/editar', id]);
  }

  eliminar(id: number, contratista: any) {
    // Verificar si tiene contratos activos
    if (contratista.contratos_activos > 0) {
      this.notificationService.warning(
        'No se puede eliminar un contratista con contratos activos'
      );
      return;
    }

    this.notificationService.confirm(
      `¿Está seguro de eliminar al contratista "${contratista.nombre_completo}"?`,
      () => {
        this.contratistasService.eliminar(id).subscribe({
          next: () => {
            this.notificationService.success('Contratista eliminado correctamente');
            this.cargarContratistas();
          },
          error: (error) => {
            const mensaje = error.message || 'Error al eliminar contratista';
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