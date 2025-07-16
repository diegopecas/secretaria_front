import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HasPermissionDirective } from '../../../../../directives/has-permission.directive';
import { NotificationService } from '../../../../../services/notification.service';
import { LayoutComponent } from '../../../../common/layout/layout.component';
import { BreadcrumbComponent } from '../../../../common/breadcrumb/breadcrumb.component';
import { ActividadesService, Actividad, Obligacion } from '../../../../../services/actividades.service';
import { ContratosService, Contrato } from '../../../../../services/contratos.service';
import { ContratistasService, Contratista } from '../../../../../services/contratistas.service';
import { UsuariosContratistasService } from '../../../../../services/usuarios-contratistas.service';
import { ThemeService } from '../../../../../services/theme.service';
import { ModalComponent } from '../../../../common/modal/modal.component';
import { GrabadorAudioComponent } from '../../../../common/grabador-audio/grabador-audio.component';

type ViewMode = 'create' | 'edit' | 'view';

@Component({
  selector: 'app-gestion-actividad',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    LayoutComponent,
    BreadcrumbComponent,
    HasPermissionDirective,
    ModalComponent,
    GrabadorAudioComponent
  ],
  templateUrl: './gestion-actividad.component.html',
  styleUrls: ['./gestion-actividad.component.scss']
})
export class GestionActividadComponent implements OnInit {
  actividadForm!: FormGroup;
  mode: ViewMode = 'create';
  actividadId?: number;
  contratoId?: number;
  isLoading = false;

  // Datos
  actividad: Actividad | null = null;
  contrato: Contrato | null = null;
  contratistaNombre: string = '';
  obligaciones: Obligacion[] = [];
  obligacionesSeleccionadas: number[] = [];

  // Selectores en cascada
  contratistas: Contratista[] = [];
  contratistaSeleccionado: number | null = null;
  contratos: Contrato[] = [];

  // Archivos
  archivosSeleccionados: File[] = [];
  archivosActuales: any[] = [];

  // Transcripción
  mostrarTranscripcion: boolean = false;
  transcripcionTexto: string = '';
  transcripcionOriginal: string = '';
  datosTranscripcion: any = null;

  // UI
  activeTab: string = 'texto';
  mostrarModalObligaciones: boolean = false;

  // Títulos dinámicos
  pageTitle = 'Registrar Actividad';
  pageSubtitle = 'Ingrese los detalles de la actividad realizada';
  pageIcon = '➕';
  backRoute = '/cuentas-cobro/actividades';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private actividadesService: ActividadesService,
    private contratosService: ContratosService,
    private contratistasService: ContratistasService,
    private usuariosContratistasService: UsuariosContratistasService,
    private notificationService: NotificationService,
    public themeService: ThemeService
  ) { }

  ngOnInit() {
    // Obtener modo de la ruta
    this.mode = this.route.snapshot.data['mode'] || 'create';
    this.actividadId = this.route.snapshot.params['id'];
    this.contratoId = this.route.snapshot.params['contratoId'] || null;

    this.initForm();

    // Cargar contratistas primero
    this.cargarContratistas();

    // Si es editar o ver, cargar datos de la actividad
    if (this.actividadId && (this.mode === 'edit' || this.mode === 'view')) {
      this.cargarActividad();
    }
  }

  setPageInfo() {
    const contratoInfo = this.contrato ? ` - Contrato ${this.contrato.numero_contrato}` : '';
    const contratistaInfo = this.contratistaNombre ? ` - ${this.contratistaNombre}` : '';

    switch (this.mode) {
      case 'create':
        this.pageTitle = `Registrar Actividad${contratoInfo}`;
        this.pageSubtitle = `Ingrese los detalles de la actividad realizada${contratistaInfo}`;
        this.pageIcon = '➕';
        break;
      case 'edit':
        this.pageTitle = `Editar Actividad${contratoInfo}`;
        this.pageSubtitle = `Modifique los detalles de la actividad${contratistaInfo}`;
        this.pageIcon = '✏️';
        break;
      case 'view':
        this.pageTitle = `Detalle de Actividad${contratoInfo}`;
        this.pageSubtitle = `Información de la actividad realizada${contratistaInfo}`;
        this.pageIcon = '👁️';
        break;
    }
  }

  initForm() {
    const isDisabled = this.mode === 'view';

    this.actividadForm = this.fb.group({
      contrato_id: [
        { value: this.contratoId || '', disabled: isDisabled },
        [Validators.required]
      ],
      fecha_actividad: [
        { value: this.obtenerFechaActual(), disabled: isDisabled },
        [Validators.required]
      ],
      descripcion_actividad: [
        { value: '', disabled: isDisabled },
        [Validators.required, Validators.minLength(10)]
      ]
    });
  }

  cargarContratistas() {
    this.isLoading = true;

    // Obtener contratistas según permisos
    this.usuariosContratistasService.obtenerMisContratistas().subscribe({
      next: (contratistas) => {
        this.contratistas = contratistas.filter(c => c.activo);

        // Si solo hay un contratista, seleccionarlo automáticamente
        if (this.contratistas.length === 1) {
          this.contratistaSeleccionado = this.contratistas[0].id!;
          this.contratistaNombre = this.contratistas[0].nombre_completo;
          this.onContratistaChange();
        } else if (this.contratistas.length > 1) {
          // Buscar si hay uno principal
          const principal = this.contratistas.find(c => c.es_principal === true);
          if (principal) {
            this.contratistaSeleccionado = principal.id!;
            this.contratistaNombre = principal.nombre_completo;
            this.onContratistaChange();
          }
        }

        this.isLoading = false;
        this.setPageInfo();
      },
      error: (error) => {
        console.error('Error al cargar contratistas:', error);
        this.notificationService.error('Error al cargar contratistas');
        this.isLoading = false;
      }
    });
  }

  onContratistaChange() {
    // Limpiar contratos y selección cuando cambia el contratista
    this.contratos = [];
    this.contrato = null;
    this.actividadForm.get('contrato_id')?.setValue('');
    this.obligaciones = [];

    if (this.contratistaSeleccionado) {
      // Actualizar nombre del contratista para el título
      const contratista = this.contratistas.find(c => c.id === this.contratistaSeleccionado);
      if (contratista) {
        this.contratistaNombre = contratista.nombre_completo;
        this.setPageInfo();
      }

      this.cargarContratos();
    }
  }

  cargarContratos() {
    if (!this.contratistaSeleccionado) {
      return;
    }

    this.isLoading = true;

    this.contratosService.obtenerPorContratista(this.contratistaSeleccionado).subscribe({
      next: (contratos) => {
        this.contratos = contratos;

        // Si hay un contrato preseleccionado (modo editar/ver)
        if (this.contratoId) {
          this.actividadForm.get('contrato_id')?.setValue(this.contratoId);
          this.onContratoChange();
        }

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar contratos:', error);
        this.notificationService.error('Error al cargar contratos');
        this.isLoading = false;
      }
    });
  }

  cargarDatosContrato() {
    const contratoId = this.actividadForm.get('contrato_id')?.value;
    if (!contratoId) {
      this.contrato = null;
      this.obligaciones = [];
      this.setPageInfo();
      return;
    }

    this.isLoading = true;
    this.contratosService.obtenerPorId(contratoId).subscribe({
      next: (contrato) => {
        this.contrato = contrato;

        // Cargar obligaciones
        if (contrato.obligaciones && contrato.obligaciones.length > 0) {
          this.obligaciones = contrato.obligaciones;
        } else {
          this.obligaciones = [];
        }

        this.setPageInfo();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando contrato:', error);
        this.notificationService.error('Error al cargar el contrato');
        this.isLoading = false;
      }
    });
  }
  cargarActividad() {
    this.isLoading = true;
    this.actividadesService.obtenerPorId(this.actividadId!).subscribe({
      next: (actividad) => {
        this.actividad = actividad;
        this.contratoId = actividad.contrato_id;

        // Intentar determinar el contratista a partir de los datos del contrato
        // Si el objeto contrato no existe en la actividad, solo usaremos el contrato_id
        if (actividad.contrato_id) {
          // Primero cargar el contratista correspondiente al contratoId
          this.cargarContratistaDelContrato(actividad.contrato_id);
        }

        // Cargar datos del formulario
        this.actividadForm.patchValue({
          contrato_id: actividad.contrato_id,
          fecha_actividad: actividad.fecha_actividad,
          descripcion_actividad: actividad.descripcion_actividad
        });

        // Cargar obligaciones
        if (actividad.obligaciones && actividad.obligaciones.length > 0) {
          this.obligacionesSeleccionadas = actividad.obligaciones.map(o => o.id!);
        }

        // Cargar archivos
        if (actividad.archivos && actividad.archivos.length > 0) {
          this.archivosActuales = actividad.archivos;
        }

        // Cargar datos de transcripción
        if (actividad.transcripcion_texto) {
          this.transcripcionTexto = actividad.transcripcion_texto;
          this.transcripcionOriginal = actividad.transcripcion_texto;
          this.datosTranscripcion = {
            texto: actividad.transcripcion_texto,
            proveedor: actividad.transcripcion_proveedor,
            modelo: actividad.transcripcion_modelo,
            confianza: actividad.transcripcion_confianza
          };
        }

        this.setPageInfo();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando actividad:', error);
        this.notificationService.error('Error al cargar la actividad');
        this.router.navigate([this.backRoute]);
      }
    });
  }

  // Método auxiliar para cargar el contratista a partir del ID del contrato
  cargarContratistaDelContrato(contratoId: number) {
    this.contratosService.obtenerPorId(contratoId).subscribe({
      next: (contrato) => {
        if (contrato && contrato.contratista_id) {
          this.contratistaSeleccionado = contrato.contratista_id;
          this.contratistaNombre = contrato.contratista_nombre || '';
          this.onContratistaChange();
        }
      },
      error: (error) => {
        console.error('Error obteniendo información del contratista:', error);
        // No mostramos error al usuario, continuamos con la carga de la actividad
      }
    });
  }

  onContratoChange() {
    this.cargarDatosContrato();
  }

  obtenerFechaActual(): string {
    const hoy = new Date();
    return hoy.toISOString().substring(0, 10);
  }

  onSubmit() {
    if (this.actividadForm.invalid) {
      this.notificationService.warning('Por favor complete todos los campos requeridos');
      Object.keys(this.actividadForm.controls).forEach(key => {
        this.actividadForm.get(key)?.markAsTouched();
      });
      return;
    }

    const formData = this.actividadForm.getRawValue();

    // Preparar los datos de la actividad
    const actividad: Actividad = {
      contrato_id: formData.contrato_id,
      fecha_actividad: formData.fecha_actividad,
      descripcion_actividad: formData.descripcion_actividad
    };

    // Agregar datos de transcripción si los hay
    if (this.datosTranscripcion) {
      actividad.transcripcion_texto = this.datosTranscripcion.texto;
      actividad.transcripcion_proveedor = this.datosTranscripcion.proveedor;
      actividad.transcripcion_modelo = this.datosTranscripcion.modelo;
      actividad.transcripcion_confianza = this.datosTranscripcion.confianza;
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
    this.actividadesService.crear(
      actividad,
      this.obligacionesSeleccionadas,
      this.archivosSeleccionados
    ).subscribe({
      next: (response) => {
        this.notificationService.success('Actividad registrada correctamente');
        if (this.contratoId) {
          this.router.navigate(['/cuentas-cobro/actividades/lista', this.contratoId]);
        } else {
          this.router.navigate([this.backRoute]);
        }
      },
      error: (error) => {
        this.isLoading = false;
        const mensaje = error.message || 'Error al registrar actividad';
        this.notificationService.error(mensaje);
      }
    });
  }

  actualizar(actividad: Actividad) {
    this.actividadesService.actualizar(
      actividad,
      this.obligacionesSeleccionadas,
      this.archivosSeleccionados
    ).subscribe({
      next: (response) => {
        this.notificationService.success('Actividad actualizada correctamente');
        if (this.contratoId) {
          this.router.navigate(['/cuentas-cobro/actividades/lista', this.contratoId]);
        } else {
          this.router.navigate([this.backRoute]);
        }
      },
      error: (error) => {
        this.isLoading = false;
        const mensaje = error.message || 'Error al actualizar actividad';
        this.notificationService.error(mensaje);
      }
    });
  }

  abrirModalObligaciones() {
    this.mostrarModalObligaciones = true;
  }

  cerrarModalObligaciones() {
    this.mostrarModalObligaciones = false;
  }

  toggleObligacion(obligacionId: number) {
    const index = this.obligacionesSeleccionadas.indexOf(obligacionId);
    if (index > -1) {
      this.obligacionesSeleccionadas.splice(index, 1);
    } else {
      this.obligacionesSeleccionadas.push(obligacionId);
    }
  }

  isObligacionSeleccionada(obligacionId?: number): boolean {
    return obligacionId ? this.obligacionesSeleccionadas.includes(obligacionId) : false;
  }

  onFileSelected(event: any) {
    const files = event.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        this.archivosSeleccionados.push(files[i]);
      }
    }
  }

  eliminarArchivoNuevo(index: number) {
    this.archivosSeleccionados.splice(index, 1);
  }

  eliminarArchivoExistente(archivo: any) {
    if (this.isViewMode) return;

    this.isLoading = true;
    this.actividadesService.eliminarArchivo(archivo.id).subscribe({
      next: (response) => {
        this.archivosActuales = this.archivosActuales.filter(a => a.id !== archivo.id);
        this.notificationService.success('Archivo eliminado correctamente');
        this.isLoading = false;
      },
      error: (error) => {
        const mensaje = error.message || 'Error al eliminar archivo';
        this.notificationService.error(mensaje);
        this.isLoading = false;
      }
    });
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  onTextoTranscrito(resultado: any) {
    if (resultado && resultado.texto) {
      this.transcripcionTexto = resultado.texto;
      this.mostrarTranscripcion = true;
      this.datosTranscripcion = resultado;

      // Si no hay descripción o está vacía, utilizamos la transcripción
      const descripcionActual = this.actividadForm.get('descripcion_actividad')?.value;
      if (!descripcionActual || descripcionActual.trim() === '') {
        this.actividadForm.patchValue({
          descripcion_actividad: resultado.texto
        });
      }
    }
  }

  getIconoArchivo(nombreArchivo: string): string {
    const extension = nombreArchivo.split('.').pop()?.toLowerCase() || '';

    const iconos: { [key: string]: string } = {
      pdf: 'fa-file-pdf',
      doc: 'fa-file-word',
      docx: 'fa-file-word',
      xls: 'fa-file-excel',
      xlsx: 'fa-file-excel',
      ppt: 'fa-file-powerpoint',
      pptx: 'fa-file-powerpoint',
      jpg: 'fa-file-image',
      jpeg: 'fa-file-image',
      png: 'fa-file-image',
      gif: 'fa-file-image',
      mp3: 'fa-file-audio',
      wav: 'fa-file-audio',
      mp4: 'fa-file-video',
      zip: 'fa-file-archive',
      rar: 'fa-file-archive'
    };

    return iconos[extension] || 'fa-file';
  }

  getColorArchivo(nombreArchivo: string): string {
    const extension = nombreArchivo.split('.').pop()?.toLowerCase() || '';

    const colores: { [key: string]: string } = {
      pdf: '#e74c3c',
      doc: '#3498db',
      docx: '#3498db',
      xls: '#2ecc71',
      xlsx: '#2ecc71',
      ppt: '#e67e22',
      pptx: '#e67e22',
      jpg: '#9b59b6',
      jpeg: '#9b59b6',
      png: '#9b59b6',
      gif: '#9b59b6',
      mp3: '#1abc9c',
      wav: '#1abc9c',
      mp4: '#e74c3c',
      zip: '#95a5a6',
      rar: '#95a5a6'
    };

    return colores[extension] || '#7f8c8d';
  }

  formatearTamanoArchivo(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  cancelar() {
    if (this.contratoId) {
      this.router.navigate(['/cuentas-cobro/actividades/lista', this.contratoId]);
    } else {
      this.router.navigate([this.backRoute]);
    }
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

  get contratoSeleccionado(): Contrato | null {
    return this.contrato;
  }

  get totalArchivos(): number {
    return this.archivosSeleccionados.length + this.archivosActuales.length;
  }
}