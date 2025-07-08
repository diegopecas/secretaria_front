import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HasPermissionDirective } from '../../../../../directives/has-permission.directive';
import { NotificationService } from '../../../../../services/notification.service';
import { EntidadesService, Entidad } from '../../../../../services/entidades.service';
import { TiposIdentificacionService, TipoIdentificacion } from '../../../../../services/tipos-identificacion.service';
import { BreadcrumbComponent } from '../../../../common/breadcrumb/breadcrumb.component';
import { LayoutComponent } from '../../../../common/layout/layout.component';

type ViewMode = 'create' | 'edit' | 'view';

@Component({
  selector: 'app-gestion-entidad',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LayoutComponent,
    BreadcrumbComponent,
    HasPermissionDirective
  ],
  templateUrl: './gestion-entidad.component.html',
  styleUrls: ['./gestion-entidad.component.scss']
})
export class GestionEntidadComponent implements OnInit {
  entidadForm!: FormGroup;
  mode: ViewMode = 'create';
  entidadId?: number;
  isLoading = false;
  tiposIdentificacion: TipoIdentificacion[] = [];
  
  // Datos
  entidad: Entidad | null = null;
  
  // Títulos dinámicos
  pageTitle = 'Crear Entidad';
  pageSubtitle = 'Agregue una nueva entidad contratante';
  pageIcon = '➕';
  backRoute = '/cuentas-cobro/entidades';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private entidadesService: EntidadesService,
    private tiposIdentificacionService: TiposIdentificacionService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    // Obtener modo de la ruta
    this.mode = this.route.snapshot.data['mode'] || 'create';
    this.entidadId = this.route.snapshot.params['id'];
    
    this.setPageInfo();
    this.initForm();
    this.cargarTiposIdentificacion();
    
    // Si es editar o ver, cargar datos de la entidad
    if (this.entidadId && (this.mode === 'edit' || this.mode === 'view')) {
      this.cargarEntidad();
    }
  }

  setPageInfo() {
    switch (this.mode) {
      case 'create':
        this.pageTitle = 'Crear Entidad';
        this.pageSubtitle = 'Agregue una nueva entidad contratante';
        this.pageIcon = '➕';
        break;
      case 'edit':
        this.pageTitle = 'Editar Entidad';
        this.pageSubtitle = 'Modifique los datos de la entidad';
        this.pageIcon = '✏️';
        break;
      case 'view':
        this.pageTitle = 'Detalle de Entidad';
        this.pageSubtitle = 'Información de la entidad';
        this.pageIcon = '👁️';
        break;
    }
  }

  initForm() {
    const isDisabled = this.mode === 'view';
    
    this.entidadForm = this.fb.group({
      tipo_identificacion_id: [
        { value: '', disabled: isDisabled }, 
        [Validators.required]
      ],
      identificacion: [
        { value: '', disabled: isDisabled }, 
        [Validators.required, Validators.minLength(5), Validators.maxLength(20)]
      ],
      nombre: [
        { value: '', disabled: isDisabled }, 
        [Validators.required, Validators.minLength(3), Validators.maxLength(200)]
      ],
      email: [
        { value: '', disabled: isDisabled }, 
        [Validators.email]
      ],
      telefono: [
        { value: '', disabled: isDisabled }, 
        [Validators.pattern('^[0-9+\\-\\s()]+$')]
      ],
      direccion: [
        { value: '', disabled: isDisabled }, 
        [Validators.maxLength(255)]
      ],
      descripcion: [
        { value: '', disabled: isDisabled }, 
        [Validators.maxLength(500)]
      ],
      activo: [{ value: true, disabled: isDisabled }]
    });
  }

  cargarTiposIdentificacion() {
    this.tiposIdentificacionService.obtenerPorAplicacion('empresas').subscribe({
      next: (tipos) => {
        this.tiposIdentificacion = tipos;
      },
      error: (error) => {
        console.error('Error cargando tipos de identificación:', error);
        this.notificationService.error('Error al cargar tipos de identificación');
      }
    });
  }

  cargarEntidad() {
    this.isLoading = true;
    this.entidadesService.obtenerPorId(this.entidadId!).subscribe({
      next: (entidad) => {
        this.entidad = entidad;
        
        // Cargar datos del formulario
        this.entidadForm.patchValue({
          tipo_identificacion_id: entidad.tipo_identificacion_id,
          identificacion: entidad.identificacion,
          nombre: entidad.nombre,
          email: entidad.email,
          telefono: entidad.telefono,
          direccion: entidad.direccion,
          descripcion: entidad.descripcion,
          activo: entidad.activo !== false
        });
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando entidad:', error);
        this.notificationService.error('Error al cargar la entidad');
        this.router.navigate([this.backRoute]);
      }
    });
  }

  onSubmit() {
    if (this.entidadForm.invalid) {
      this.notificationService.warning('Por favor complete todos los campos requeridos');
      Object.keys(this.entidadForm.controls).forEach(key => {
        this.entidadForm.get(key)?.markAsTouched();
      });
      return;
    }

    const formData = this.entidadForm.getRawValue();
    
    // Limpiar campos vacíos
    Object.keys(formData).forEach(key => {
      if (formData[key] === '' || formData[key] === null) {
        if (key !== 'activo') {
          formData[key] = null;
        }
      }
    });

    this.isLoading = true;

    if (this.mode === 'create') {
      this.crear(formData);
    } else if (this.mode === 'edit') {
      this.actualizar(formData);
    }
  }

  crear(entidadData: any) {
    this.entidadesService.crear(entidadData).subscribe({
      next: (response) => {
        this.notificationService.success('Entidad creada correctamente');
        this.router.navigate([this.backRoute]);
      },
      error: (error) => {
        this.isLoading = false;
        const mensaje = error.message || 'Error al crear entidad';
        this.notificationService.error(mensaje);
      }
    });
  }

  actualizar(entidadData: any) {
    entidadData.id = this.entidadId;
    
    this.entidadesService.actualizar(entidadData).subscribe({
      next: (response) => {
        this.notificationService.success('Entidad actualizada correctamente');
        this.router.navigate([this.backRoute]);
      },
      error: (error) => {
        this.isLoading = false;
        const mensaje = error.message || 'Error al actualizar entidad';
        this.notificationService.error(mensaje);
      }
    });
  }

  cancelar() {
    this.router.navigate([this.backRoute]);
  }

  editarEntidad() {
    this.router.navigate(['/cuentas-cobro/entidades/editar', this.entidadId]);
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
    return this.entidadForm.controls;
  }
}