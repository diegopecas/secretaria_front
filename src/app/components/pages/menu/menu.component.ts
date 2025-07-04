import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, User } from '../../../services/auth.service';
import { LayoutComponent } from '../../common/layout/layout.component';

interface MenuItem {
  title: string;
  icon: string;
  route: string;
  description: string;
  color: string;
  new?: boolean;
  permissions?: string[]; // Solo permisos, no roles
  requireAll?: boolean; // Si requiere todos los permisos o solo uno
}

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, LayoutComponent],
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit {
  allMenuItems: MenuItem[] = [
    {
      title: 'Registro Diario',
      icon: '📝',
      route: '/registro-diario',
      description: 'Registre sus actividades diarias',
      color: '#FFD700',
      new: true,
      permissions: ['registro.ver']
    },
    {
      title: 'Reportes',
      icon: '📊',
      route: '/reportes',
      description: 'Generación de reportes',
      color: '#FFD700',
      permissions: ['reportes.ver']
    },
    {
      title: 'Configuración',
      icon: '⚙️',
      route: '/configuracion',
      description: 'Configuración del sistema',
      color: '#FFA500',
      permissions: ['config.ver']
    }
  ];

  menuItems: MenuItem[] = [];
  currentUser: User | null = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
    // Validar sesión al cargar
    this.authService.validateSession().subscribe({
      next: () => {
        // Filtrar opciones del menú según roles y permisos
        this.filterMenuItems();
      },
      error: () => {
        this.router.navigate(['/login']);
      }
    });

    // Suscribirse a cambios en el usuario actual
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      this.filterMenuItems();
    });
  }

  filterMenuItems() {
    if (!this.currentUser) {
      this.menuItems = [];
      return;
    }

    console.log('Usuario actual:', this.currentUser); // Debug
    console.log('Permisos del usuario:', this.currentUser.permisos); // Debug

    this.menuItems = this.allMenuItems.filter(item => {
      // Si no tiene restricciones de permisos, mostrar
      if (!item.permissions || item.permissions.length === 0) {
        return true;
      }

      // Verificar permisos
      const hasPermission = item.requireAll
        ? item.permissions.every(p => this.authService.hasPermission(p))
        : this.authService.hasAnyPermission(item.permissions);

      console.log(`Item ${item.title} requiere ${item.permissions}, tiene permiso: ${hasPermission}`); // Debug
      return hasPermission;
    });

    console.log('Items filtrados:', this.menuItems.length); // Debug
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }

  getUserRoleDisplay(): string {
    if (!this.currentUser || !this.currentUser.roles) return '';

    // Mostrar el rol más importante
    const rolesPriority = ['admin', 'supervisor', 'secretaria', 'usuario'];
    for (const role of rolesPriority) {
      if (this.currentUser.roles.includes(role)) {
        return this.getRoleName(role);
      }
    }

    return this.currentUser.roles[0] || '';
  }

  getRoleName(role: string): string {
    const roleNames: { [key: string]: string } = {
      'admin': 'Administrador',
      'secretaria': 'Secretaria',
      'supervisor': 'Supervisor',
      'usuario': 'Usuario'
    };
    return roleNames[role] || role;
  }
}