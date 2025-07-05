import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HasPermissionDirective } from '../../../../directives/has-permission.directive';
import { AuthService } from '../../../../services/auth.service';
import { NotificationService } from '../../../../services/notification.service';
import { RolesService, Rol, Permiso } from '../../../../services/roles.service';
import { BreadcrumbComponent } from '../../../common/breadcrumb/breadcrumb.component';
import { LayoutComponent } from '../../../common/layout/layout.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { forkJoin } from 'rxjs';

interface RolConPermisos extends Rol {
  permisos?: Permiso[];
  permisos_badges?: string;
  tipo_badge?: string;
}

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, LayoutComponent, HasPermissionDirective, TablasComponent, BreadcrumbComponent],
  templateUrl: './roles.component.html',
  styleUrls: ['./roles.component.scss']
})
export class RolesComponent implements OnInit {
  roles: RolConPermisos[] = [];
  titulos: any[] = [];
  columnasFiltro = ['Nombre', 'Descripción', 'Permisos'];
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
        clave: 'permisos_badges',
        alias: 'Permisos',
        alinear: 'izquierda',
        tipo: 'html'
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
        
        // Cargar permisos para cada rol
        this.cargarPermisosRoles(body);
      },
      error: (error) => {
        console.error('Error al cargar roles:', error);
        this.notificationService.error('Error al cargar roles');
      }
    });
  }

  cargarPermisosRoles(roles: Rol[]) {
    // Si no hay roles, no hacer nada
    if (roles.length === 0) {
      this.roles = [];
      return;
    }

    // Crear array de observables para cargar permisos de cada rol
    const permisosObservables = roles.map(rol => 
      this.rolesService.obtenerPermisos(rol.id)
    );

    // Ejecutar todas las peticiones en paralelo
    forkJoin(permisosObservables).subscribe({
      next: (permisosResponses: any[]) => {
        // Combinar roles con sus permisos
        this.roles = roles.map((rol, index) => {
          // Extraer permisos del response (puede venir como array directo o en el body)
          let permisos: Permiso[] = [];
          const response = permisosResponses[index];
          
          if (response) {
            if (Array.isArray(response)) {
              permisos = response;
            } else if (response.body && Array.isArray(response.body)) {
              permisos = response.body;
            }
          }
          
          return this.procesarRol(rol, permisos);
        });
      },
      error: (error) => {
        console.error('Error al cargar permisos:', error);
        // Si falla la carga de permisos, mostrar roles sin permisos
        this.roles = roles.map(rol => this.procesarRol(rol, []));
      }
    });
  }

  procesarRol(rol: Rol, permisos: Permiso[]): RolConPermisos {
    return {
      ...rol,
      permisos: permisos,
      // Crear HTML para los badges de permisos
      permisos_badges: this.generarBadgesPermisos(permisos),
      // Identificar si es rol del sistema o personalizado
      tipo_badge: this.generarBadgeTipo(rol.nombre),
      // Asegurarse de que activo sea booleano
      activo: rol.activo !== false
    };
  }

  generarBadgesPermisos(permisos: Permiso[]): string {
    if (!permisos || permisos.length === 0) {
      return '<span class="text-muted">Sin permisos asignados</span>';
    }
    
    // Agrupar permisos por módulo
    const permisosPorModulo: { [key: string]: number } = {};
    permisos.forEach(permiso => {
      const modulo = permiso.modulo || 'general';
      permisosPorModulo[modulo] = (permisosPorModulo[modulo] || 0) + 1;
    });
    
    // Generar badges resumidos por módulo
    const badges = Object.entries(permisosPorModulo).map(([modulo, cantidad]) => {
      const moduloCapitalizado = this.capitalize(modulo);
      return `<span class="badge badge-warning me-1" title="${cantidad} permiso(s) de ${moduloCapitalizado}">
        <i class="fas fa-key me-1"></i>${moduloCapitalizado} (${cantidad})
      </span>`;
    });
    
    // Si hay muchos módulos, mostrar resumen
    if (badges.length > 3) {
      const totalPermisos = permisos.length;
      return `<span class="badge badge-warning me-1">
        <i class="fas fa-key me-1"></i>${totalPermisos} permisos en ${badges.length} módulos
      </span>`;
    }
    
    return badges.join('');
  }

  generarBadgeTipo(nombreRol: string): string {
    const rolesSistema = ['admin', 'secretaria', 'supervisor', 'usuario'];
    
    if (rolesSistema.includes(nombreRol.toLowerCase())) {
      return '<span class="badge badge-info">Sistema</span>';
    } else {
      return '<span class="badge badge-secondary">Personalizado</span>';
    }
  }

  capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
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
        this.gestionarPermisos(event.id);
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

  gestionarPermisos(id: number) {
    // Ahora la gestión de permisos está integrada en el formulario de edición
    this.router.navigate(['/configuracion/roles/editar', id]);
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
            const mensaje = error.error?.error || 'Error al eliminar rol';
            this.notificationService.error(mensaje);
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