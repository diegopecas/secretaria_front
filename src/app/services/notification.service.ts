import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export interface Notification {
  id?: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationSubject = new Subject<Notification>();
  public notifications$ = this.notificationSubject.asObservable();

  constructor() {}

  // Método principal para mostrar notificaciones
  show(notification: Notification): void {
    const id = this.generateId();
    const notificationWithId = {
      ...notification,
      id,
      duration: notification.duration ?? 5000 // 5 segundos por defecto
    };
    
    this.notificationSubject.next(notificationWithId);
  }

  // Métodos de conveniencia
  success(message: string, title?: string, duration?: number): void {
    this.show({
      type: 'success',
      message,
      title: title || 'Éxito',
      duration
    });
  }

  error(message: string, title?: string, duration?: number): void {
    this.show({
      type: 'error',
      message,
      title: title || 'Error',
      duration: duration || 8000 // Los errores duran más
    });
  }

  warning(message: string, title?: string, duration?: number): void {
    this.show({
      type: 'warning',
      message,
      title: title || 'Advertencia',
      duration
    });
  }

  info(message: string, title?: string, duration?: number): void {
    this.show({
      type: 'info',
      message,
      title: title || 'Información',
      duration
    });
  }

  // Notificación con acciones
  confirm(message: string, onConfirm: () => void, onCancel?: () => void): void {
    this.show({
      type: 'warning',
      title: 'Confirmar',
      message,
      duration: 0, // No se auto-cierra
      actions: [
        {
          label: 'Confirmar',
          action: onConfirm
        },
        {
          label: 'Cancelar',
          action: onCancel || (() => {})
        }
      ]
    });
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}