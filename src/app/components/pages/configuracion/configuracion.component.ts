import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { LayoutComponent } from '../../common/layout/layout.component';

interface ConfigMenuItem {
  title: string;
  icon: string;
  route: string;
  description: string;
  color: string;
  permissions?: string[];
}

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, LayoutComponent],
  templateUrl: './configuracion.component.html',
  styleUrls: ['./configuracion.component.scss']
})
export class ConfiguracionComponent implements OnInit {
  configItems: ConfigMenuItem[] = [
    {
      title: 'Usuarios',
      icon: '👥',
      route: '/configuracion/usuarios',
      description: 'Gestión de usuarios del sistema',
      color: '#FFA500',
      permissions: ['usuarios.ver']
    },
    {
      title: 'Roles',
      icon: '🔐',
      route: '/configuracion/roles',
      description: 'Gestión de roles y permisos',
      color: '#FFD700',
      permissions: ['roles.ver']
    }
  ];

  menuItems: ConfigMenuItem[] = [];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.filterMenuItems();
  }

  filterMenuItems() {
    this.menuItems = this.configItems.filter(item => {
      // Si no tiene restricciones de permisos, mostrar
      if (!item.permissions || item.permissions.length === 0) {
        return true;
      }

      // Verificar si tiene alguno de los permisos requeridos
      return item.permissions.some(p => this.authService.hasPermission(p));
    });
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }
}