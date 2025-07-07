import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LayoutComponent } from '../../../common/layout/layout.component';
import { HasPermissionDirective } from '../../../../directives/has-permission.directive';
import { AuthService } from '../../../../services/auth.service';
import { NotificationService } from '../../../../services/notification.service';
import { UsuariosService } from '../../../../services/usuarios.service';
import { BreadcrumbComponent } from '../../../common/breadcrumb/breadcrumb.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';


interface Usuario {
  id: number;
  nombre: string;
  email: string;
  roles: string[];
  activo: boolean;
  fecha_creacion?: string;
  ultimo_acceso?: string;
}

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, LayoutComponent, HasPermissionDirective, TablasComponent, BreadcrumbComponent],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.scss']
})
export class UsuariosComponent implements OnInit {
  usuarios: Usuario[] = [];
  titulos: any[] = [];
  columnasFiltro = ['Nombre', 'Roles', 'Estado'];
  accionesPersonalizadas: any[] = [];

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService,
    private usuariosService: UsuariosService
  ) {}

  ngOnInit() {
    this.configurarTitulos();
    this.configurarAcciones();
    this.cargarUsuarios();
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
        clave: 'email',
        alias: 'Email',
        alinear: 'izquierda'
      },
      {
        clave: 'roles_badges',
        alias: 'Roles',
        alinear: 'izquierda',
        tipo: 'html'
      },
      {
        clave: 'activo_text',
        alias: 'Estado',
        alinear: 'centrado',
        tipo: 'badge',
        claseCSS: 'activo_class'
      },
      {
        clave: 'fecha_creacion',
        alias: 'Fecha Creación',
        alinear: 'centrado',
        tipo: 'date'
      },
      {
        clave: 'ultimo_acceso',
        alias: 'Último Acceso',
        alinear: 'centrado',
        tipo: 'datetime'
      }
    ];
  }

  configurarAcciones() {
    const acciones = [];
    
    // Solo agregar la acción de gestionar roles si tiene el permiso
    if (this.hasPermission('usuarios.roles')) {
      acciones.push({
        id: 'roles',
        label: 'Gestionar Roles',
        icono: '/assets/images/roles.png'
      });
    }

    // Acción de cambiar estado
    if (this.hasPermission('usuarios.editar')) {
      acciones.push({
        id: 'cambiar-estado',
        label: 'Cambiar Estado',
        icono: '/assets/images/estado.png'
      });
    }

    this.accionesPersonalizadas = acciones;
  }

  cargarUsuarios() {
    // Llamada real al servicio
    this.usuariosService.obtenerTodos().subscribe({
      next: (response) => {
        const body = response.body || [];
        this.usuarios = this.procesarUsuarios(body);
      },
      error: (error) => {
        console.error('Error al cargar usuarios:', error);
        this.notificationService.error('Error al cargar usuarios');
      }
    });
  }

  procesarUsuarios(usuarios: any[]): any[] {
    return usuarios.map(usuario => ({
      ...usuario,
      // Crear HTML para los badges de roles
      roles_badges: this.generarBadgesRoles(usuario.roles),
      // Mantener el valor booleano original
      activo: usuario.activo,
      // Crear un campo separado para el texto del badge
      activo_text: usuario.activo ? 'Activo' : 'Inactivo',
      // Clase CSS para el badge de estado
      activo_class: usuario.activo ? 'badge-success' : 'badge-danger',
      // Asegurarse de que las fechas sean válidas o null
      fecha_creacion: this.validarFecha(usuario.fecha_creacion),
      ultimo_acceso: this.validarFecha(usuario.ultimo_acceso)
    }));
  }

  validarFecha(fecha: any): string | null {
    if (!fecha) return null;
    
    // Si ya es una fecha válida, retornarla
    if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}/.test(fecha)) {
      return fecha;
    }
    
    // Si es un timestamp o fecha en otro formato, intentar convertir
    try {
      const date = new Date(fecha);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]; // Formato YYYY-MM-DD
      }
    } catch (e) {
      console.warn('Fecha inválida:', fecha);
    }
    
    return null;
  }

  generarBadgesRoles(roles: string[]): string {
    if (!roles || roles.length === 0) return '<span class="text-muted">Sin roles</span>';
    
    return roles.map(rol => {
      const nombreRol = this.getRoleName(rol);
      const claseRol = this.getRoleClass(rol);
      return `<span class="badge ${claseRol} me-1">${nombreRol}</span>`;
    }).join('');
  }

  getRoleName(role: string): string {
    const roleNames: { [key: string]: string } = {
      'admin': 'Administrador',
      'secretaria': 'Secretaria',
      'supervisor': 'Supervisor',
      'usuario': 'Usuario'
    };
    return roleNames[role] || role;
  }

  getRoleClass(role: string): string {
    const roleClasses: { [key: string]: string } = {
      'admin': 'badge-primary',
      'secretaria': 'badge-info',
      'supervisor': 'badge-warning',
      'usuario': 'badge-secondary'
    };
    return roleClasses[role] || 'badge-secondary';
  }

  ejecutarAccion(event: any) {
    switch (event.accion) {
      case 'consultar':
        this.verDetalleUsuario(event.id);
        break;
      
      case 'editar':
        this.editarUsuario(event.id);
        break;
      
      case 'eliminar':
        this.eliminarUsuario(event.id, event.registro);
        break;
      
      case 'roles':
        this.gestionarRoles(event.id, event.registro);
        break;
      
      case 'cambiar-estado':
        this.cambiarEstado(event.id, event.registro);
        break;
      
      default:
        console.warn('Acción no reconocida:', event.accion);
    }
  }

  crearUsuario() {
    // Navegar a la página de creación
    this.router.navigate(['/configuracion/usuarios/crear']);
  }

  verDetalleUsuario(id: number) {
    this.router.navigate(['/configuracion/usuarios/detalle', id]);
  }

  editarUsuario(id: number) {
    this.router.navigate(['/configuracion/usuarios/editar', id]);
  }

  eliminarUsuario(id: number, usuario: any) {
    // Usando NotificationService con confirmación
    this.notificationService.confirm(
      `¿Está seguro de eliminar al usuario "${usuario.nombre}"?`,
      () => {
        this.usuariosService.eliminar(id).subscribe({
          next: () => {
            this.notificationService.success('Usuario eliminado correctamente');
            this.cargarUsuarios();
          },
          error: (error) => {
            this.notificationService.error('Error al eliminar usuario');
            console.error(error);
          }
        });
      }
    );
    
    // Si prefieres usar SweetAlert2 como en el componente de referencia:
    /*
    Swal.fire({
      title: '¿Estás seguro?',
      text: `Se eliminará el usuario: "${usuario.nombre}". Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#FFD700',
      cancelButtonColor: '#6c757d',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.usuariosService.eliminar(id).subscribe({
          next: () => {
            Swal.fire({
              title: 'Usuario eliminado',
              text: 'El usuario ha sido eliminado correctamente.',
              icon: 'success',
              confirmButtonText: 'Aceptar',
              confirmButtonColor: '#FFD700'
            });
            this.cargarUsuarios();
          },
          error: (error) => {
            console.error('Error al eliminar usuario:', error);
            Swal.fire({
              title: 'Error',
              text: 'No se pudo eliminar el usuario. Intente más tarde.',
              icon: 'error',
              confirmButtonText: 'Aceptar'
            });
          }
        });
      }
    });
    */
  }

  gestionarRoles(id: number, usuario: any) {
    // Abrir modal o navegar a página de gestión de roles
    this.notificationService.info(`Gestionar roles de ${usuario.nombre}`);
  }

  cambiarEstado(id: number, usuario: any) {
    const nuevoEstado = !usuario.activo; // Usar el booleano original
    const accion = nuevoEstado ? 'activar' : 'desactivar';
    
    this.notificationService.confirm(
      `¿Está seguro de ${accion} al usuario "${usuario.nombre}"?`,
      () => {
        this.usuariosService.cambiarEstado(id, nuevoEstado).subscribe({
          next: () => {
            this.notificationService.success(`Usuario ${nuevoEstado ? 'activado' : 'desactivado'} correctamente`);
            this.cargarUsuarios();
          },
          error: (error) => {
            this.notificationService.error('Error al cambiar estado del usuario');
            console.error(error);
          }
        });
      }
    );
  }

  exportarUsuarios() {
    this.notificationService.info('Funcionalidad de exportar en desarrollo');
    // Aquí puedes implementar la lógica de exportación
    // Por ejemplo: generar CSV, Excel, PDF, etc.
  }

  hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }
}