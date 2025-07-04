import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { LayoutComponent } from '../../../common/layout/layout.component';
import { BreadcrumbComponent } from '../../../common/breadcrumb/breadcrumb.component';
import { ModalComponent } from '../../../common/modal/modal.component';
import { UsuariosService } from '../../../../services/usuarios.service';
import { RolesService, Rol } from '../../../../services/roles.service';
import { NotificationService } from '../../../../services/notification.service';
import { HasPermissionDirective } from '../../../../directives/has-permission.directive';

type ViewMode = 'create' | 'edit' | 'view';

@Component({
  selector: 'app-gestion-usuario',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    LayoutComponent, 
    BreadcrumbComponent,
    ModalComponent,
    HasPermissionDirective
  ],
  templateUrl: './gestion-usuario.component.html',
  styleUrls: ['./gestion-usuario.component.scss']
})
export class GestionUsuarioComponent implements OnInit {
  usuarioForm!: FormGroup;
  mode: ViewMode = 'create';
  userId?: number;
  isLoading = false;
  showRolesModal = false;
  
  // Datos
  usuario: any = null;
  rolesDisponibles: Rol[] = [];
  rolesSeleccionados: string[] = [];
  
  // Títulos dinámicos
  pageTitle = 'Crear Usuario';
  pageSubtitle = 'Agregue un nuevo usuario al sistema';
  pageIcon = '➕';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private usuariosService: UsuariosService,
    private rolesService: RolesService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    // Obtener modo de la ruta
    this.mode = this.route.snapshot.data['mode'] || 'create';
    this.userId = this.route.snapshot.params['id'];
    
    this.setPageInfo();
    this.initForm();
    this.cargarRoles();
    
    // Si es editar o ver, cargar datos del usuario
    if (this.userId && (this.mode === 'edit' || this.mode === 'view')) {
      this.cargarUsuario();
    }
  }

  setPageInfo() {
    switch (this.mode) {
      case 'create':
        this.pageTitle = 'Crear Usuario';
        this.pageSubtitle = 'Agregue un nuevo usuario al sistema';
        this.pageIcon = '➕';
        break;
      case 'edit':
        this.pageTitle = 'Editar Usuario';
        this.pageSubtitle = 'Modifique los datos del usuario';
        this.pageIcon = '✏️';
        break;
      case 'view':
        this.pageTitle = 'Detalle de Usuario';
        this.pageSubtitle = 'Información del usuario';
        this.pageIcon = '👁️';
        break;
    }
  }

  initForm() {
    const isDisabled = this.mode === 'view';
    
    this.usuarioForm = this.fb.group({
      nombre: [{value: '', disabled: isDisabled}, [Validators.required, Validators.minLength(3)]],
      email: [{value: '', disabled: isDisabled}, [Validators.required, Validators.email]],
      password: [{value: '', disabled: isDisabled}, this.mode === 'create' ? [Validators.required, Validators.minLength(6)] : []],
      activo: [{value: true, disabled: isDisabled}]
    });
  }

  cargarUsuario() {
    this.isLoading = true;
    this.usuariosService.obtenerPorId(this.userId!).subscribe({
      next: (response) => {
        this.usuario = response.body;
        this.usuarioForm.patchValue({
          nombre: this.usuario.nombre,
          email: this.usuario.email,
          activo: this.usuario.activo
        });
        this.rolesSeleccionados = this.usuario.roles || [];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando usuario:', error);
        this.notificationService.error('Error al cargar el usuario');
        this.router.navigate(['/configuracion/usuarios']);
      }
    });
  }

  cargarRoles() {
    this.rolesService.obtenerTodos().subscribe({
      next: (roles) => {
        this.rolesDisponibles = roles.body || [];
      },
      error: (error) => {
        console.error('Error cargando roles:', error);
        this.notificationService.error('Error al cargar roles');
      }
    });
  }

  onSubmit() {
    if (this.usuarioForm.invalid) {
      this.notificationService.warning('Por favor complete todos los campos requeridos');
      return;
    }

    const formData = this.usuarioForm.getRawValue();
    const usuarioData = {
      ...formData,
      roles: this.rolesSeleccionados
    };

    this.isLoading = true;

    if (this.mode === 'create') {
      this.crear(usuarioData);
    } else if (this.mode === 'edit') {
      this.actualizar(usuarioData);
    }
  }

  crear(usuarioData: any) {
    this.usuariosService.crear(usuarioData).subscribe({
      next: (response) => {
        this.notificationService.success('Usuario creado correctamente');
        this.router.navigate(['/configuracion/usuarios']);
      },
      error: (error) => {
        this.isLoading = false;
        const mensaje = error.error?.error || 'Error al crear usuario';
        this.notificationService.error(mensaje);
      }
    });
  }

  actualizar(usuarioData: any) {
    usuarioData.id = this.userId;
    
    // Si no se ingresó password, no enviarlo
    if (!usuarioData.password) {
      delete usuarioData.password;
    }
    
    this.usuariosService.actualizar(usuarioData).subscribe({
      next: (response) => {
        this.notificationService.success('Usuario actualizado correctamente');
        this.router.navigate(['/configuracion/usuarios']);
      },
      error: (error) => {
        this.isLoading = false;
        const mensaje = error.error?.error || 'Error al actualizar usuario';
        this.notificationService.error(mensaje);
      }
    });
  }

  // Gestión de roles
  abrirModalRoles() {
    this.showRolesModal = true;
  }

  cerrarModalRoles() {
    this.showRolesModal = false;
  }

  toggleRol(rolNombre: string) {
    const index = this.rolesSeleccionados.indexOf(rolNombre);
    if (index > -1) {
      this.rolesSeleccionados.splice(index, 1);
    } else {
      this.rolesSeleccionados.push(rolNombre);
    }
  }

  tieneRol(rolNombre: string): boolean {
    return this.rolesSeleccionados.includes(rolNombre);
  }

  getRolInfo(rolNombre: string): Rol | undefined {
    return this.rolesDisponibles.find(r => r.nombre === rolNombre);
  }

  cancelar() {
    this.router.navigate(['/configuracion/usuarios']);
  }

  editarUsuario() {
    this.router.navigate(['/configuracion/usuarios/editar', this.userId]);
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
    return this.usuarioForm.controls;
  }
}