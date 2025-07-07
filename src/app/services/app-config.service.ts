import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface AppConfig {
  name: string;
  shortName: string;
  icon: string;
  description: string;
  footer: string;
  // Puedes agregar más configuraciones aquí
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {
  private configSubject = new BehaviorSubject<AppConfig>(environment.app);
  public config$ = this.configSubject.asObservable();
  
  constructor(private http: HttpClient) {
    // Inicializar con valores por defecto del environment
    this.loadConfig();
  }
  
  get config(): AppConfig {
    return this.configSubject.value;
  }
  
  get appName(): string {
    return this.config.name;
  }
  
  get appShortName(): string {
    return this.config.shortName;
  }
  
  get appIcon(): string {
    return this.config.icon;
  }
  
  get appDescription(): string {
    return this.config.description;
  }
  
  get appFooter(): string {
    return this.config.footer;
  }
  
  // Método para cargar configuración desde el backend (opcional)
  loadConfigFromBackend(): Observable<AppConfig> {
    return this.http.get<AppConfig>(`${environment.api}config/app`).pipe(
      tap(config => {
        // Combinar con valores por defecto
        const mergedConfig = { ...environment.app, ...config };
        this.configSubject.next(mergedConfig);
      }),
      catchError(error => {
        console.error('Error cargando configuración del backend:', error);
        // Usar valores por defecto si falla
        return of(environment.app);
      })
    );
  }
  
  // Método para actualizar configuración en runtime
  updateConfig(config: Partial<AppConfig>): void {
    const currentConfig = this.configSubject.value;
    const newConfig = { ...currentConfig, ...config };
    this.configSubject.next(newConfig);
  
  }
  
  // Guardar configuración en el backend (opcional)
  private saveConfigToBackend(config: AppConfig): Observable<any> {
    return this.http.post(`${environment.api}config/app`, config).pipe(
      catchError(error => {
        console.error('Error guardando configuración:', error);
        return of(null);
      })
    );
  }
  
  // Cargar configuración inicial
  private loadConfig(): void {
    // Intentar cargar desde localStorage primero
    const savedConfig = localStorage.getItem('app_config');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        this.configSubject.next({ ...environment.app, ...config });
      } catch (e) {
        console.error('Error parseando configuración guardada:', e);
      }
    }
    
    // Opcionalmente, cargar desde el backend
    // this.loadConfigFromBackend().subscribe();
  }
  
  // Guardar en localStorage
  saveToLocalStorage(): void {
    localStorage.setItem('app_config', JSON.stringify(this.config));
  }
}