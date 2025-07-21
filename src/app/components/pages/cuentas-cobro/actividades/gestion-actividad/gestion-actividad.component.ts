import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

// Directivas y componentes
import { HasPermissionDirective } from '../../../../../directives/has-permission.directive';
import { LayoutComponent } from '../../../../common/layout/layout.component';
import { BreadcrumbComponent } from '../../../../common/breadcrumb/breadcrumb.component';
import { ModalComponent } from '../../../../common/modal/modal.component';
import { TranscripcionAudioComponent } from '../../../../common/transcripcion-audio/transcripcion-audio.component';
import { CargarArchivoComponent, ArchivoConfig } from '../../../../common/cargar-archivo/cargar-archivo.component';

// Servicios
import { NotificationService } from '../../../../../services/notification.service';
import { ActividadesService } from '../../../../../services/actividades.service';
import { ContratosService, Contrato, Obligacion } from '../../../../../services/contratos.service';
import { ContratistasService, Contratista } from '../../../../../services/contratistas.service';
import { UsuariosContratistasService } from '../../../../../services/usuarios-contratistas.service';
import { AuthService } from '../../../../../services/auth.service';

type ViewMode = 'create' | 'edit' | 'view';

@Component({
  selector: 'app-gestion-actividad',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LayoutComponent,
    BreadcrumbComponent,
    HasPermissionDirective,
    ModalComponent,
    TranscripcionAudioComponent,
    CargarArchivoComponent
  ],
  templateUrl: './gestion-actividad.component.html',
  styleUrls: ['./gestion-actividad.component.scss']
})
export class GestionActividadComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Modo y datos básicos
  mode: ViewMode = 'create';
  actividadId?: number;
  actividadForm!: FormGroup;
  isLoading = false;
  
  // Datos de usuario
  esUsuarioContratista = false;
  contratistaUsuario: Contratista | null = null;
  
  // Datos de selección
  contratistas: Contratista[] = [];
  contratos: Contrato[] = [];
  contratoSeleccionado: Contrato | null = null;
  obligaciones: Obligacion[] = [];
  obligacionesSeleccionadas: number[] = [];
  
  // Archivos
  archivosNuevos: ArchivoConfig[] = [];
  archivosExistentes: any[] = [];
  
  // UI
  mostrarModalObligaciones = false;
  
  // Configuración de página
  pageTitle = 'Registrar Actividad';
  pageSubtitle = 'Ingrese los detalles de la actividad realizada';
  pageIcon = '📝';
  backRoute = '/cuentas-cobro/actividades';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private notificationService: NotificationService,
    private actividadesService: ActividadesService,
    private contratosService: ContratosService,
    private contratistasService: ContratistasService,
    private usuariosContratistasService: UsuariosContratistasService
  ) {}

  ngOnInit(): void {
    this.initializeComponent();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async initializeComponent(): Promise<void> {
    // Determinar modo de operación
    this.mode = this.route.snapshot.data['mode'] || 'create';
    this.actividadId = this.route.snapshot.params['id'];
    
    // Inicializar formulario
    this.initForm();
    
    // Cargar datos del usuario y contratistas
    await this.cargarDatosUsuario();
    
    // Si es editar o ver, cargar la actividad
    if (this.actividadId && (this.mode === 'edit' || this.mode === 'view')) {
      await this.cargarActividad();
    }
    
    this.actualizarTituloPagina();
  }

  private initForm(): void {
    const isDisabled = this.mode === 'view';
    
    this.actividadForm = this.fb.group({
      contratista_id: [{ value: null, disabled: isDisabled }, [Validators.required]],
      contrato_id: [{ value: null, disabled: isDisabled }, [Validators.required]],
      fecha_actividad: [
        { value: this.getFechaActual(), disabled: isDisabled }, 
        [Validators.required]
      ],
      descripcion_actividad: [
        { value: '', disabled: isDisabled }, 
        [Validators.required, Validators.minLength(10)]
      ]
    });
  }

  private async cargarDatosUsuario(): Promise<void> {
    this.isLoading = true;
    
    try {
      // Obtener contratistas del usuario
      const contratistas = await this.usuariosContratistasService
        .obtenerMisContratistas()
        .toPromise();
      
      this.contratistas = contratistas || [];
      
      // Determinar si el usuario es contratista
      // Si solo tiene un contratista asignado, es un usuario contratista
      if (this.contratistas.length === 1) {
        this.esUsuarioContratista = true;
        this.contratistaUsuario = this.contratistas[0];
        
        // Preseleccionar y bloquear el contratista
        this.actividadForm.patchValue({
          contratista_id: this.contratistaUsuario.id
        });
        
        // Deshabilitar el selector si es modo crear/editar
        if (this.mode !== 'view') {
          this.actividadForm.get('contratista_id')?.disable();
        }
        
        // Cargar contratos
        await this.cargarContratos();
      }
      
    } catch (error) {
      console.error('Error cargando datos del usuario:', error);
      this.notificationService.error('Error al cargar información del usuario');
    } finally {
      this.isLoading = false;
    }
  }

  async onContratistaChange(): Promise<void> {
    const contratistaId = this.actividadForm.get('contratista_id')?.value;
    
    // Limpiar selecciones dependientes
    this.contratos = [];
    this.contratoSeleccionado = null;
    this.obligaciones = [];
    this.obligacionesSeleccionadas = [];
    this.actividadForm.patchValue({ contrato_id: null });
    
    if (contratistaId) {
      await this.cargarContratos();
    }
  }

  private async cargarContratos(): Promise<void> {
    const contratistaId = this.actividadForm.get('contratista_id')?.value;
    if (!contratistaId) return;
    
    this.isLoading = true;
    
    try {
      const contratos = await this.contratosService
        .obtenerPorContratista(contratistaId)
        .toPromise();
      
      this.contratos = contratos || [];
      
      // Si solo hay un contrato activo, preseleccionarlo
      const contratosActivos = this.contratos.filter(c => c.estado === 'activo');
      if (contratosActivos.length === 1) {
        this.actividadForm.patchValue({ contrato_id: contratosActivos[0].id });
        await this.onContratoChange();
      }
      
    } catch (error) {
      console.error('Error cargando contratos:', error);
      this.notificationService.error('Error al cargar contratos');
    } finally {
      this.isLoading = false;
    }
  }

  async onContratoChange(): Promise<void> {
    const contratoId = this.actividadForm.get('contrato_id')?.value;
    
    // Limpiar obligaciones
    this.obligaciones = [];
    this.obligacionesSeleccionadas = [];
    this.contratoSeleccionado = null;
    
    if (contratoId) {
      await this.cargarContrato(contratoId);
    }
  }

  private async cargarContrato(contratoId: number): Promise<void> {
    this.isLoading = true;
    
    try {
      const contrato = await this.contratosService
        .obtenerPorId(contratoId)
        .toPromise();
      
      if (contrato) {
        this.contratoSeleccionado = contrato;
        this.obligaciones = contrato.obligaciones || [];
      }
      
    } catch (error) {
      console.error('Error cargando contrato:', error);
      this.notificationService.error('Error al cargar información del contrato');
    } finally {
      this.isLoading = false;
    }
  }

  private async cargarActividad(): Promise<void> {
    if (!this.actividadId) return;
    
    this.isLoading = true;
    
    try {
      const response = await this.actividadesService
        .obtenerPorId(this.actividadId)
        .toPromise();
      
      if (response?.actividad) {
        const actividad = response.actividad;
        
        // Cargar datos básicos
        this.actividadForm.patchValue({
          contrato_id: actividad.contrato_id,
          fecha_actividad: actividad.fecha_actividad,
          descripcion_actividad: actividad.descripcion_actividad
        });
        
        // Cargar contratista del contrato
        if (actividad.contrato_id) {
          const contrato = await this.contratosService
            .obtenerPorId(actividad.contrato_id)
            .toPromise();
          
          if (contrato) {
            this.actividadForm.patchValue({
              contratista_id: contrato.contratista_id
            });
            
            // Cargar contratos y seleccionar el actual
            await this.cargarContratos();
            await this.cargarContrato(actividad.contrato_id);
          }
        }
        
        // Cargar obligaciones seleccionadas
        if (actividad.obligaciones) {
          this.obligacionesSeleccionadas = actividad.obligaciones
            .map((o: any) => o.id)
            .filter((id: any) => id);
        }
        
        // Cargar archivos existentes
        if (actividad.archivos) {
          this.archivosExistentes = actividad.archivos;
        }
      }
      
    } catch (error) {
      console.error('Error cargando actividad:', error);
      this.notificationService.error('Error al cargar la actividad');
      this.router.navigate([this.backRoute]);
    } finally {
      this.isLoading = false;
    }
  }

  // Manejo de archivos
  onArchivosConfigurados(archivos: ArchivoConfig[]): void {
    this.archivosNuevos = archivos;
  }

  onArchivoExistenteEliminado(archivoId: number): void {
    this.notificationService.confirm(
      '¿Está seguro de eliminar este archivo?',
      async () => {
        try {
          // TODO: Implementar servicio para eliminar archivo
          this.archivosExistentes = this.archivosExistentes.filter(a => a.id !== archivoId);
          this.notificationService.success('Archivo eliminado correctamente');
        } catch (error) {
          this.notificationService.error('Error al eliminar archivo');
        }
      }
    );
  }

  // Modal de obligaciones
  abrirModalObligaciones(): void {
    if (this.obligaciones.length === 0) {
      this.notificationService.warning('No hay obligaciones disponibles para este contrato');
      return;
    }
    
    this.mostrarModalObligaciones = true;
  }

  cerrarModalObligaciones(): void {
    this.mostrarModalObligaciones = false;
  }

  toggleObligacion(obligacionId: number): void {
    const index = this.obligacionesSeleccionadas.indexOf(obligacionId);
    if (index > -1) {
      this.obligacionesSeleccionadas.splice(index, 1);
    } else {
      this.obligacionesSeleccionadas.push(obligacionId);
    }
  }

  isObligacionSeleccionada(obligacionId: number): boolean {
    return this.obligacionesSeleccionadas.includes(obligacionId);
  }

  // Guardar actividad
  async onSubmit(): Promise<void> {
    if (this.actividadForm.invalid) {
      this.marcarCamposComoTocados();
      this.notificationService.warning('Por favor complete todos los campos requeridos');
      return;
    }
    
    const formData = new FormData();
    const valores = this.actividadForm.getRawValue();
    
    // Datos básicos
    formData.append('contrato_id', valores.contrato_id);
    formData.append('fecha_actividad', valores.fecha_actividad);
    formData.append('descripcion_actividad', valores.descripcion_actividad);
    
    // Obligaciones
    if (this.obligacionesSeleccionadas.length > 0) {
      formData.append('obligaciones', JSON.stringify(this.obligacionesSeleccionadas));
    }
    
    // Archivos nuevos
    this.archivosNuevos.forEach((archivo, index) => {
      formData.append(`archivos[${index}]`, archivo.archivo);
    });
    
    this.isLoading = true;
    
    try {
      if (this.mode === 'create') {
        await this.actividadesService.crear(formData).toPromise();
        this.notificationService.success('Actividad registrada correctamente');
      } else if (this.mode === 'edit') {
        formData.append('id', this.actividadId!.toString());
        await this.actividadesService.actualizar(formData).toPromise();
        this.notificationService.success('Actividad actualizada correctamente');
      }
      
      this.router.navigate([this.backRoute]);
    } catch (error: any) {
      const mensaje = error?.message || 'Error al guardar la actividad';
      this.notificationService.error(mensaje);
    } finally {
      this.isLoading = false;
    }
  }

  // Utilidades
  private getFechaActual(): string {
    const fecha = new Date();
    return fecha.toISOString().split('T')[0];
  }

  private marcarCamposComoTocados(): void {
    Object.keys(this.actividadForm.controls).forEach(key => {
      this.actividadForm.get(key)?.markAsTouched();
    });
  }

  private actualizarTituloPagina(): void {
    const modoTexto = {
      create: { titulo: 'Registrar', icono: '➕' },
      edit: { titulo: 'Editar', icono: '✏️' },
      view: { titulo: 'Ver', icono: '👁️' }
    };
    
    const config = modoTexto[this.mode];
    this.pageTitle = `${config.titulo} Actividad`;
    this.pageIcon = config.icono;
    
    if (this.contratoSeleccionado) {
      this.pageSubtitle = `Contrato ${this.contratoSeleccionado.numero_contrato}`;
    }
  }

  cancelar(): void {
    this.router.navigate([this.backRoute]);
  }

  editarActividad(): void {
    if (this.actividadId) {
      this.router.navigate(['/cuentas-cobro/actividades/editar', this.actividadId]);
    }
  }

  // Getters para template
  get f() {
    return this.actividadForm.controls;
  }

  get isViewMode(): boolean {
    return this.mode === 'view';
  }

  get isEditMode(): boolean {
    return this.mode === 'edit';
  }

  get isCreateMode(): boolean {
    return this.mode === 'create';
  }

  get puedeEditarContratista(): boolean {
    return !this.esUsuarioContratista && this.mode !== 'view';
  }
}