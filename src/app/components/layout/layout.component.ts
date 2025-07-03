import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, ThemeToggleComponent, RouterModule],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent {
  @Input() backRoute?: string; // Ruta para el botón atrás
  @Input() backLabel?: string = 'Volver'; // Texto personalizable
  
  currentUser: User | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService
  ) {
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
  }

  goBack() {
    if (this.backRoute) {
      this.router.navigate([this.backRoute]);
    } else {
      // Si no hay ruta específica, usar el historial
      window.history.back();
    }
  }

  logout() {
    this.notificationService.confirm(
      '¿Está seguro que desea cerrar sesión?',
      () => {
        this.authService.logout();
        this.notificationService.info('Sesión cerrada correctamente');
      }
    );
  }

  getRoleName(role: string): string {
    const roleNames: { [key: string]: string } = {
      'admin': 'Admin',
      'secretaria': 'Secretaria',
      'supervisor': 'Supervisor',
      'usuario': 'Usuario'
    };
    return roleNames[role] || role;
  }
}