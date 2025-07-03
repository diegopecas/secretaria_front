import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, timer, of } from 'rxjs';
import { tap, catchError, switchMap, filter } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { StorageService } from './storage.service';
import { NotificationService } from './notification.service';

export interface User {
  id: number;
  nombre: string;
  email: string;
  roles?: string[];
  permisos?: string[];
}

export interface AuthResponse {
  success: boolean;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: User;
  message?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.api + 'auth';
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;
  
  private refreshTokenTimeout: any;
  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  constructor(
    private http: HttpClient,
    private router: Router,
    private storage: StorageService,
    private notificationService: NotificationService
  ) {
    const storedUser = this.storage.getItem('user');
    this.currentUserSubject = new BehaviorSubject<User | null>(storedUser);
    this.currentUser = this.currentUserSubject.asObservable();
    
    // Iniciar auto-renovación si hay token
    if (this.getAccessToken()) {
      this.scheduleTokenRefresh();
    }
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, password })
      .pipe(
        tap(response => {
          console.log('Login response:', response);
          if (response.success && response.access_token && response.user) {
            this.handleAuthSuccess(response);
          }
        }),
        catchError(this.handleError)
      );
  }

  register(nombre: string, email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, { nombre, email, password })
      .pipe(
        catchError(this.handleError)
      );
  }

  logout(): void {
    const token = this.getAccessToken();
    
    // Cancelar auto-renovación
    this.cancelTokenRefresh();
    
    if (token) {
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
      this.http.post(`${this.apiUrl}/logout`, {}, { headers }).subscribe({
        next: () => {
          this.clearSession();
        },
        error: () => {
          this.clearSession();
        }
      });
    } else {
      this.clearSession();
    }
  }

  // Cerrar todas las sesiones
  logoutAllDevices(): Observable<any> {
    const token = this.getAccessToken();
    if (!token) {
      return throwError(() => new Error('No hay token'));
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.post(`${this.apiUrl}/logout-all`, {}, { headers })
      .pipe(
        tap(() => {
          this.notificationService.success('Todas las sesiones han sido cerradas');
        }),
        catchError(this.handleError)
      );
  }

  // Obtener sesiones activas
  getActiveSessions(): Observable<any> {
    const token = this.getAccessToken();
    if (!token) {
      return throwError(() => new Error('No hay token'));
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get(`${this.apiUrl}/sessions`, { headers })
      .pipe(
        catchError(this.handleError)
      );
  }

  validateSession(): Observable<AuthResponse> {
    const token = this.getAccessToken();
    if (!token) {
      return throwError(() => new Error('No hay token'));
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get<AuthResponse>(`${this.apiUrl}/validate`, { headers })
      .pipe(
        tap(response => {
          if (response.success && response.user) {
            this.storage.setItem('user', response.user);
            this.currentUserSubject.next(response.user);
          }
        }),
        catchError(error => {
          // Si el token expiró, intentar renovar
          if (error.status === 401 && this.getRefreshToken()) {
            return this.refreshToken();
          }
          this.clearSession();
          return throwError(() => error);
        })
      );
  }

  // Renovar token
  refreshToken(): Observable<AuthResponse> {
    if (this.isRefreshing) {
      // Si ya está renovando, esperar
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        switchMap(() => this.validateSession())
      );
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.clearSession();
      return throwError(() => new Error('No hay refresh token'));
    }

    this.isRefreshing = true;
    this.refreshTokenSubject.next(null);

    return this.http.post<AuthResponse>(`${this.apiUrl}/refresh`, { refresh_token: refreshToken })
      .pipe(
        tap(response => {
          if (response.success && response.access_token) {
            this.handleAuthSuccess(response);
            this.refreshTokenSubject.next(response.access_token);
            this.isRefreshing = false;
          }
        }),
        catchError(error => {
          this.isRefreshing = false;
          this.clearSession();
          return throwError(() => error);
        })
      );
  }

  // Manejar respuesta exitosa de autenticación
  private handleAuthSuccess(response: AuthResponse): void {
    if (response.access_token) {
      this.storage.setItem('access_token', response.access_token);
    }
    if (response.refresh_token) {
      this.storage.setItem('refresh_token', response.refresh_token);
    }
    if (response.user) {
      this.storage.setItem('user', response.user);
      this.currentUserSubject.next(response.user);
    }
    if (response.expires_in) {
      this.storage.setMemory('token_expires_at', Date.now() + (response.expires_in * 1000));
      this.scheduleTokenRefresh();
    }
  }

  // Programar renovación automática
  private scheduleTokenRefresh(): void {
    this.cancelTokenRefresh();
    
    const expiresAt = this.storage.getMemory('token_expires_at');
    if (!expiresAt) return;
    
    // Renovar 5 minutos antes de que expire
    const refreshTime = expiresAt - Date.now() - (5 * 60 * 1000);
    
    if (refreshTime > 0) {
      this.refreshTokenTimeout = setTimeout(() => {
        this.refreshToken().subscribe({
          error: () => {
            this.notificationService.warning('Su sesión está por expirar');
          }
        });
      }, refreshTime);
    }
  }

  // Cancelar renovación automática
  private cancelTokenRefresh(): void {
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
      this.refreshTokenTimeout = null;
    }
  }

  getAccessToken(): string | null {
    return this.storage.getItem('access_token');
  }

  getRefreshToken(): string | null {
    return this.storage.getItem('refresh_token');
  }

  isLoggedIn(): boolean {
    return !!this.getAccessToken();
  }

  // Métodos de roles y permisos (sin cambios)
  hasRole(role: string): boolean {
    const user = this.currentUserValue;
    if (!user || !user.roles) return false;
    return user.roles.includes(role);
  }

  hasAnyRole(roles: string[]): boolean {
    const user = this.currentUserValue;
    if (!user || !user.roles) return false;
    return roles.some(role => user.roles!.includes(role));
  }

  hasAllRoles(roles: string[]): boolean {
    const user = this.currentUserValue;
    if (!user || !user.roles) return false;
    return roles.every(role => user.roles!.includes(role));
  }

  hasPermission(permission: string): boolean {
    const user = this.currentUserValue;
    if (!user || !user.permisos) return false;
    return user.permisos.includes(permission);
  }

  hasAnyPermission(permissions: string[]): boolean {
    const user = this.currentUserValue;
    if (!user || !user.permisos) return false;
    return permissions.some(permission => user.permisos!.includes(permission));
  }

  getUserRoles(): string[] {
    const user = this.currentUserValue;
    return user?.roles || [];
  }

  getUserPermissions(): string[] {
    const user = this.currentUserValue;
    return user?.permisos || [];
  }

  private clearSession(): void {
    this.cancelTokenRefresh();
    this.storage.clear();
    this.storage.clearMemory();
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  private handleError(error: any) {
    console.error('Error en AuthService:', error);
    return throwError(() => error);
  }

  // Método para compatibilidad (deprecado, usar getAccessToken)
  getToken(): string | null {
    return this.getAccessToken();
  }
}
