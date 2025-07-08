import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HasPermissionDirective } from '../../../../../directives/has-permission.directive';
import { AuthService } from '../../../../../services/auth.service';
import { NotificationService } from '../../../../../services/notification.service';
import { ContratosService, Contrato } from '../../../../../services/contratos.service';
import { BreadcrumbComponent } from '../../../../common/breadcrumb/breadcrumb.component';
import { LayoutComponent } from '../../../../common/layout/layout.component';
import { TablasComponent } from '../../../../common/tablas/tablas.component';

@Component({
  selector: 'app-lista-contratos',
  standalone: true,
  imports: [
    CommonModule, 
    LayoutComponent, 
    HasPermissionDirective, 
    TablasComponent, 
    BreadcrumbComponent
  ],
  templateUrl: './lista-contratos.component.html',
  styleUrls: ['./lista-contratos.component.scss']
})
export class ListaContratosComponent implements OnInit {
  contratos: any[] = [];
  titulos: any[] = [];
  columnasFiltro = ['Número', 'Contratista', 'Entidad', 'Objeto'];
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService,
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
        clave: 'numero_contrato',
        alias: 'Número de Contrato',
        alinear: 'izquierda'
      },
      {
        clave: 'contratista_nombre',
        alias: 'Contratista',
        alinear: 'izquierda'
      },
      {
        clave: 'entidad_nombre',
        alias: 'Entidad',
        alinear: 'izquierda'
      },
      {
        clave: 'fecha_periodo',
        alias: 'Período',
        alinear: 'centrado',
        tipo: 'html'
      },
      {
        clave: 'valor_formateado',
        alias: 'Valor Total',
        alinear: 'derecha',
        tipo: 'html'
      },
      {
        clave: 'dias_info',
        alias: 'Días Restantes',
        alinear: 'centrado',
        tipo: 'html'
      },
      {
        clave: 'estado_badge',
        alias: 'Estado',
        alinear: 'centrado',
        tipo: 'html'
      }
    ];
  }

  cargarContratos() {
    this.isLoading = true;
    
    this.contratosService.obtenerTodos().subscribe({
      next: (contratos) => {
        console.log('Contratos recibidos:', contratos);
        this.contratos = contratos.map(contrato => ({
          ...contrato,
          fecha_periodo: this.generarPeriodo(contrato),
          valor_formateado: this.formatearValor(contrato.valor_total),
          dias_info: this.generarInfoDias(contrato.dias_restantes),
          estado_badge: this.generarBadgeEstado(contrato.estado)
        }));
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error detallado al cargar contratos:', error);
        this.notificationService.error(error.message || 'Error al cargar contratos');
        this.isLoading = false;
        this.contratos = [];
      }
    });
  }

  generarPeriodo(contrato: Contrato): string {
    return `
      <div class="text-center">
        <small class="text-muted">Inicio:</small> ${this.formatearFecha(contrato.fecha_inicio)}<br>
        <small class="text-muted">Fin:</small> ${this.formatearFecha(contrato.fecha_terminacion)}
      </div>
    `;
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return 'N/A';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-CO', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  formatearValor(valor: number): string {
    if (!valor) return '<span class="text-muted">$0</span>';
    return `<strong>$${valor.toLocaleString('es-CO')}</strong>`;
  }

  generarInfoDias(dias?: number): string {
    if (dias === undefined || dias === null) {
      return '<span class="text-muted">N/A</span>';
    }

    if (dias < 0) {
      return `<span class="badge badge-danger">Vencido hace ${Math.abs(dias)} días</span>`;
    } else if (dias === 0) {
      return '<span class="badge badge-warning">Vence hoy</span>';
    } else if (dias <= 30) {
      return `<span class="badge badge-warning">${dias} días</span>`;
    } else if (dias <= 90) {
      return `<span class="badge badge-info">${dias} días</span>`;
    } else {
      return `<span class="badge badge-success">${dias} días</span>`;
    }
  }

  generarBadgeEstado(estado?: string): string {
    if (!estado) {
      return '<span class="badge badge-secondary">Sin estado</span>';
    }

    const badges: { [key: string]: string } = {
      'activo': '<span class="badge badge-success">Activo</span>',
      'suspendido': '<span class="badge badge-warning">Suspendido</span>',
      'finalizado': '<span class="badge badge-secondary">Finalizado</span>',
      'liquidado': '<span class="badge badge-info">Liquidado</span>'
    };

    return badges[estado] || `<span class="badge badge-secondary">${estado}</span>`;
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
    this.router.navigate(['/cuentas-cobro/contratos/crear']);
  }

  verDetalle(id: number) {
    this.router.navigate(['/cuentas-cobro/contratos/detalle', id]);
  }

  editar(id: number) {
    this.router.navigate(['/cuentas-cobro/contratos/editar', id]);
  }

  eliminar(id: number, contrato: any) {
    // Verificar si el contrato está activo
    if (contrato.estado === 'activo') {
      this.notificationService.warning(
        'No se puede eliminar un contrato activo. Primero debe finalizarlo o liquidarlo.'
      );
      return;
    }

    this.notificationService.confirm(
      `¿Está seguro de eliminar el contrato "${contrato.numero_contrato}"?`,
      () => {
        // Por ahora, solo cambiar estado a 'liquidado' ya que no hay método eliminar en el servicio
        this.contratosService.cambiarEstado(id, 'liquidado').subscribe({
          next: () => {
            this.notificationService.success('Contrato liquidado correctamente');
            this.cargarContratos();
          },
          error: (error) => {
            const mensaje = error.message || 'Error al procesar contrato';
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