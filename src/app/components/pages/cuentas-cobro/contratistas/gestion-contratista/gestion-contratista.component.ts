import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HasPermissionDirective } from '../../../../../directives/has-permission.directive';
import { NotificationService } from '../../../../../services/notification.service';
import { ContratistasService, Contratista } from '../../../../../services/contratistas.service';
import { TiposIdentificacionService, TipoIdentificacion } from '../../../../../services/tipos-identificacion.service';
import { BreadcrumbComponent } from '../../../../common/breadcrumb/breadcrumb.component';
import { LayoutComponent } from '../../../../common/layout/layout.component';

type ViewMode = 'create' | 'edit' | 'view';

@Component({
  selector: 'app-gestion-contratista',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LayoutComponent,
    BreadcrumbComponent,
    HasPermissionDirective
  ],
  templateUrl: './gestion-contratista.component.html',
  styleUrls: ['./gestion-contratista.component.scss']
})
export class GestionContratistaComponent implements OnInit {
  contratistaForm!: FormGroup;
  mode: ViewMode = 'create';
  contratistaId?: number;
  isLoading = false;
  tiposIdentificacion: TipoIdentificacion[] = [];
  
  // Datos
  contratista: Contratista | null = null;
  
  // Títulos dinámicos
  pageTitle = 'Crear Contratista';
  pageSubtitle = 'Agregue un nuevo contratista al sistema';
  pageIcon = '➕';
  backRoute = '/cuentas-cobro/contratistas';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private contratistasService: ContratistasService,
    private tiposIdentificacionService: TiposIdentificacionService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    // Obtener modo de la ruta
    this.mode = this.route.snapshot.data['mode'] || 'create';
    this.contratistaId = this.route.snapshot.params['id'];
    
    this.setPageInfo();
    this.initForm();
    this.cargarTiposIdentificacion();
    
    // Si es editar o ver, cargar datos del contratista
    if (this.contratistaId && (this.mode === 'edit' || this.mode === 'view')) {
      this.cargarContratista();
    }
  }

  setPageInfo() {
    switch (this.mode) {
      case 'create':
        this.pageTitle = 'Crear Contratista';
        this.pageSubtitle = 'Agregue un nuevo contratista al sistema';
        this.pageIcon = '➕';
        break;
      case 'edit':
        this.pageTitle = 'Editar Contratista';
        this.pageSubtitle = 'Modifique los datos del contratista';
        this.pageIcon = '✏️';
        break;
      case 'view':
        this.pageTitle = 'Detalle de Contratista';
        this.pageSubtitle = 'Información del contratista';
        this.pageIcon = '👁️';
        break;
    }
  }

  initForm() {
    const isDisabled = this.mode === 'view';
    
    this.contratistaForm = this.fb.group({
      tipo_identificacion_id: [
        { value: '', disabled: isDisabled }, 
        [Validators.required]
      ],
      identificacion: [
        { value: '', disabled: isDisabled }, 
        [Validators.required, Validators.minLength(5), Validators.maxLength(20)]
      ],
      nombre_completo: [
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
      activo: [{ value: true, disabled: isDisabled }]
    });
  }

  cargarTiposIdentificacion() {
    this.tiposIdentificacionService.obtenerPorAplicacion('personas').subscribe({
      next: (tipos) => {
        this.tiposIdentificacion = tipos;
      },
      error: (error) => {
        console.error('Error cargando tipos de identificación:', error);
        this.notificationService.error('Error al cargar tipos de identificación');
      }
    });
  }

  cargarContratista() {
    this.isLoading = true;
    this.contratistasService.obtenerPorId(this.contratistaId!).subscribe({
      next: (contratista) => {
        this.contratista = contratista;
        
        // Cargar datos del formulario
        this.contratistaForm.patchValue({
          tipo_identificacion_id: contratista.tipo_identificacion_id,
          identificacion: contratista.identificacion,
          nombre_completo: contratista.nombre_completo,
          email: contratista.email,
          telefono: contratista.telefono,
          direccion: contratista.direccion,
          activo: contratista.activo !== false
        });
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando contratista:', error);
        this.notificationService.error('Error al cargar el contratista');
        this.router.navigate([this.backRoute]);
      }
    });
  }

  onSubmit() {
    if (this.contratistaForm.invalid) {
      this.notificationService.warning('Por favor complete todos los campos requeridos');
      Object.keys(this.contratistaForm.controls).forEach(key => {
        this.contratistaForm.get(key)?.markAsTouched();
      });
      return;
    }

    const formData = this.contratistaForm.getRawValue();
    
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

  crear(contratistaData: any) {
    this.contratistasService.crear(contratistaData).subscribe({
      next: (response) => {
        this.notificationService.success('Contratista creado correctamente');
        this.router.navigate([this.backRoute]);
      },
      error: (error) => {
        this.isLoading = false;
        const mensaje = error.message || 'Error al crear contratista';
        this.notificationService.error(mensaje);
      }
    });
  }

  actualizar(contratistaData: any) {
    contratistaData.id = this.contratistaId;
    
    this.contratistasService.actualizar(contratistaData).subscribe({
      next: (response) => {
        this.notificationService.success('Contratista actualizado correctamente');
        this.router.navigate([this.backRoute]);
      },
      error: (error) => {
        this.isLoading = false;
        const mensaje = error.message || 'Error al actualizar contratista';
        this.notificationService.error(mensaje);
      }
    });
  }

  cancelar() {
    this.router.navigate([this.backRoute]);
  }

  editarContratista() {
    this.router.navigate(['/cuentas-cobro/contratistas/editar', this.contratistaId]);
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
    return this.contratistaForm.controls;
  }
}