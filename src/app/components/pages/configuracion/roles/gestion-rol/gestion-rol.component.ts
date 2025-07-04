import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LayoutComponent } from '../../../../common/layout/layout.component';
import { BreadcrumbComponent } from '../../../../common/breadcrumb/breadcrumb.component';
import { HasPermissionDirective } from '../../../../../directives/has-permission.directive';
import { AuthService } from '../../../../../services/auth.service';
import { RolesService, Rol } from '../../../../../services/roles.service';
import { NotificationService } from '../../../../../services/notification.service';

@Component({
  selector: 'app-gestion-rol',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    RouterModule,
    LayoutComponent, 
    BreadcrumbComponent,
    HasPermissionDirective
  ],
  templateUrl: './gestion-rol.component.html',
  styleUrls: ['./gestion-rol.component.scss']
})
export class GestionRolComponent implements OnInit {
  rolForm!: FormGroup;
  rolId: number | null = null;
  modo: 'crear' | 'editar' | 'ver' = 'crear';
  titulo = 'Crear Rol';
  cargando = false;
  esRolSistema = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private rolesService: RolesService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.inicializarFormulario();
    this.determinarModo();
  }

  inicializarFormulario() {
    this.rolForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      descripcion: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(255)]]
    });
  }

  determinarModo() {
    const url = this.route.snapshot.url.map(segment => segment.path);
    
    if (url.includes('crear')) {
      this.modo = 'crear';
      this.titulo = 'Crear Rol';
    } else if (url.includes('editar')) {
      this.modo = 'editar';
      this.titulo = 'Editar Rol';
      this.cargarRol();
    } else if (url.includes('detalle')) {
      this.modo = 'ver';
      this.titulo = 'Detalle del Rol';
      this.cargarRol();
      this.rolForm.disable();
    }
  }

  cargarRol() {
    this.rolId = Number(this.route.snapshot.paramMap.get('id'));
    
    if (this.rolId) {
      this.rolesService.obtenerPorId(this.rolId).subscribe({
        next: (response) => {
          const rol = response.body;
          if (rol) {
            this.verificarRolSistema(rol.nombre);
            this.rolForm.patchValue({
              nombre: rol.nombre,
              descripcion: rol.descripcion
            });
            
            // Si es rol del sistema, deshabilitar el campo nombre
            if (this.esRolSistema) {
              this.rolForm.get('nombre')?.disable();
            }
          }
        },
        error: (error) => {
          console.error('Error al cargar rol:', error);
          this.notificationService.error('Error al cargar el rol');
          this.router.navigate(['/configuracion/roles']);
        }
      });
    }
  }

  verificarRolSistema(nombre: string) {
    const rolesSistema = ['admin', 'secretaria', 'supervisor', 'usuario'];
    this.esRolSistema = rolesSistema.includes(nombre.toLowerCase());
  }

  guardar() {
    if (this.rolForm.invalid) {
      this.marcarCamposComoTocados();
      return;
    }

    this.cargando = true;
    const rol = this.rolForm.getRawValue(); // getRawValue para incluir campos deshabilitados

    const operacion = this.modo === 'crear' 
      ? this.rolesService.crear(rol)
      : this.rolesService.actualizar({ ...rol, id: this.rolId! });

    operacion.subscribe({
      next: (response) => {
        const mensaje = this.modo === 'crear' 
          ? 'Rol creado correctamente' 
          : 'Rol actualizado correctamente';
        
        this.notificationService.success(mensaje);
        this.router.navigate(['/configuracion/roles']);
      },
      error: (error) => {
        console.error('Error al guardar rol:', error);
        this.notificationService.error('Error al guardar el rol');
        this.cargando = false;
      }
    });
  }

  cancelar() {
    this.router.navigate(['/configuracion/roles']);
  }

  marcarCamposComoTocados() {
    Object.keys(this.rolForm.controls).forEach(key => {
      this.rolForm.get(key)?.markAsTouched();
    });
  }

  tieneError(campo: string): boolean {
    const control = this.rolForm.get(campo);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  obtenerMensajeError(campo: string): string {
    const control = this.rolForm.get(campo);
    if (!control || !control.errors) return '';

    const errores = control.errors;
    if (errores['required']) return 'Este campo es requerido';
    if (errores['minlength']) return `Mínimo ${errores['minlength'].requiredLength} caracteres`;
    if (errores['maxlength']) return `Máximo ${errores['maxlength'].requiredLength} caracteres`;
    
    return 'Campo inválido';
  }

  hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }
}