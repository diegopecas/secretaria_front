import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';


export interface Actividad {
  id?: number;
  contrato_id: number;
  fecha_actividad: string;
  descripcion_actividad: string;
  
  // Campos de transcripción
  transcripcion_texto?: string;
  transcripcion_proveedor?: string;
  transcripcion_modelo?: string;
  transcripcion_confianza?: number;
  
  // Campos de IA
  procesado_ia?: boolean;
  
  // Timestamps
  fecha_registro?: string;
  usuario_registro_id?: number;
  
  // Relaciones
  obligaciones?: Obligacion[];
  archivos?: ArchivoAdjunto[];
  proyectos?: Proyecto[];
  
  // Campos para mostrar
  numero_contrato?: string;
  entidad_nombre?: string;
  entidad_nombre_corto?: string;
  contratista_nombre?: string;
}

export interface Obligacion {
  id?: number;
  numero_obligacion: number;
  descripcion: string;
}
export interface Proyecto {
  id?: number;
  numero_proyecto: number;
  titulo: string;
  descripcion: string;
}
export interface ArchivoAdjunto {
  id: number;
  nombre_archivo: string;
  archivo_url: string;
  tipo_archivo_nombre?: string;
  tamanio_bytes: number;
}

export interface FiltrosActividad {
  contrato_id?: number;
  mes?: number;
  anio?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ActividadesService {
  private apiUrl = environment.api + 'actividades';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHttpOptions() {
    const token = this.authService.getAccessToken();
    return {
      headers: new HttpHeaders({
        'Authorization': token ? `Bearer ${token}` : ''
      })
    };
  }

  private getHttpOptionsWithFiles() {
    const token = this.authService.getAccessToken();
    return {
      headers: new HttpHeaders({
        'Authorization': token ? `Bearer ${token}` : ''
      })
    };
  }

  /**
   * Obtener todas las actividades con filtros
   */
  obtenerTodas(filtros: FiltrosActividad): Observable<any> {
    const params = new URLSearchParams();
    if (filtros.contrato_id) params.append('contrato_id', filtros.contrato_id.toString());
    if (filtros.mes) params.append('mes', filtros.mes.toString());
    if (filtros.anio) params.append('anio', filtros.anio.toString());
    
    return this.http.get<any>(`${this.apiUrl}?${params.toString()}`, this.getHttpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Obtener actividad por ID
   */
  obtenerPorId(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/detalle?id=${id}`, this.getHttpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Crear nueva actividad
   */
  crear(formData: FormData): Observable<any> {
    return this.http.post<any>(this.apiUrl, formData, this.getHttpOptionsWithFiles())
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Actualizar actividad
   */
  actualizar(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/actualizar`, formData, this.getHttpOptionsWithFiles())
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Eliminar actividad
   */
  eliminar(id: number): Observable<any> {
    const options = {
      ...this.getHttpOptions(),
      body: { id }
    };
    return this.http.request<any>('DELETE', this.apiUrl, options)
      .pipe(
        catchError(this.handleError)
      );
  }

  private handleError(error: any): Observable<never> {
    console.error('Error en ActividadesService:', error);
    let errorMessage = 'Ocurrió un error al procesar la solicitud';
    
    if (error.error?.error) {
      errorMessage = error.error.error;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}