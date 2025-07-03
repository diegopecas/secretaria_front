import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { LayoutComponent } from '../../common/layout/layout.component';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';
import { HasPermissionDirective } from '../../../directives/has-permission.directive';
import { NotificationService } from '../../../services/notification.service';

interface RegistroDiario {
  id?: number;
  fecha: string;
  hora: string;
  descripcion: string;
  tipo: string;
  usuario?: string;
}

@Component({
  selector: 'app-registro-diario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LayoutComponent, HasPermissionDirective],
  templateUrl: './registro-diario.component.html',
  styleUrls: ['./registro-diario.component.scss']
})
export class RegistroDiarioComponent implements OnInit {
  registroForm!: FormGroup;
  registros: RegistroDiario[] = [];
  loading = false;
  submitted = false;
  
  tiposRegistro = [
    { value: 'entrada', label: 'Entrada' },
    { value: 'salida', label: 'Salida' },
    { value: 'reunion', label: 'Reunión' },
    { value: 'tarea', label: 'Tarea' },
    { value: 'otro', label: 'Otro' }
  ];

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    // Validar sesión
    this.authService.validateSession().subscribe({
      error: () => {
        this.router.navigate(['/login']);
      }
    });

    // Inicializar formulario
    this.initForm();
    
    // Cargar registros
    this.loadRegistros();
  }

  initForm() {
    const now = new Date();
    const fecha = now.toISOString().split('T')[0];
    const hora = now.toTimeString().slice(0, 5);

    this.registroForm = this.formBuilder.group({
      fecha: [fecha, Validators.required],
      hora: [hora, Validators.required],
      tipo: ['entrada', Validators.required],
      descripcion: ['', [Validators.required, Validators.minLength(3)]]
    });
  }

  get f() { return this.registroForm.controls; }

  onSubmit() {
    this.submitted = true;

    if (this.registroForm.invalid) {
      this.notificationService.warning('Por favor complete todos los campos requeridos');
      return;
    }

    this.loading = true;
    const registro: RegistroDiario = this.registroForm.value;
    
    // Simular guardado (aquí irá la llamada al servicio)
    setTimeout(() => {
      this.registros.unshift({
        ...registro,
        id: Date.now(),
        usuario: this.authService.currentUserValue?.nombre
      });
      
      this.loading = false;
      this.submitted = false;
      this.registroForm.reset();
      this.initForm();
      
      // Mostrar notificación de éxito
      this.notificationService.success('Registro guardado exitosamente');
    }, 1000);
  }

  loadRegistros() {
    // Simular carga de registros (aquí irá la llamada al servicio)
    this.registros = [
      {
        id: 1,
        fecha: '2025-01-02',
        hora: '08:00',
        tipo: 'entrada',
        descripcion: 'Inicio de jornada laboral',
        usuario: 'Administrador'
      },
      {
        id: 2,
        fecha: '2025-01-02',
        hora: '10:30',
        tipo: 'reunion',
        descripcion: 'Reunión con equipo de desarrollo',
        usuario: 'Administrador'
      }
    ];
  }

  deleteRegistro(id: number) {
    this.notificationService.confirm(
      '¿Está seguro de eliminar este registro?',
      () => {
        this.registros = this.registros.filter(r => r.id !== id);
        this.notificationService.success('Registro eliminado correctamente');
      }
    );
  }

  getTipoBadgeClass(tipo: string): string {
    const classes: { [key: string]: string } = {
      'entrada': 'badge-success',
      'salida': 'badge-error',
      'reunion': 'badge-primary',
      'tarea': 'badge-secondary',
      'otro': 'badge-secondary'
    };
    return classes[tipo] || 'badge-secondary';
  }

  // Método agregado para obtener registros por tipo
  getRegistrosPorTipo(tipo: string): RegistroDiario[] {
    return this.registros.filter(r => r.tipo === tipo);
  }
}