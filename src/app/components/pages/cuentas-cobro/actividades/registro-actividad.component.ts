import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ActividadesService, Actividad } from '../../../../services/actividades.service';
import { AuthService } from '../../../../services/auth.service';
import { Contrato, Obligacion, ContratosService } from '../../../../services/contratos.service';
import { NotificationService } from '../../../../services/notification.service';
import { BreadcrumbComponent } from '../../../common/breadcrumb/breadcrumb.component';
import { GrabadorAudioComponent } from '../../../common/grabador-audio/grabador-audio.component';
import { LayoutComponent } from '../../../common/layout/layout.component';


@Component({
  selector: 'app-registro-actividad',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LayoutComponent,
    BreadcrumbComponent,
    GrabadorAudioComponent
  ],
  templateUrl: './registro-actividad.component.html',
  styleUrls: ['./registro-actividad.component.scss']
})
export class RegistroActividadComponent implements OnInit {
  actividadForm!: FormGroup;
  isLoading = false;
  
  // Datos
  contratos: Contrato[] = [];
  obligaciones: Obligacion[] = [];
  contratoSeleccionado: Contrato | null = null;
  
  // Control de tabs
  activeTab: 'texto' | 'audio' | 'archivo' = 'texto';
  
  // Archivos
  archivoSeleccionado: File | null = null;
  tiposArchivo = {
    'documento': { icono: 'fa-file-pdf', color: '#dc3545', extensiones: ['.pdf', '.doc', '.docx'] },
    'imagen': { icono: 'fa-file-image', color: '#28a745', extensiones: ['.jpg', '.jpeg', '.png'] },
    'hoja_calculo': { icono: 'fa-file-excel', color: '#28a745', extensiones: ['.xls', '.xlsx', '.csv'] },
    'presentacion': { icono: 'fa-file-powerpoint', color: '#dc3545', extensiones: ['.ppt', '.pptx'] }
  };
  
  // Transcripción
  transcripcionTexto = '';
  mostrarTranscripcion = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private notificationService: NotificationService,
    private actividadesService: ActividadesService,
    private contratosService: ContratosService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.initForm();
    this.cargarContratos();
    
    // Si hay un contrato en el localStorage (para mantener selección)
    const contratoGuardado = localStorage.getItem('ultimoContratoSeleccionado');
    if (contratoGuardado) {
      this.actividadForm.patchValue({ contrato_id: parseInt(contratoGuardado) });
    }
  }

  initForm() {
    this.actividadForm = this.fb.group({
      contrato_id: ['', [Validators.required]],
      fecha_actividad: [this.getFechaHoy(), [Validators.required]],
      descripcion_actividad: ['', [Validators.required, Validators.minLength(10)]],
      obligacion_id: [''],
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
        // Filtrar solo contratos activos
        this.contratos = contratos.filter(c => c.estado === 'activo');
        
        // Si es un usuario básico (contratista), filtrar solo sus contratos
        const user = this.authService.getCurrentUser();
        if (user && !this.authService.hasPermission('contratos.gestionar')) {
          this.contratos = this.contratos.filter(c => 
            c.contratista_identificacion === user.email || 
            c.contratista_nombre?.toLowerCase().includes(user.nombre?.toLowerCase() || '')
          );
        }
        
        this.isLoading = false;
        
        // Si solo hay un contrato, seleccionarlo automáticamente
        if (this.contratos.length === 1) {
          this.actividadForm.patchValue({ contrato_id: this.contratos[0].id });
          this.onContratoChange();
        }
      },
      error: (error) => {
        console.error('Error cargando contratos:', error);
        this.notificationService.error('Error al cargar contratos');
        this.isLoading = false;
      }
    });
  }

  onContratoChange() {
    const contratoId = this.actividadForm.get('contrato_id')?.value;
    if (contratoId) {
      // Guardar selección
      localStorage.setItem('ultimoContratoSeleccionado', contratoId);
      
      // Buscar contrato seleccionado
      this.contratoSeleccionado = this.contratos.find(c => c.id === parseInt(contratoId)) || null;
      
      // Cargar obligaciones del contrato
      if (this.contratoSeleccionado) {
        this.obligaciones = this.contratoSeleccionado.obligaciones || [];
      }
    } else {
      this.contratoSeleccionado = null;
      this.obligaciones = [];
    }
    
    // Resetear obligación seleccionada
    this.actividadForm.patchValue({ obligacion_id: '' });
  }

  // Manejo de tabs
  setActiveTab(tab: 'texto' | 'audio' | 'archivo') {
    this.activeTab = tab;
    
    // Si cambia a texto y hay transcripción, copiarla
    if (tab === 'texto' && this.transcripcionTexto) {
      const descripcionActual = this.actividadForm.get('descripcion_actividad')?.value;
      if (!descripcionActual) {
        this.actividadForm.patchValue({ descripcion_actividad: this.transcripcionTexto });
      }
    }
  }

  // Manejo de transcripción de voz
  onTranscripcionCompleta(resultado: any) {
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

  // Manejo de archivos
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Validar tamaño (10MB máximo)
      if (file.size > 10 * 1024 * 1024) {
        this.notificationService.error('El archivo excede el tamaño máximo de 10MB');
        return;
      }
      
      // Validar tipo
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      const tipoValido = Object.values(this.tiposArchivo).some(tipo => 
        tipo.extensiones.includes(extension)
      );
      
      if (!tipoValido) {
        this.notificationService.error('Tipo de archivo no permitido');
        return;
      }
      
      this.archivoSeleccionado = file;
    }
  }

  eliminarArchivo() {
    this.archivoSeleccionado = null;
    // Limpiar el input file
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
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
    
    // Validar que haya contenido (texto o archivo)
    const descripcion = this.actividadForm.get('descripcion_actividad')?.value;
    if (!descripcion && !this.archivoSeleccionado) {
      this.notificationService.warning('Debe proporcionar una descripción o adjuntar un archivo');
      return;
    }
    
    const actividad: Actividad = {
      ...this.actividadForm.value,
      contrato_id: parseInt(this.actividadForm.get('contrato_id')?.value),
      obligacion_id: this.actividadForm.get('obligacion_id')?.value || null
    };
    
    // Si hay transcripción, agregarla
    if (this.transcripcionTexto && this.activeTab === 'audio') {
      const transcripcionData = this.actividadForm.value;
      actividad.transcripcion_texto = this.transcripcionTexto;
      actividad.transcripcion_proveedor = transcripcionData.transcripcion_proveedor || 'navegador';
      actividad.transcripcion_modelo = transcripcionData.transcripcion_modelo || 'webkitSpeechRecognition';
      actividad.transcripcion_confianza = transcripcionData.transcripcion_confianza || 0.95;
    }
    
    this.isLoading = true;
    
    this.actividadesService.crear(actividad, this.archivoSeleccionado || undefined).subscribe({
      next: (response) => {
        this.notificationService.success('Actividad registrada correctamente');
        
        // Limpiar formulario pero mantener contrato y fecha
        const contratoId = this.actividadForm.get('contrato_id')?.value;
        const fecha = this.actividadForm.get('fecha_actividad')?.value;
        
        this.actividadForm.reset({
          contrato_id: contratoId,
          fecha_actividad: fecha,
          descripcion_actividad: '',
          obligacion_id: ''
        });
        
        // Limpiar transcripción y archivo
        this.transcripcionTexto = '';
        this.mostrarTranscripcion = false;
        this.archivoSeleccionado = null;
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al registrar actividad:', error);
        this.notificationService.error(error.message || 'Error al registrar la actividad');
        this.isLoading = false;
      }
    });
  }

  cancelar() {
    this.router.navigate(['/cuentas-cobro']);
  }

  // Getters para el template
  get f() {
    return this.actividadForm.controls;
  }
}