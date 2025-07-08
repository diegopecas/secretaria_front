import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HasPermissionDirective } from '../../../../../directives/has-permission.directive';
import { NotificationService } from '../../../../../services/notification.service';
import { ContratosService, Contrato, Supervisor, Obligacion, ValorMensual } from '../../../../../services/contratos.service';
import { ContratistasService, Contratista } from '../../../../../services/contratistas.service';
import { EntidadesService, Entidad } from '../../../../../services/entidades.service';
import { BreadcrumbComponent } from '../../../../common/breadcrumb/breadcrumb.component';
import { LayoutComponent } from '../../../../common/layout/layout.component';

type ViewMode = 'create' | 'edit' | 'view';

@Component({
  selector: 'app-gestion-contrato',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LayoutComponent,
    BreadcrumbComponent,
    HasPermissionDirective
  ],
  templateUrl: './gestion-contrato.component.html',
  styleUrls: ['./gestion-contrato.component.scss']
})
export class GestionContratoComponent implements OnInit {
  contratoForm!: FormGroup;
  mode: ViewMode = 'create';
  contratoId?: number;
  isLoading = false;
  
  // Listas para selects
  contratistas: Contratista[] = [];
  entidades: Entidad[] = [];
  
  // Datos
  contrato: Contrato | null = null;
  
  // Control de acordeón
  activeAccordion: string = 'informacion-basica';
  
  // Títulos dinámicos
  pageTitle = 'Crear Contrato';
  pageSubtitle = 'Registre un nuevo contrato en el sistema';
  pageIcon = '➕';
  backRoute = '/cuentas-cobro/contratos';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private contratosService: ContratosService,
    private contratistasService: ContratistasService,
    private entidadesService: EntidadesService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    // Obtener modo de la ruta
    this.mode = this.route.snapshot.data['mode'] || 'create';
    this.contratoId = this.route.snapshot.params['id'];
    
    this.setPageInfo();
    this.initForm();
    this.cargarDatosIniciales();
    
    // Si es editar o ver, cargar datos del contrato
    if (this.contratoId && (this.mode === 'edit' || this.mode === 'view')) {
      this.cargarContrato();
    }
  }

  setPageInfo() {
    switch (this.mode) {
      case 'create':
        this.pageTitle = 'Crear Contrato';
        this.pageSubtitle = 'Registre un nuevo contrato en el sistema';
        this.pageIcon = '➕';
        break;
      case 'edit':
        this.pageTitle = 'Editar Contrato';
        this.pageSubtitle = 'Modifique los datos del contrato';
        this.pageIcon = '✏️';
        break;
      case 'view':
        this.pageTitle = 'Detalle de Contrato';
        this.pageSubtitle = 'Información completa del contrato';
        this.pageIcon = '👁️';
        break;
    }
  }

  initForm() {
    const isDisabled = this.mode === 'view';
    
    this.contratoForm = this.fb.group({
      // Información básica
      numero_contrato: [
        { value: '', disabled: isDisabled }, 
        [Validators.required, Validators.minLength(3), Validators.maxLength(50)]
      ],
      contratista_id: [
        { value: '', disabled: isDisabled }, 
        [Validators.required]
      ],
      entidad_id: [
        { value: '', disabled: isDisabled }, 
        [Validators.required]
      ],
      fecha_suscripcion: [
        { value: '', disabled: isDisabled }, 
        [Validators.required]
      ],
      fecha_inicio: [
        { value: '', disabled: isDisabled }, 
        [Validators.required]
      ],
      fecha_terminacion: [
        { value: '', disabled: isDisabled }, 
        [Validators.required]
      ],
      objeto_contrato: [
        { value: '', disabled: isDisabled }, 
        [Validators.required, Validators.minLength(10)]
      ],
      valor_total: [
        { value: '', disabled: isDisabled }, 
        [Validators.required, Validators.min(1)]
      ],
      dependencia: [
        { value: '', disabled: isDisabled }
      ],
      unidad_operativa: [
        { value: '', disabled: isDisabled }
      ],
      estado: [
        { value: 'activo', disabled: isDisabled }
      ],
      
      // FormArrays
      supervisores: this.fb.array([]),
      obligaciones: this.fb.array([]),
      valores_mensuales: this.fb.array([])
    }, {
      validators: [this.validarFechas]
    });

    // Agregar al menos un supervisor si es crear
    if (this.mode === 'create') {
      this.agregarSupervisor();
      this.agregarObligacion();
    }
  }

  // Validador personalizado para fechas
  validarFechas(control: AbstractControl): {[key: string]: boolean} | null {
    const fechaInicio = control.get('fecha_inicio')?.value;
    const fechaTerminacion = control.get('fecha_terminacion')?.value;
    
    if (fechaInicio && fechaTerminacion) {
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaTerminacion);
      
      if (inicio >= fin) {
        return { fechasInvalidas: true };
      }
    }
    
    return null;
  }

  cargarDatosIniciales() {
    // Cargar contratistas
    this.contratistasService.obtenerTodos().subscribe({
      next: (contratistas) => {
        this.contratistas = contratistas.filter(c => c.activo);
      },
      error: (error) => {
        console.error('Error cargando contratistas:', error);
      }
    });

    // Cargar entidades
    this.entidadesService.obtenerTodos().subscribe({
      next: (entidades) => {
        this.entidades = entidades.filter(e => e.activo);
      },
      error: (error) => {
        console.error('Error cargando entidades:', error);
      }
    });
  }

  cargarContrato() {
    this.isLoading = true;
    this.contratosService.obtenerPorId(this.contratoId!).subscribe({
      next: (contrato) => {
        this.contrato = contrato;
        
        // Cargar datos básicos
        this.contratoForm.patchValue({
          numero_contrato: contrato.numero_contrato,
          contratista_id: contrato.contratista_id,
          entidad_id: contrato.entidad_id,
          fecha_suscripcion: contrato.fecha_suscripcion,
          fecha_inicio: contrato.fecha_inicio,
          fecha_terminacion: contrato.fecha_terminacion,
          objeto_contrato: contrato.objeto_contrato,
          valor_total: contrato.valor_total,
          dependencia: contrato.dependencia,
          unidad_operativa: contrato.unidad_operativa,
          estado: contrato.estado
        });

        // Cargar supervisores
        if (contrato.supervisores && contrato.supervisores.length > 0) {
          this.supervisoresArray.clear();
          contrato.supervisores.forEach(supervisor => {
            this.agregarSupervisor(supervisor);
          });
        }

        // Cargar obligaciones
        if (contrato.obligaciones && contrato.obligaciones.length > 0) {
          this.obligacionesArray.clear();
          contrato.obligaciones.forEach(obligacion => {
            this.agregarObligacion(obligacion);
          });
        }

        // Cargar valores mensuales
        if (contrato.valores_mensuales && contrato.valores_mensuales.length > 0) {
          this.valoresMensualesArray.clear();
          contrato.valores_mensuales.forEach(valor => {
            this.agregarValorMensual(valor);
          });
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando contrato:', error);
        this.notificationService.error('Error al cargar el contrato');
        this.router.navigate([this.backRoute]);
      }
    });
  }

  // Getters para FormArrays
  get supervisoresArray() {
    return this.contratoForm.get('supervisores') as FormArray;
  }

  get obligacionesArray() {
    return this.contratoForm.get('obligaciones') as FormArray;
  }

  get valoresMensualesArray() {
    return this.contratoForm.get('valores_mensuales') as FormArray;
  }

  // Métodos para supervisores
  agregarSupervisor(supervisor?: Supervisor) {
    const isDisabled = this.mode === 'view';
    const supervisorForm = this.fb.group({
      id: [supervisor?.id || null],
      nombre: [
        { value: supervisor?.nombre || '', disabled: isDisabled },
        [Validators.required, Validators.minLength(3)]
      ],
      cargo: [
        { value: supervisor?.cargo || '', disabled: isDisabled }
      ],
      tipo: [
        { value: supervisor?.tipo || 'principal', disabled: isDisabled }
      ]
    });
    
    this.supervisoresArray.push(supervisorForm);
  }

  eliminarSupervisor(index: number) {
    if (this.supervisoresArray.length > 1) {
      this.supervisoresArray.removeAt(index);
    } else {
      this.notificationService.warning('Debe haber al menos un supervisor');
    }
  }

  // Métodos para obligaciones
  agregarObligacion(obligacion?: Obligacion) {
    const isDisabled = this.mode === 'view';
    const numero = obligacion?.numero_obligacion || (this.obligacionesArray.length + 1);
    
    const obligacionForm = this.fb.group({
      id: [obligacion?.id || null],
      numero_obligacion: [
        { value: numero, disabled: isDisabled },
        [Validators.required, Validators.min(1)]
      ],
      descripcion: [
        { value: obligacion?.descripcion || '', disabled: isDisabled },
        [Validators.required, Validators.minLength(10)]
      ]
    });
    
    this.obligacionesArray.push(obligacionForm);
  }

  eliminarObligacion(index: number) {
    if (this.obligacionesArray.length > 1) {
      this.obligacionesArray.removeAt(index);
      // Reordenar números
      this.reordenarObligaciones();
    } else {
      this.notificationService.warning('Debe haber al menos una obligación');
    }
  }

  reordenarObligaciones() {
    this.obligacionesArray.controls.forEach((control, index) => {
      control.patchValue({ numero_obligacion: index + 1 });
    });
  }

  // Métodos para valores mensuales
  agregarValorMensual(valor?: ValorMensual) {
    const isDisabled = this.mode === 'view';
    const valorForm = this.fb.group({
      id: [valor?.id || null],
      mes: [
        { value: valor?.mes || '', disabled: isDisabled },
        [Validators.required, Validators.min(1), Validators.max(12)]
      ],
      anio: [
        { value: valor?.anio || new Date().getFullYear(), disabled: isDisabled },
        [Validators.required, Validators.min(2020)]
      ],
      valor: [
        { value: valor?.valor || '', disabled: isDisabled },
        [Validators.required, Validators.min(1)]
      ],
      porcentaje_avance_fisico: [
        { value: valor?.porcentaje_avance_fisico || '', disabled: isDisabled },
        [Validators.min(0), Validators.max(100)]
      ],
      porcentaje_avance_financiero: [
        { value: valor?.porcentaje_avance_financiero || '', disabled: isDisabled },
        [Validators.min(0), Validators.max(100)]
      ]
    });
    
    this.valoresMensualesArray.push(valorForm);
  }

  eliminarValorMensual(index: number) {
    this.valoresMensualesArray.removeAt(index);
  }

  // Método para generar valores mensuales automáticamente
  generarValoresMensuales() {
    if (!this.contratoForm.get('fecha_inicio')?.value || 
        !this.contratoForm.get('fecha_terminacion')?.value ||
        !this.contratoForm.get('valor_total')?.value) {
      this.notificationService.warning('Complete fechas y valor total primero');
      return;
    }

    const fechaInicio = new Date(this.contratoForm.get('fecha_inicio')?.value);
    const fechaTerminacion = new Date(this.contratoForm.get('fecha_terminacion')?.value);
    const valorTotal = this.contratoForm.get('valor_total')?.value;

    // Calcular meses
    const meses: { mes: number; año: number }[] = [];
    const current = new Date(fechaInicio);
    
    while (current <= fechaTerminacion) {
      meses.push({
        mes: current.getMonth() + 1,
        año: current.getFullYear()
      });
      current.setMonth(current.getMonth() + 1);
    }

    // Limpiar valores actuales
    this.valoresMensualesArray.clear();

    // Crear valores mensuales
    const valorMensual = Math.round(valorTotal / meses.length);
    meses.forEach((periodo, index) => {
      this.agregarValorMensual({
        mes: periodo.mes,
        anio: periodo.año,
        valor: index === meses.length - 1 
          ? valorTotal - (valorMensual * (meses.length - 1)) // Ajustar último mes
          : valorMensual,
        porcentaje_avance_fisico: Math.round((index + 1) / meses.length * 100),
        porcentaje_avance_financiero: Math.round((index + 1) / meses.length * 100)
      });
    });

    this.notificationService.success('Valores mensuales generados automáticamente');
  }

  onSubmit() {
    if (this.contratoForm.invalid) {
      this.notificationService.warning('Por favor complete todos los campos requeridos');
      Object.keys(this.contratoForm.controls).forEach(key => {
        this.contratoForm.get(key)?.markAsTouched();
      });
      
      // Marcar FormArrays
      this.supervisoresArray.controls.forEach(control => {
        Object.keys(control.value).forEach(key => {
          control.get(key)?.markAsTouched();
        });
      });
      
      this.obligacionesArray.controls.forEach(control => {
        Object.keys(control.value).forEach(key => {
          control.get(key)?.markAsTouched();
        });
      });
      
      return;
    }

    // Validar fechas
    if (this.contratoForm.errors?.['fechasInvalidas']) {
      this.notificationService.error('La fecha de terminación debe ser posterior a la fecha de inicio');
      return;
    }

    // Validar obligaciones únicas
    const obligaciones = this.obligacionesArray.value;
    const descripciones = obligaciones.map((o: any) => o.descripcion.toLowerCase().trim());
    const hayDuplicados = descripciones.length !== new Set(descripciones).size;
    
    if (hayDuplicados) {
      this.notificationService.error('Las obligaciones deben ser únicas');
      return;
    }

    const formData = this.contratoForm.getRawValue();
    
    this.isLoading = true;

    if (this.mode === 'create') {
      this.crear(formData);
    } else if (this.mode === 'edit') {
      this.actualizar(formData);
    }
  }

  crear(contratoData: any) {
    this.contratosService.crear(contratoData).subscribe({
      next: (response) => {
        this.notificationService.success('Contrato creado correctamente');
        this.router.navigate([this.backRoute]);
      },
      error: (error) => {
        this.isLoading = false;
        const mensaje = error.message || 'Error al crear contrato';
        this.notificationService.error(mensaje);
      }
    });
  }

  actualizar(contratoData: any) {
    contratoData.id = this.contratoId;
    
    this.contratosService.actualizar(contratoData).subscribe({
      next: (response) => {
        this.notificationService.success('Contrato actualizado correctamente');
        this.router.navigate([this.backRoute]);
      },
      error: (error) => {
        this.isLoading = false;
        const mensaje = error.message || 'Error al actualizar contrato';
        this.notificationService.error(mensaje);
      }
    });
  }

  // Control del acordeón
  toggleAccordion(section: string) {
    this.activeAccordion = this.activeAccordion === section ? '' : section;
  }

  isAccordionActive(section: string): boolean {
    return this.activeAccordion === section;
  }

  cancelar() {
    this.router.navigate([this.backRoute]);
  }

  editarContrato() {
    this.router.navigate(['/cuentas-cobro/contratos/editar', this.contratoId]);
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
    return this.contratoForm.controls;
  }

  // Obtener nombres para mostrar
  getNombreContratista(id: number): string {
    const contratista = this.contratistas.find(c => c.id === id);
    return contratista ? contratista.nombre_completo : '';
  }

  getNombreEntidad(id: number): string {
    const entidad = this.entidades.find(e => e.id === id);
    return entidad ? entidad.nombre : '';
  }

  getMeses() {
    return [
      { value: 1, label: 'Enero' },
      { value: 2, label: 'Febrero' },
      { value: 3, label: 'Marzo' },
      { value: 4, label: 'Abril' },
      { value: 5, label: 'Mayo' },
      { value: 6, label: 'Junio' },
      { value: 7, label: 'Julio' },
      { value: 8, label: 'Agosto' },
      { value: 9, label: 'Septiembre' },
      { value: 10, label: 'Octubre' },
      { value: 11, label: 'Noviembre' },
      { value: 12, label: 'Diciembre' }
    ];
  }
}