import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HasPermissionDirective } from '../../../../directives/has-permission.directive';
import { AuthService } from '../../../../services/auth.service';
import { NotificationService } from '../../../../services/notification.service';
import { RolesService } from '../../../../services/roles.service';
import { BreadcrumbComponent } from '../../../common/breadcrumb/breadcrumb.component';
import { LayoutComponent } from '../../../common/layout/layout.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';


interface Rol {
  id: number;
  nombre: string;
  descripcion: string;
  activo: boolean;
}

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, LayoutComponent, HasPermissionDirective, TablasComponent, BreadcrumbComponent],
  templateUrl: './roles.component.html',
  styleUrls: ['./roles.component.scss']
})
export class RolesComponent implements OnInit {
  roles: Rol[] = [];
  titulos: any[] = [];
  columnasFiltro = ['Nombre', 'Descripción'];
  accionesPersonalizadas: any[] = [];

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService,
    private rolesService: RolesService
  ) {}

  ngOnInit() {
    this.configurarTitulos();
    this.configurarAcciones();
    this.cargarRoles();
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
        clave: 'nombre',
        alias: 'Nombre',
        alinear: 'izquierda'
      },
      {
        clave: 'descripcion',
        alias: 'Descripción',
        alinear: 'izquierda'
      },
      {
        clave: 'tipo_badge',
        alias: 'Tipo',
        alinear: 'centrado',
        tipo: 'html'
      }
    ];
  }

  configurarAcciones() {
    const acciones = [];
    
    // Acción de gestionar permisos
    if (this.hasPermission('roles.editar')) {
      acciones.push({
        id: 'permisos',
        label: 'Gestionar Permisos',
        icono: 'fas fa-key'
      });
    }

    this.accionesPersonalizadas = acciones;
  }

  cargarRoles() {
    this.rolesService.obtenerTodos().subscribe({
      next: (response) => {
        const body = response.body || [];
        console.log("Consumo servicio roles", body);
        this.roles = this.procesarRoles(body);
      },
      error: (error) => {
        console.error('Error al cargar roles:', error);
        this.notificationService.error('Error al cargar roles');
      }
    });
  }

  procesarRoles(roles: any[]): any[] {
    return roles.map(rol => ({
      ...rol,
      // Identificar si es rol del sistema o personalizado
      tipo_badge: this.generarBadgeTipo(rol.nombre),
      // Asegurarse de que activo sea booleano
      activo: rol.activo !== false
    }));
  }

  generarBadgeTipo(nombreRol: string): string {
    const rolesSistema = ['admin', 'secretaria', 'supervisor', 'usuario'];
    
    if (rolesSistema.includes(nombreRol.toLowerCase())) {
      return '<span class="badge badge-info">Sistema</span>';
    } else {
      return '<span class="badge badge-secondary">Personalizado</span>';
    }
  }

  ejecutarAccion(event: any) {
    console.log('Acción ejecutada:', event);
    
    switch (event.accion) {
      case 'consultar':
        this.verDetalleRol(event.id);
        break;
      
      case 'editar':
        this.editarRol(event.id);
        break;
      
      case 'eliminar':
        this.eliminarRol(event.id, event.registro);
        break;
      
      case 'permisos':
        this.gestionarPermisos(event.id, event.registro);
        break;
      
      default:
        console.warn('Acción no reconocida:', event.accion);
    }
  }

  crearRol() {
    this.router.navigate(['/configuracion/roles/crear']);
  }

  verDetalleRol(id: number) {
    this.router.navigate(['/configuracion/roles/detalle', id]);
  }

  editarRol(id: number) {
    this.router.navigate(['/configuracion/roles/editar', id]);
  }

  gestionarPermisos(id: number, rol: any) {
    this.router.navigate(['/configuracion/roles/permisos', id]);
  }

  eliminarRol(id: number, rol: any) {
    // No permitir eliminar roles del sistema
    const rolesSistema = ['admin', 'secretaria', 'supervisor', 'usuario'];
    if (rolesSistema.includes(rol.nombre.toLowerCase())) {
      this.notificationService.warning('No se pueden eliminar roles del sistema');
      return;
    }

    this.notificationService.confirm(
      `¿Está seguro de eliminar el rol "${rol.nombre}"?`,
      () => {
        this.rolesService.eliminar(id).subscribe({
          next: () => {
            this.notificationService.success('Rol eliminado correctamente');
            this.cargarRoles();
          },
          error: (error) => {
            this.notificationService.error('Error al eliminar rol');
            console.error(error);
          }
        });
      }
    );
  }

  hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }
}