import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface ActividadArchivo {
  id: number;
  actividad_id: number;
  nombre_archivo: string;
  archivo_url: string;
  tipo_archivo_id: number;
  tipo_archivo_nombre?: string;
  tipo_archivo_codigo?: string;
  mime_type?: string;
  tamanio_bytes: number;
  hash_archivo?: string;
  texto_extraido?: string;
  procesado?: boolean;
  fecha_procesamiento?: string;
  fecha_carga: string;
  usuario_carga_id?: number;
  usuario_carga_nombre?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ActividadesArchivosService {
  private apiUrl = environment.api + 'actividades-archivos';

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

  obtenerPorActividad(actividadId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/actividad/${actividadId}`, this.getHttpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  obtenerPorId(archivoId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${archivoId}`, this.getHttpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  eliminar(archivoId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${archivoId}`, this.getHttpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  descargar(archivoId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/descargar/${archivoId}`, {
      ...this.getHttpOptions(),
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }

  buscarPorContenido(contratoId: number, busqueda: string): Observable<any> {
    const params = `?contrato_id=${contratoId}&busqueda=${encodeURIComponent(busqueda)}`;
    return this.http.get<any>(`${this.apiUrl}/buscar${params}`, this.getHttpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  obtenerEstadisticas(contratoId?: number): Observable<any> {
    const params = contratoId ? `?contrato_id=${contratoId}` : '';
    return this.http.get<any>(`${this.apiUrl}/estadisticas${params}`, this.getHttpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  private handleError(error: any): Observable<never> {
    console.error('Error en ActividadesArchivosService:', error);
    let errorMessage = 'Ocurrió un error al procesar la solicitud';
    
    if (error.error?.error) {
      errorMessage = error.error.error;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}