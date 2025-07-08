import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { LayoutComponent } from '../../common/layout/layout.component';
import { BreadcrumbComponent } from '../../common/breadcrumb/breadcrumb.component';

interface CuentasCobroMenuItem {
  title: string;
  icon: string;
  route: string;
  description: string;
  color: string;
  permissions?: string[];
  requireAll?: boolean;
  badge?: string;
}

@Component({
  selector: 'app-cuentas-cobro',
  standalone: true,
  imports: [CommonModule, LayoutComponent, BreadcrumbComponent],
  templateUrl: './cuentas-cobro.component.html',
  styleUrls: ['./cuentas-cobro.component.scss']
})
export class CuentasCobroComponent implements OnInit {
  cuentasCobroItems: CuentasCobroMenuItem[] = [
    {
      title: 'Contratistas',
      icon: '👤',
      route: '/cuentas-cobro/contratistas',
      description: 'Gestión de contratistas',
      color: '#2196F3',
      permissions: ['contratos.gestionar']
    },
    {
      title: 'Entidades',
      icon: '🏢',
      route: '/cuentas-cobro/entidades',
      description: 'Gestión de entidades contratantes',
      color: '#9C27B0',
      permissions: ['contratos.gestionar']
    },
    {
      title: 'Contratos',
      icon: '📄',
      route: '/cuentas-cobro/contratos',
      description: 'Gestión de contratos y obligaciones',
      color: '#FF9800',
      permissions: ['contratos.gestionar']
    },
    {
      title: 'Registro de Actividades',
      icon: '📝',
      route: '/cuentas-cobro/actividades',
      description: 'Registrar actividades diarias',
      color: '#4CAF50',
      permissions: ['actividades.registrar'],
      badge: 'Próximamente'
    },
    {
      title: 'Generar Cuenta',
      icon: '💳',
      route: '/cuentas-cobro/generar',
      description: 'Generar cuentas de cobro',
      color: '#F44336',
      permissions: ['cuentas_cobro.crear'],
      badge: 'Próximamente'
    },
    {
      title: 'Mis Cuentas',
      icon: '📊',
      route: '/cuentas-cobro/mis-cuentas',
      description: 'Ver mis cuentas de cobro',
      color: '#00BCD4',
      permissions: ['cuentas_cobro.ver']
    }
  ];

  menuItems: CuentasCobroMenuItem[] = [];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.filterMenuItems();
  }

  filterMenuItems() {
    this.menuItems = this.cuentasCobroItems.filter(item => {
      // Si no tiene restricciones de permisos, mostrar
      if (!item.permissions || item.permissions.length === 0) {
        return true;
      }

      // Verificar permisos
      const hasPermission = item.requireAll
        ? item.permissions.every(p => this.authService.hasPermission(p))
        : item.permissions.some(p => this.authService.hasPermission(p));
      
      return hasPermission;
    });
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }
}