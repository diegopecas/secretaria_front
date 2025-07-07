// layout.component.ts
import { Component, Input, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { AuthService, User } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';
import { ThemeToggleComponent } from '../../common/theme-toggle/theme-toggle.component';
import { Subject, takeUntil } from 'rxjs';
import { AppConfigService } from '../../../services/app-config.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, ThemeToggleComponent, RouterModule],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent implements OnInit, OnDestroy {
  @Input() backRoute?: string;
  @Input() backLabel?: string = 'Volver';
  
  currentUser: User | null = null;
  showMobileMenu = false;
  isMobile = false;
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService,
    public configService: AppConfigService 
  ) {
    this.checkScreenSize();
  }

  ngOnInit(): void {
    // Suscribirse a los cambios del usuario actual
    this.authService.currentUser
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });

    // Cerrar menú móvil al cambiar de ruta
    this.router.events
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.closeMobileMenu();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // Limpiar el overflow del body
    document.body.style.overflow = '';
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    this.checkScreenSize();
  }

  private checkScreenSize(): void {
    this.isMobile = window.innerWidth < 768; // Breakpoint tablet
    
    // Si cambiamos a desktop, cerrar el menú móvil
    if (!this.isMobile && this.showMobileMenu) {
      this.closeMobileMenu();
    }
  }

  goBack(): void {
    if (this.backRoute) {
      this.router.navigate([this.backRoute]);
    } else {
      window.history.back();
    }
  }

  toggleMobileMenu(): void {
    this.showMobileMenu = !this.showMobileMenu;
    
    // Prevenir scroll del body cuando el menú está abierto
    if (this.showMobileMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  closeMobileMenu(): void {
    this.showMobileMenu = false;
    document.body.style.overflow = '';
  }

  logout(): void {
    this.closeMobileMenu();
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