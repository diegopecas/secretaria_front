import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LayoutComponent } from '../../../../common/layout/layout.component';
import { BreadcrumbComponent } from '../../../../common/breadcrumb/breadcrumb.component';
import { AuthService } from '../../../../../services/auth.service';
import { RolesService, Rol, Permiso } from '../../../../../services/roles.service';
import { NotificationService } from '../../../../../services/notification.service';

interface PermisoAgrupado {
  modulo: string;
  permisos: PermisoSeleccionable[];
}

interface PermisoSeleccionable extends Permiso {
  seleccionado: boolean;
}

@Component({
  selector: 'app-gestion-permisos',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    LayoutComponent, 
    BreadcrumbComponent
  ],
  templateUrl: './gestion-permisos.component.html',
  styleUrls: ['./gestion-permisos.component.scss']
})
export class GestionPermisosComponent implements OnInit {
  rolId!: number;
  rol: Rol | null = null;
  todosLosPermisos: Permiso[] = [];
  permisosAgrupados: PermisoAgrupado[] = [];
  permisosOriginales: number[] = [];
  buscador = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private rolesService: RolesService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.rolId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.rolId) {
      this.cargarDatos();
    } else {
      this.router.navigate(['/configuracion/roles']);
    }
  }

  cargarDatos() {
    // Cargar información del rol
    this.rolesService.obtenerPorId(this.rolId).subscribe({
      next: (response) => {
        this.rol = response.body;
        this.cargarPermisos();
      },
      error: (error) => {
        console.error('Error al cargar rol:', error);
        this.notificationService.error('Error al cargar el rol');
        this.router.navigate(['/configuracion/roles']);
      }
    });
  }

  cargarPermisos() {
    // Primero cargar todos los permisos disponibles
    this.rolesService.obtenerTodosLosPermisos().subscribe({
      next: (response: any) => {
        this.todosLosPermisos = response.body || response;
        this.cargarPermisosDelRol();
      },
      error: (error) => {
        console.error('Error al cargar permisos:', error);
        this.notificationService.error('Error al cargar los permisos');
      }
    });
  }

  cargarPermisosDelRol() {
    // Cargar los permisos que tiene asignados el rol
    this.rolesService.obtenerPermisos(this.rolId).subscribe({
      next: (response: any) => {
        const permisosDelRol = response.body || response || [];
        this.permisosOriginales = permisosDelRol.map((p: Permiso) => p.id);
        this.organizarPermisos(permisosDelRol);
      },
      error: (error) => {
        console.error('Error al cargar permisos del rol:', error);
        this.notificationService.error('Error al cargar los permisos del rol');
      }
    });
  }

  organizarPermisos(permisosDelRol: Permiso[]) {
    // Crear un mapa de IDs de permisos del rol para búsqueda rápida
    const idsPermisosDelRol = new Set(permisosDelRol.map(p => p.id));
    
    // Agrupar permisos por módulo
    const grupos = new Map<string, PermisoSeleccionable[]>();
    
    this.todosLosPermisos.forEach(permiso => {
      const permisoSeleccionable: PermisoSeleccionable = {
        ...permiso,
        seleccionado: idsPermisosDelRol.has(permiso.id)
      };
      
      if (!grupos.has(permiso.modulo)) {
        grupos.set(permiso.modulo, []);
      }
      
      grupos.get(permiso.modulo)!.push(permisoSeleccionable);
    });
    
    // Convertir el mapa a array y ordenar
    this.permisosAgrupados = Array.from(grupos.entries())
      .map(([modulo, permisos]) => ({
        modulo: this.capitalizarModulo(modulo),
        permisos: permisos.sort((a, b) => a.nombre.localeCompare(b.nombre))
      }))
      .sort((a, b) => a.modulo.localeCompare(b.modulo));
  }

  capitalizarModulo(modulo: string): string {
    return modulo.charAt(0).toUpperCase() + modulo.slice(1);
  }

  togglePermiso(permiso: PermisoSeleccionable) {
    permiso.seleccionado = !permiso.seleccionado;
  }

  toggleModulo(grupo: PermisoAgrupado) {
    const todosSeleccionados = grupo.permisos.every(p => p.seleccionado);
    grupo.permisos.forEach(p => p.seleccionado = !todosSeleccionados);
  }

  estaModuloSeleccionado(grupo: PermisoAgrupado): boolean {
    return grupo.permisos.every(p => p.seleccionado);
  }

  estaModuloParcialmenteSeleccionado(grupo: PermisoAgrupado): boolean {
    const seleccionados = grupo.permisos.filter(p => p.seleccionado).length;
    return seleccionados > 0 && seleccionados < grupo.permisos.length;
  }

  guardarPermisos() {
    const permisosSeleccionados = this.permisosAgrupados
      .flatMap(grupo => grupo.permisos)
      .filter(p => p.seleccionado)
      .map(p => p.id);
    
    this.rolesService.asignarPermisos(this.rolId, permisosSeleccionados).subscribe({
      next: () => {
        this.notificationService.success('Permisos actualizados correctamente');
        this.router.navigate(['/configuracion/roles']);
      },
      error: (error) => {
        console.error('Error al guardar permisos:', error);
        this.notificationService.error('Error al guardar los permisos');
      }
    });
  }

  cancelar() {
    this.router.navigate(['/configuracion/roles']);
  }

  hayBusqueda(): boolean {
    return this.buscador.trim().length > 0;
  }

  buscarPermisos(evento: Event) {
    const valor = (evento.target as HTMLInputElement).value.toLowerCase();
    this.buscador = valor;
  }

  permisoVisible(permiso: PermisoSeleccionable): boolean {
    if (!this.hayBusqueda()) return true;
    
    const busqueda = this.buscador.toLowerCase();
    return permiso.nombre.toLowerCase().includes(busqueda) || 
           permiso.descripcion.toLowerCase().includes(busqueda);
  }

  grupoVisible(grupo: PermisoAgrupado): boolean {
    if (!this.hayBusqueda()) return true;
    
    return grupo.modulo.toLowerCase().includes(this.buscador) ||
           grupo.permisos.some(p => this.permisoVisible(p));
  }

  contarPermisosSeleccionados(): number {
    return this.permisosAgrupados
      .flatMap(grupo => grupo.permisos)
      .filter(p => p.seleccionado).length;
  }

  mostrarEstadoVacio(): boolean {
    return this.hayBusqueda() && this.permisosAgrupados.every(g => !this.grupoVisible(g));
  }

  hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }
}