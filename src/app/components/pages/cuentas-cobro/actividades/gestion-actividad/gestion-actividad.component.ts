import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HasPermissionDirective } from '../../../../../directives/has-permission.directive';
import { ActividadesService, Actividad, ArchivoAdjunto } from '../../../../../services/actividades.service';
import { AuthService } from '../../../../../services/auth.service';
import { Contrato, ContratosService, Obligacion } from '../../../../../services/contratos.service';
import { NotificationService } from '../../../../../services/notification.service';
import { BreadcrumbComponent } from '../../../../common/breadcrumb/breadcrumb.component';
import { GrabadorAudioComponent } from '../../../../common/grabador-audio/grabador-audio.component';
import { LayoutComponent } from '../../../../common/layout/layout.component';
import { ModalComponent } from '../../../../common/modal/modal.component';

type ViewMode = 'create' | 'edit' | 'view';

@Component({
  selector: 'app-gestion-actividad',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LayoutComponent,
    BreadcrumbComponent,
    GrabadorAudioComponent,
    HasPermissionDirective,
    ModalComponent
  ],
  templateUrl: './gestion-actividad.component.html',
  styleUrls: ['./gestion-actividad.component.scss']
})
export class GestionActividadComponent implements OnInit {
  actividadForm!: FormGroup;
  mode: ViewMode = 'create';
  actividadId?: number;
  isLoading = false;
  
  // Datos
  actividad: Actividad | null = null;
  contratos: Contrato[] = [];
  obligaciones: Obligacion[] = [];
  contratoSeleccionado: Contrato | null = null;
  
  // Obligaciones seleccionadas (múltiples)
  obligacionesSeleccionadas: number[] = [];
  
  // Control de modal
  mostrarModalObligaciones = false;
  
  // Control de tabs
  activeTab: 'texto' | 'audio' | 'archivo' = 'texto';
  
  // Archivos múltiples
  archivosSeleccionados: File[] = [];
  archivosActuales: ArchivoAdjunto[] = []; // Para modo editar/ver
  tiposArchivo = {
    'documento': { icono: 'fa-file-pdf', color: '#dc3545', extensiones: ['.pdf', '.doc', '.docx', '.txt'] },
    'imagen': { icono: 'fa-file-image', color: '#28a745', extensiones: ['.jpg', '.jpeg', '.png'] },
    'hoja_calculo': { icono: 'fa-file-excel', color: '#28a745', extensiones: ['.xls', '.xlsx', '.csv'] },
    'presentacion': { icono: 'fa-file-powerpoint', color: '#dc3545', extensiones: ['.ppt', '.pptx'] }
  };
  
  // Transcripción
  transcripcionTexto = '';
  mostrarTranscripcion = false;
  transcripcionOriginal = ''; // Para modo editar/ver
  
  // Títulos dinámicos
  pageTitle = 'Registrar Actividad';
  pageSubtitle = 'Registre una nueva actividad diaria';
  pageIcon = '➕';
  backRoute = '/cuentas-cobro/actividades';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private notificationService: NotificationService,
    private actividadesService: ActividadesService,
    private contratosService: ContratosService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Obtener modo de la ruta
    this.mode = this.route.snapshot.data['mode'] || 'create';
    this.actividadId = this.route.snapshot.params['id'];
    
    this.setPageInfo();
    this.initForm();
    this.cargarContratos();
    
    // Si es editar o ver, cargar datos de la actividad
    if (this.actividadId && (this.mode === 'edit' || this.mode === 'view')) {
      this.cargarActividad();
    }
  }

  setPageInfo() {
    switch (this.mode) {
      case 'create':
        this.pageTitle = 'Registrar Actividad';
        this.pageSubtitle = 'Registre una nueva actividad diaria';
        this.pageIcon = '➕';
        break;
      case 'edit':
        this.pageTitle = 'Editar Actividad';
        this.pageSubtitle = 'Modifique los datos de la actividad';
        this.pageIcon = '✏️';
        break;
      case 'view':
        this.pageTitle = 'Detalle de Actividad';
        this.pageSubtitle = 'Información completa de la actividad';
        this.pageIcon = '👁️';
        break;
    }
  }

  initForm() {
    const isDisabled = this.mode === 'view';
    
    this.actividadForm = this.fb.group({
      contrato_id: [
        { value: '', disabled: isDisabled }, 
        [Validators.required]
      ],
      fecha_actividad: [
        { value: this.getFechaHoy(), disabled: isDisabled }, 
        [Validators.required]
      ],
      descripcion_actividad: [
        { value: '', disabled: isDisabled }, 
        [Validators.required, Validators.minLength(10)]
      ],
      // Campos para transcripción (ocultos)
      transcripcion_proveedor: [''],
      transcripcion_modelo: [''],
      transcripcion_confianza: [null]
    });
  }

  getFechaHoy(): string {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    const day = String(hoy.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  cargarContratos() {
    this.isLoading = true;
    this.contratosService.obtenerTodos().subscribe({
      next: (contratos) => {
        // En modo editar/ver, mostrar todos los contratos (incluso inactivos)
        if (this.mode === 'create') {
          // Solo contratos activos para crear
          this.contratos = contratos.filter(c => c.estado === 'activo');
        } else {
          // Todos los contratos para editar/ver
          this.contratos = contratos;
        }
        
        // Si es un usuario básico (contratista), filtrar solo sus contratos
        const userEmail = localStorage.getItem('userEmail');
        if (userEmail && !this.authService.hasPermission('contratos.gestionar')) {
          this.contratos = this.contratos.filter(c => 
            c.contratista_identificacion === userEmail
          );
        }
        
        this.isLoading = false;
        
        // En modo crear
        if (this.mode === 'create') {
          // Si hay un contrato en el localStorage
          const contratoGuardado = localStorage.getItem('ultimoContratoSeleccionado');
          if (contratoGuardado && this.contratos.find(c => c.id === parseInt(contratoGuardado))) {
            this.actividadForm.patchValue({ contrato_id: parseInt(contratoGuardado) });
            this.onContratoChange();
          } else if (this.contratos.length === 1) {
            // Si solo hay un contrato, seleccionarlo automáticamente
            this.actividadForm.patchValue({ contrato_id: this.contratos[0].id });
            this.onContratoChange();
          }
        }
      },
      error: (error) => {
        console.error('Error cargando contratos:', error);
        this.notificationService.error('Error al cargar contratos');
        this.isLoading = false;
      }
    });
  }

  cargarActividad() {
    if (!this.actividadId) return;
    
    this.isLoading = true;
    
    this.actividadesService.obtenerPorId(this.actividadId).subscribe({
      next: (actividad) => {
        this.actividad = actividad;
        
        // Cargar datos en el formulario
        this.actividadForm.patchValue({
          contrato_id: actividad.contrato_id,
          fecha_actividad: actividad.fecha_actividad,
          descripcion_actividad: actividad.descripcion_actividad
        });
        
        // Cargar obligaciones seleccionadas
        if (actividad.obligaciones) {
          this.obligacionesSeleccionadas = actividad.obligaciones
            .map(o => o.id)
            .filter((id): id is number => id !== undefined);
        }
        
        // Cargar archivos actuales
        if (actividad.archivos) {
          this.archivosActuales = actividad.archivos;
        }
        
        // Si tiene transcripción, mostrarla
        if (actividad.transcripcion_texto) {
          this.transcripcionOriginal = actividad.transcripcion_texto;
          this.transcripcionTexto = actividad.transcripcion_texto;
          this.mostrarTranscripcion = true;
        }
        
        // Cargar obligaciones del contrato
        this.onContratoChange();
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando actividad:', error);
        this.notificationService.error('Error al cargar la actividad');
        this.router.navigate([this.backRoute]);
      }
    });
  }

  onContratoChange() {
    const contratoId = this.actividadForm.get('contrato_id')?.value;
    if (contratoId) {
      // En modo crear, guardar selección
      if (this.mode === 'create') {
        localStorage.setItem('ultimoContratoSeleccionado', contratoId);
      }
      
      // Buscar contrato seleccionado
      this.contratoSeleccionado = this.contratos.find(c => c.id === parseInt(contratoId)) || null;
      
      // Cargar obligaciones del contrato
      if (this.contratoSeleccionado) {
        this.obligaciones = (this.contratoSeleccionado.obligaciones || [])
          .filter(o => o.id !== undefined) as Array<Obligacion & { id: number }>;
      }
    } else {
      this.contratoSeleccionado = null;
      this.obligaciones = [];
    }
    
    // En modo crear, resetear obligaciones seleccionadas
    if (this.mode === 'create') {
      this.obligacionesSeleccionadas = [];
    }
  }

  // Manejo de obligaciones múltiples
  toggleObligacion(obligacionId: number | undefined) {
    if (this.mode === 'view' || !obligacionId) return;
    
    const index = this.obligacionesSeleccionadas.indexOf(obligacionId);
    if (index > -1) {
      this.obligacionesSeleccionadas.splice(index, 1);
    } else {
      this.obligacionesSeleccionadas.push(obligacionId);
    }
  }

  isObligacionSeleccionada(obligacionId: number | undefined): boolean {
    if (!obligacionId) return false;
    return this.obligacionesSeleccionadas.includes(obligacionId);
  }

  abrirModalObligaciones() {
    this.mostrarModalObligaciones = true;
  }

  cerrarModalObligaciones() {
    this.mostrarModalObligaciones = false;
  }

  // Manejo de tabs
  setActiveTab(tab: 'texto' | 'audio' | 'archivo') {
    // En modo ver, no cambiar tabs
    if (this.mode === 'view') return;
    
    this.activeTab = tab;
    
    // Si cambia a texto y hay transcripción, copiarla
    if (tab === 'texto' && this.transcripcionTexto && !this.actividadForm.get('descripcion_actividad')?.value) {
      this.actividadForm.patchValue({ descripcion_actividad: this.transcripcionTexto });
    }
  }

  // Manejo de transcripción de voz
  onTextoTranscrito(resultado: any) {
    this.transcripcionTexto = resultado.texto;
    this.mostrarTranscripcion = true;
    
    // Actualizar el campo de descripción con la transcripción
    this.actividadForm.patchValue({ descripcion_actividad: resultado.texto });
    
    // Guardar info del proveedor usado
    this.actividadForm.patchValue({
      transcripcion_proveedor: resultado.proveedor,
      transcripcion_modelo: resultado.modelo,
      transcripcion_confianza: resultado.confianza
    });
    
    // Mostrar notificación
    this.notificationService.success('Transcripción completada');
  }

  // Manejo de archivos múltiples
  onFileSelected(event: any) {
    const files = event.target.files;
    if (files) {
      // Validar cada archivo
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validar tamaño (10MB máximo por archivo)
        if (file.size > 10 * 1024 * 1024) {
          this.notificationService.error(`El archivo ${file.name} excede el tamaño máximo de 10MB`);
          continue;
        }
        
        // Validar tipo
        const extension = '.' + file.name.split('.').pop()?.toLowerCase();
        const tipoValido = Object.values(this.tiposArchivo).some(tipo => 
          tipo.extensiones.includes(extension)
        );
        
        if (!tipoValido) {
          this.notificationService.error(`Tipo de archivo no permitido: ${file.name}`);
          continue;
        }
        
        // Agregar a la lista si no existe
        if (!this.archivosSeleccionados.find(f => f.name === file.name)) {
          this.archivosSeleccionados.push(file);
        }
      }
      
      // Limpiar el input para permitir seleccionar los mismos archivos de nuevo
      event.target.value = '';
    }
  }

  eliminarArchivoNuevo(index: number) {
    this.archivosSeleccionados.splice(index, 1);
  }

  eliminarArchivoExistente(archivo: ArchivoAdjunto) {
    if (this.mode === 'view') return;
    
    this.notificationService.confirm(
      `¿Está seguro de eliminar el archivo "${archivo.nombre_archivo}"?`,
      () => {
        this.actividadesService.eliminarArchivo(archivo.id).subscribe({
          next: () => {
            this.notificationService.success('Archivo eliminado correctamente');
            // Quitar de la lista local
            const index = this.archivosActuales.findIndex(a => a.id === archivo.id);
            if (index > -1) {
              this.archivosActuales.splice(index, 1);
            }
          },
          error: (error) => {
            console.error('Error al eliminar archivo:', error);
            this.notificationService.error('Error al eliminar el archivo');
          }
        });
      }
    );
  }

  getIconoArchivo(nombreArchivo: string): string {
    const extension = '.' + nombreArchivo.split('.').pop()?.toLowerCase();
    
    for (const [tipo, config] of Object.entries(this.tiposArchivo)) {
      if (config.extensiones.includes(extension)) {
        return config.icono;
      }
    }
    
    return 'fa-file';
  }

  getColorArchivo(nombreArchivo: string): string {
    const extension = '.' + nombreArchivo.split('.').pop()?.toLowerCase();
    
    for (const [tipo, config] of Object.entries(this.tiposArchivo)) {
      if (config.extensiones.includes(extension)) {
        return config.color;
      }
    }
    
    return '#666';
  }

  formatearTamanoArchivo(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Validación y envío
  onSubmit() {
    if (this.actividadForm.invalid) {
      this.notificationService.warning('Por favor complete todos los campos requeridos');
      Object.keys(this.actividadForm.controls).forEach(key => {
        this.actividadForm.get(key)?.markAsTouched();
      });
      return;
    }
    
    // En modo crear, validar que haya contenido
    if (this.mode === 'create') {
      const descripcion = this.actividadForm.get('descripcion_actividad')?.value;
      if (!descripcion && this.archivosSeleccionados.length === 0) {
        this.notificationService.warning('Debe proporcionar una descripción o adjuntar archivos');
        return;
      }
    }
    
    const formData = this.actividadForm.getRawValue();
    
    const actividad: Actividad = {
      ...formData,
      contrato_id: parseInt(formData.contrato_id)
    };
    
    // Si hay transcripción nueva, agregarla
    if (this.transcripcionTexto && this.transcripcionTexto !== this.transcripcionOriginal) {
      actividad.transcripcion_texto = this.transcripcionTexto;
      actividad.transcripcion_proveedor = formData.transcripcion_proveedor || 'navegador';
      actividad.transcripcion_modelo = formData.transcripcion_modelo || 'webkitSpeechRecognition';
      actividad.transcripcion_confianza = formData.transcripcion_confianza || 0.95;
    }
    
    this.isLoading = true;
    
    if (this.mode === 'create') {
      this.crear(actividad);
    } else if (this.mode === 'edit') {
      actividad.id = this.actividadId;
      this.actualizar(actividad);
    }
  }

  crear(actividad: Actividad) {
    this.actividadesService.crear(actividad, this.obligacionesSeleccionadas, this.archivosSeleccionados).subscribe({
      next: (response) => {
        this.notificationService.success('Actividad registrada correctamente');
        
        // Preguntar si desea registrar otra
        this.notificationService.confirm(
          '¿Desea registrar otra actividad?',
          () => {
            // Limpiar formulario pero mantener contrato y fecha
            const contratoId = this.actividadForm.get('contrato_id')?.value;
            const fecha = this.actividadForm.get('fecha_actividad')?.value;
            
            this.actividadForm.reset({
              contrato_id: contratoId,
              fecha_actividad: fecha,
              descripcion_actividad: ''
            });
            
            // Limpiar selecciones
            this.obligacionesSeleccionadas = [];
            this.archivosSeleccionados = [];
            this.transcripcionTexto = '';
            this.mostrarTranscripcion = false;
            this.activeTab = 'texto';
            
            this.isLoading = false;
          },
          () => {
            // No registrar otra, volver a la lista
            this.router.navigate([this.backRoute]);
          }
        );
      },
      error: (error) => {
        console.error('Error al registrar actividad:', error);
        this.notificationService.error(error.message || 'Error al registrar la actividad');
        this.isLoading = false;
      }
    });
  }

  actualizar(actividad: Actividad) {
    this.actividadesService.actualizar(actividad, this.obligacionesSeleccionadas, this.archivosSeleccionados).subscribe({
      next: (response) => {
        this.notificationService.success('Actividad actualizada correctamente');
        this.router.navigate([this.backRoute]);
      },
      error: (error) => {
        console.error('Error al actualizar actividad:', error);
        this.notificationService.error(error.message || 'Error al actualizar la actividad');
        this.isLoading = false;
      }
    });
  }

  cancelar() {
    this.router.navigate([this.backRoute]);
  }

  editarActividad() {
    this.router.navigate(['/cuentas-cobro/actividades/editar', this.actividadId]);
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
    return this.actividadForm.controls;
  }

  get totalArchivos(): number {
    return this.archivosSeleccionados.length + this.archivosActuales.length;
  }
}