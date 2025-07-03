import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../../services/notification.service';
import { Subject, takeUntil } from 'rxjs';

interface NotificationDisplay extends Notification {
  isLeaving?: boolean;
}

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.scss']
})
export class NotificationComponent implements OnInit, OnDestroy {
  notifications: NotificationDisplay[] = [];
  private destroy$ = new Subject<void>();
  private timers = new Map<string, any>();

  constructor(private notificationService: NotificationService) { }

  ngOnInit(): void {
    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notification => {
        this.addNotification(notification);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // Limpiar todos los timers
    this.timers.forEach(timer => clearTimeout(timer));
  }

  private addNotification(notification: Notification): void {
    // Validar que la notificación tenga contenido
    if (!notification || !notification.message) {
      console.warn('Notificación sin mensaje:', notification);
      return;
    }

    this.notifications.push(notification as NotificationDisplay);

    // Auto-cerrar después del tiempo especificado
    if (notification.duration && notification.duration > 0 && notification.id) {
      const timer = setTimeout(() => {
        this.removeNotification(notification.id!);
      }, notification.duration);

      this.timers.set(notification.id, timer);
    }
  }

  removeNotification(id: string): void {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index > -1) {
      // Marcar como saliendo para la animación
      this.notifications[index].isLeaving = true;

      // Eliminar después de la animación
      setTimeout(() => {
        this.notifications = this.notifications.filter(n => n.id !== id);
        // Limpiar el timer si existe
        if (this.timers.has(id)) {
          clearTimeout(this.timers.get(id));
          this.timers.delete(id);
        }
      }, 300);
    }
  }

  getIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'success': '✓',
      'error': '✕',
      'warning': '⚠',
      'info': 'ℹ'
    };
    return icons[type] || 'ℹ';
  }

  handleAction(notification: NotificationDisplay, action: any): void {
    action.action();
    this.removeNotification(notification.id!);
  }
}