import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface ActividadObligacion {
  id: number;
  actividad_id: number;
  obligacion_id: number;
  fecha_asignacion: string;
  numero_obligacion?: number;
  descripcion?: string;
}

export interface EstadisticasObligaciones {
  obligacion_id: number;
  numero_obligacion: number;
  descripcion: string;
  total_actividades: number;
  dias_cumplidos: number;
}

@Injectable({
  providedIn: 'root'
})
export class ActividadesObligacionesService {
  private apiUrl = environment.api + 'actividades-obligaciones';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHttpOptions() {
    const token = this.authService.getAccessToken();
    return {
      headers: new HttpHeaders({
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      })
    };
  }

  asignar(actividadId: number, obligacionesIds: number[]): Observable<any> {
    const body = {
      actividad_id: actividadId,
      obligaciones_ids: obligacionesIds
    };
    return this.http.post<any>(this.apiUrl, body, this.getHttpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  obtenerPorActividad(actividadId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/actividad/${actividadId}`, this.getHttpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  obtenerActividadesPorObligacion(obligacionId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/obligacion/${obligacionId}`, this.getHttpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  eliminarAsignacion(actividadId: number, obligacionId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${actividadId}/${obligacionId}`, this.getHttpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  obtenerEstadisticasPorPeriodo(contratoId: number, mes: number, anio: number): Observable<any> {
    const params = `?contrato_id=${contratoId}&mes=${mes}&anio=${anio}`;
    return this.http.get<any>(`${this.apiUrl}/estadisticas/periodo${params}`, this.getHttpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  private handleError(error: any): Observable<never> {
    console.error('Error en ActividadesObligacionesService:', error);
    let errorMessage = 'Ocurrió un error al procesar la solicitud';
    
    if (error.error?.error) {
      errorMessage = error.error.error;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}