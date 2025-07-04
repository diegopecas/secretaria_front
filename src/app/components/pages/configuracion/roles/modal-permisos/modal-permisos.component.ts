import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../modal/modal.component';
import { RolesService, Permiso } from '../../../services/roles.service';
import { NotificationService } from '../../../services/notification.service';

interface PermisoAgrupado {
  modulo: string;
  permisos: PermisoSeleccionable[];
}

interface PermisoSeleccionable extends Permiso {
  seleccionado: boolean;
}

@Component({
  selector: 'app-modal-permisos',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './modal-permisos.component.html',
  styleUrls: ['./modal-permisos.component.scss']
})
export class ModalPermisosComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() rol: any;
  @Input() permisosRol: number[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<number[]>();

  todosLosPermisos: Permiso[] = [];
  permisosAgrupados: PermisoAgrupado[] = [];
  permisosAgrupadosFiltrados: PermisoAgrupado[] = [];
  buscador = '';

  constructor(
    private rolesService: RolesService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    if (this.isOpen) {
      this.cargarPermisos();
    }
  }

  ngOnChanges() {
    if (this.isOpen && this.todosLosPermisos.length === 0) {
      this.cargarPermisos();
    } else if (this.isOpen && this.todosLosPermisos.length > 0) {
      this.actualizarSeleccion();
    }
  }

  cargarPermisos() {
    this.rolesService.obtenerTodosLosPermisos().subscribe({
      next: (response: any) => {
        this.todosLosPermisos = response.body || response;
        this.organizarPermisos();
      },
      error: (error) => {
        console.error('Error al cargar permisos:', error);
        this.notificationService.error('Error al cargar los permisos');
      }
    });
  }

  organizarPermisos() {
    const grupos = new Map<string, PermisoSeleccionable[]>();
    
    this.todosLosPermisos.forEach(permiso => {
      const permisoSeleccionable: PermisoSeleccionable = {
        ...permiso,
        seleccionado: this.permisosRol.includes(permiso.id)
      };
      
      if (!grupos.has(permiso.modulo)) {
        grupos.set(permiso.modulo, []);
      }
      
      grupos.get(permiso.modulo)!.push(permisoSeleccionable);
    });
    
    this.permisosAgrupados = Array.from(grupos.entries())
      .map(([modulo, permisos]) => ({
        modulo: this.capitalizarModulo(modulo),
        permisos: permisos.sort((a, b) => a.nombre.localeCompare(b.nombre))
      }))
      .sort((a, b) => a.modulo.localeCompare(b.modulo));
    
    this.permisosAgrupadosFiltrados = [...this.permisosAgrupados];
  }

  actualizarSeleccion() {
    this.permisosAgrupados.forEach(grupo => {
      grupo.permisos.forEach(permiso => {
        permiso.seleccionado = this.permisosRol.includes(permiso.id);
      });
    });
    this.filtrarPermisos();
  }

  capitalizarModulo(modulo: string): string {
    return modulo.charAt(0).toUpperCase() + modulo.slice(1);
  }

  toggleModulo(grupo: PermisoAgrupado) {
    const todosSeleccionados = grupo.permisos.every(p => p.seleccionado);
    grupo.permisos.forEach(p => p.seleccionado = !todosSeleccionados);
  }

  estaModuloSeleccionado(grupo: PermisoAgrupado): boolean {
    return grupo.permisos.every(p => p.seleccionado);
  }

  estaModuloParcialmenteSeleccionado(grupo: PermisoAgrupado): boolean {
    const seleccionados = grupo.permisos.filter(p => p.seleccionado).length;
    return seleccionados > 0 && seleccionados < grupo.permisos.length;
  }

  filtrarPermisos() {
    const busqueda = this.buscador.toLowerCase();
    
    if (!busqueda) {
      this.permisosAgrupadosFiltrados = [...this.permisosAgrupados];
      return;
    }
    
    this.permisosAgrupadosFiltrados = this.permisosAgrupados
      .map(grupo => ({
        ...grupo,
        permisos: grupo.permisos.filter(p => 
          p.nombre.toLowerCase().includes(busqueda) || 
          p.descripcion.toLowerCase().includes(busqueda)
        )
      }))
      .filter(grupo => 
        grupo.modulo.toLowerCase().includes(busqueda) || 
        grupo.permisos.length > 0
      );
  }

  contarPermisosSeleccionados(): number {
    return this.permisosAgrupados
      .flatMap(grupo => grupo.permisos)
      .filter(p => p.seleccionado).length;
  }

  cerrar() {
    this.buscador = '';
    this.close.emit();
  }

  guardar() {
    const permisosSeleccionados = this.permisosAgrupados
      .flatMap(grupo => grupo.permisos)
      .filter(p => p.seleccionado)
      .map(p => p.id);
    
    this.save.emit(permisosSeleccionados);
  }
}