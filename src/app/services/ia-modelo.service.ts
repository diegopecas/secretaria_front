import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface IAModelo {
  id: number;
  proveedor: string;
  modelo: string;
  tipo_modelo_id: number;
  dimensiones?: number;
  costo_por_1k_tokens?: number;
  limite_tokens?: number;
  limite_requests_hora?: number;
  activo: boolean;
  es_predeterminado: boolean;
  configuracion?: any;
  fecha_registro?: string;
  // Campos adicionales de la consulta
  tipo_nombre?: string;
  tipo_codigo?: string;
  requiere_dimensiones?: boolean;
}

export interface ResumenUsoModelo {
  proveedor: string;
  modelo: string;
  tipo_modelo: string;
  total_usos: number;
  tokens_totales: number;
  costo_total_usd: number;
  tiempo_promedio_ms: number;
  usos_exitosos: number;
  usos_fallidos: number;
  ultimo_uso: string;
}

export interface TranscripcionResultado {
  success: boolean;
  texto?: string;
  proveedor?: string;
  modelo?: string;
  confianza?: number;
  duracion_segundos?: number;
  message?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class IAModelosService {
  private apiUrl = environment.api + 'ia-modelos';

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
   * Obtener modelos por tipo
   * @param tipo - transcripcion, embedding, analisis, generacion
   */
  obtenerPorTipo(tipo: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${tipo}`, this.getHttpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Transcribir audio usando un modelo específico
   */
  transcribir(formData: FormData): Observable<TranscripcionResultado> {
    return this.http.post<TranscripcionResultado>(
      `${this.apiUrl}/transcribir`, 
      formData, 
      this.getHttpOptionsWithFiles()
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener resumen de uso de modelos IA (solo admin)
   */
  obtenerResumenUso(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/uso/resumen`, this.getHttpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Establecer modelo como predeterminado (solo admin)
   */
  establecerPredeterminado(id: number): Observable<any> {
    return this.http.put<any>(
      `${this.apiUrl}/${id}/predeterminado`, 
      {}, 
      this.getHttpOptions()
    ).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: any): Observable<never> {
    console.error('Error en IAModelosService:', error);
    let errorMessage = 'Ocurrió un error al procesar la solicitud';
    
    if (error.error?.error) {
      errorMessage = error.error.error;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}