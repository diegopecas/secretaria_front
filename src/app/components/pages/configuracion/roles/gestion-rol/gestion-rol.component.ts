import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HasPermissionDirective } from '../../../../../directives/has-permission.directive';
import { NotificationService } from '../../../../../services/notification.service';
import { Rol, RolesService, Permiso } from '../../../../../services/roles.service';
import { UsuariosService, Usuario } from '../../../../../services/usuarios.service';
import { BreadcrumbComponent } from '../../../../common/breadcrumb/breadcrumb.component';
import { LayoutComponent } from '../../../../common/layout/layout.component';
import { ModalComponent } from '../../../../common/modal/modal.component';

type ViewMode = 'create' | 'edit' | 'view';

interface ModuloPermisos {
  nombre: string;
  permisos: Permiso[];
}

@Component({
  selector: 'app-gestion-rol',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    LayoutComponent,
    BreadcrumbComponent,
    ModalComponent,
    HasPermissionDirective
  ],
  templateUrl: './gestion-rol.component.html',
  styleUrls: ['./gestion-rol.component.scss']
})
export class GestionRolComponent implements OnInit {
  rolForm!: FormGroup;
  mode: ViewMode = 'create';
  rolId?: number;
  isLoading = false;
  showPermisosModal = false;
  showUsuariosModal = false;
  showPermisosVistaModal = false;
  esRolSistema = false;
  cantidadUsuarios = 0;
  
  // Datos
  rol: Rol | null = null;
  permisosDisponibles: Permiso[] = [];
  permisosSeleccionados: string[] = [];
  permisosTemporal: string[] = []; // Para el modal
  usuariosConRol: Usuario[] = []; // Usuarios con este rol
  
  // Búsqueda
  busquedaPermiso = '';
  busquedaPermisoModal = '';
  
  // Permisos agrupados por módulo
  modulosConPermisos: ModuloPermisos[] = [];
  modulosConPermisosAsignados: ModuloPermisos[] = [];
  
  // Títulos dinámicos
  pageTitle = 'Crear Rol';
  pageSubtitle = 'Agregue un nuevo rol al sistema';
  pageIcon = '➕';

  // Roles del sistema
  private readonly ROLES_SISTEMA = ['admin', 'secretaria', 'supervisor', 'usuario'];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private rolesService: RolesService,
    private usuariosService: UsuariosService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    // Obtener modo de la ruta
    this.mode = this.route.snapshot.data['mode'] || 'create';
    this.rolId = this.route.snapshot.params['id'];
    
    this.setPageInfo();
    this.initForm();
    this.cargarPermisos();
    
    // Si es editar o ver, cargar datos del rol
    if (this.rolId && (this.mode === 'edit' || this.mode === 'view')) {
      this.cargarRol();
    }
  }

  setPageInfo() {
    switch (this.mode) {
      case 'create':
        this.pageTitle = 'Crear Rol';
        this.pageSubtitle = 'Agregue un nuevo rol al sistema';
        this.pageIcon = '➕';
        break;
      case 'edit':
        this.pageTitle = 'Editar Rol';
        this.pageSubtitle = 'Modifique los datos del rol';
        this.pageIcon = '✏️';
        break;
      case 'view':
        this.pageTitle = 'Detalle de Rol';
        this.pageSubtitle = 'Información del rol';
        this.pageIcon = '👁️';
        break;
    }
  }

  initForm() {
    const isDisabled = this.mode === 'view';
    
    this.rolForm = this.fb.group({
      nombre: [
        { value: '', disabled: isDisabled }, 
        [Validators.required, Validators.minLength(3), Validators.maxLength(50)]
      ],
      descripcion: [
        { value: '', disabled: isDisabled }, 
        [Validators.required, Validators.minLength(5), Validators.maxLength(255)]
      ],
      activo: [{ value: true, disabled: isDisabled }]
    });
  }

  cargarRol() {
    this.isLoading = true;
    this.rolesService.obtenerPorId(this.rolId!).subscribe({
      next: (response) => {
        this.rol = response.body;
        if (this.rol) {
          // Verificar si es rol del sistema
          this.esRolSistema = this.ROLES_SISTEMA.includes(this.rol.nombre.toLowerCase());
          
          // Cargar datos del formulario
          this.rolForm.patchValue({
            nombre: this.rol.nombre,
            descripcion: this.rol.descripcion,
            activo: this.rol.activo !== false
          });
          
          // Si es rol del sistema en modo edición, deshabilitar el nombre
          if (this.esRolSistema && this.mode === 'edit') {
            this.rolForm.get('nombre')?.disable();
          }
          
          // Cargar permisos del rol
          this.cargarPermisosRol();
          
          // Cargar usuarios con este rol (tanto en modo vista como edición)
          if (this.mode === 'view' || this.mode === 'edit') {
            this.cargarUsuariosConRol();
          }
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando rol:', error);
        this.notificationService.error('Error al cargar el rol');
        this.router.navigate(['/configuracion/roles']);
      }
    });
  }

  cargarPermisos() {
    this.rolesService.obtenerTodosLosPermisos().subscribe({
      next: (response: any) => {
        // Extraer permisos del response
        let permisos: Permiso[] = [];
        if (Array.isArray(response)) {
          permisos = response;
        } else if (response.body && Array.isArray(response.body)) {
          permisos = response.body;
        }
        this.permisosDisponibles = permisos;
        this.agruparPermisosPorModulo();
      },
      error: (error) => {
        console.error('Error cargando permisos:', error);
        this.notificationService.error('Error al cargar permisos');
      }
    });
  }

  cargarPermisosRol() {
    if (!this.rolId) return;
    
    this.rolesService.obtenerPermisos(this.rolId).subscribe({
      next: (response: any) => {
        // Extraer permisos del response
        let permisos: Permiso[] = [];
        if (Array.isArray(response)) {
          permisos = response;
        } else if (response.body && Array.isArray(response.body)) {
          permisos = response.body;
        }
        this.permisosSeleccionados = permisos.map((p: Permiso) => p.nombre);
        this.agruparPermisosAsignados();
      },
      error: (error) => {
        console.error('Error cargando permisos del rol:', error);
        this.notificationService.error('Error al cargar permisos del rol');
      }
    });
  }

  agruparPermisosPorModulo() {
    const grupos: { [key: string]: Permiso[] } = {};
    
    this.permisosDisponibles.forEach(permiso => {
      const modulo = permiso.modulo || 'general';
      if (!grupos[modulo]) {
        grupos[modulo] = [];
      }
      grupos[modulo].push(permiso);
    });
    
    this.modulosConPermisos = Object.keys(grupos)
      .sort()
      .map(modulo => ({
        nombre: modulo,
        permisos: grupos[modulo].sort((a, b) => a.nombre.localeCompare(b.nombre))
      }));
    
    this.filtrarPermisos();
  }

  filtrarPermisos() {
    if (!this.busquedaPermisoModal) {
      this.agruparPermisosPorModulo();
      return;
    }
    
    const busqueda = this.busquedaPermisoModal.toLowerCase();
    const permisosFiltrados = this.permisosDisponibles.filter(p => 
      p.nombre.toLowerCase().includes(busqueda) || 
      p.descripcion.toLowerCase().includes(busqueda) ||
      p.modulo.toLowerCase().includes(busqueda)
    );
    
    const grupos: { [key: string]: Permiso[] } = {};
    permisosFiltrados.forEach(permiso => {
      const modulo = permiso.modulo || 'general';
      if (!grupos[modulo]) {
        grupos[modulo] = [];
      }
      grupos[modulo].push(permiso);
    });
    
    this.modulosConPermisos = Object.keys(grupos)
      .sort()
      .map(modulo => ({
        nombre: modulo,
        permisos: grupos[modulo].sort((a, b) => a.nombre.localeCompare(b.nombre))
      }));
  }

  onSubmit() {
    if (this.rolForm.invalid) {
      this.notificationService.warning('Por favor complete todos los campos requeridos');
      Object.keys(this.rolForm.controls).forEach(key => {
        this.rolForm.get(key)?.markAsTouched();
      });
      return;
    }

    const formData = this.rolForm.getRawValue();
    const rolData = {
      ...formData
    };

    this.isLoading = true;

    if (this.mode === 'create') {
      this.crear(rolData);
    } else if (this.mode === 'edit') {
      this.actualizar(rolData);
    }
  }

  crear(rolData: any) {
    this.rolesService.crear(rolData).subscribe({
      next: (response) => {
        const nuevoRolId = response.body?.id;
        if (nuevoRolId && this.permisosSeleccionados.length > 0) {
          // Asignar permisos al nuevo rol
          this.asignarPermisosAlRol(nuevoRolId, () => {
            this.notificationService.success('Rol creado correctamente');
            this.router.navigate(['/configuracion/roles']);
          });
        } else {
          this.notificationService.success('Rol creado correctamente');
          this.router.navigate(['/configuracion/roles']);
        }
      },
      error: (error) => {
        this.isLoading = false;
        const mensaje = error.error?.error || 'Error al crear rol';
        this.notificationService.error(mensaje);
      }
    });
  }

  actualizar(rolData: any) {
    rolData.id = this.rolId;
    
    this.rolesService.actualizar(rolData).subscribe({
      next: (response) => {
        // Actualizar permisos
        this.asignarPermisosAlRol(this.rolId!, () => {
          this.notificationService.success('Rol actualizado correctamente');
          this.router.navigate(['/configuracion/roles']);
        });
      },
      error: (error) => {
        this.isLoading = false;
        const mensaje = error.error?.error || 'Error al actualizar rol';
        this.notificationService.error(mensaje);
      }
    });
  }

  asignarPermisosAlRol(rolId: number, callback?: () => void) {
    const permisosIds = this.permisosSeleccionados
      .map(nombrePermiso => {
        const permiso = this.permisosDisponibles.find(p => p.nombre === nombrePermiso);
        return permiso?.id;
      })
      .filter(id => id !== undefined) as number[];
    
    this.rolesService.asignarPermisos(rolId, permisosIds).subscribe({
      next: () => {
        if (callback) callback();
      },
      error: (error) => {
        console.error('Error asignando permisos:', error);
        this.notificationService.error('Error al asignar permisos');
        this.isLoading = false;
      }
    });
  }

  // Gestión de permisos
  abrirModalPermisos() {
    this.permisosTemporal = [...this.permisosSeleccionados];
    this.busquedaPermisoModal = '';
    this.showPermisosModal = true;
  }

  cerrarModalPermisos() {
    this.showPermisosModal = false;
    this.busquedaPermisoModal = '';
  }

  confirmarPermisos() {
    this.permisosSeleccionados = [...this.permisosTemporal];
    this.cerrarModalPermisos();
  }

  togglePermiso(permisoNombre: string) {
    const index = this.permisosSeleccionados.indexOf(permisoNombre);
    if (index > -1) {
      this.permisosSeleccionados.splice(index, 1);
    } else {
      this.permisosSeleccionados.push(permisoNombre);
    }
    
    // Si estamos en el modal de edición, actualizar temporal
    if (this.showPermisosModal) {
      this.permisosTemporal = [...this.permisosSeleccionados];
    }
    
    // Actualizar permisos agrupados
    this.agruparPermisosAsignados();
  }

  tienePermiso(permisoNombre: string): boolean {
    return this.showPermisosModal 
      ? this.permisosTemporal.includes(permisoNombre)
      : this.permisosSeleccionados.includes(permisoNombre);
  }

  getPermisoInfo(permisoNombre: string): Permiso | undefined {
    return this.permisosDisponibles.find(p => p.nombre === permisoNombre);
  }

  capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  cancelar() {
    this.router.navigate(['/configuracion/roles']);
  }

  editarRol() {
    this.router.navigate(['/configuracion/roles/editar', this.rolId]);
  }

  // Gestión de modal de usuarios
  cargarUsuariosConRol() {
    if (!this.rol) return;
    
    this.usuariosService.obtenerTodos().subscribe({
      next: (response) => {
        const usuarios = response.body || [];
        // Filtrar usuarios que tienen este rol
        this.usuariosConRol = usuarios.filter((usuario: any) => 
          usuario.roles && usuario.roles.includes(this.rol!.nombre)
        );
        this.cantidadUsuarios = this.usuariosConRol.length;
      },
      error: (error) => {
        console.error('Error cargando usuarios:', error);
        this.cantidadUsuarios = 0;
      }
    });
  }

  abrirModalUsuarios() {
    if (this.usuariosConRol.length === 0) {
      // Cargar usuarios si no están cargados
      this.cargarUsuariosConRol();
    }
    this.showUsuariosModal = true;
  }

  cerrarModalUsuarios() {
    this.showUsuariosModal = false;
  }

  // Modal de vista de permisos
  abrirModalPermisosVista() {
    this.agruparPermisosAsignados();
    this.showPermisosVistaModal = true;
  }

  cerrarModalPermisosVista() {
    this.showPermisosVistaModal = false;
  }

  agruparPermisosAsignados() {
    const grupos: { [key: string]: Permiso[] } = {};
    
    // Filtrar solo los permisos seleccionados
    const permisosAsignados = this.permisosDisponibles.filter(p => 
      this.permisosSeleccionados.includes(p.nombre)
    );
    
    permisosAsignados.forEach(permiso => {
      const modulo = permiso.modulo || 'general';
      if (!grupos[modulo]) {
        grupos[modulo] = [];
      }
      grupos[modulo].push(permiso);
    });
    
    this.modulosConPermisosAsignados = Object.keys(grupos)
      .sort()
      .map(modulo => ({
        nombre: modulo,
        permisos: grupos[modulo].sort((a, b) => a.nombre.localeCompare(b.nombre))
      }));
  }

  // Getters para el template
  get isViewMode(): boolean {
    return this.mode === 'view';
  }

  get isEditMode(): boolean {
    return this.mode === 'edit';
  }

  get isCreateMode(): boolean {
    return this.mode === 'create';
  }

  get f() {
    return this.rolForm.controls;
  }
}