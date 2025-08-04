import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface ConfiguracionIA {
  id: number;
  proveedor: string;
  configuracion: any;
  activa: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface ModeloIA {
  id: number;
  proveedor: string;
  modelo: string;
  tipo_modelo_id: number;
  tipo_nombre: string;
  tipo_codigo: string;
  activo: boolean;
  es_predeterminado: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ContratosIAConfigService {
  private apiUrl = environment.api + 'contratos-ia-config';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHttpOptions() {
    const token = this.authService.getAccessToken();
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      })
    };
  }

  obtenerConfiguracion(contratoId: number): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/${contratoId}`,
      this.getHttpOptions()
    ).pipe(
      catchError(this.handleError)
    );
  }

  obtenerModelosAnalisis(): Observable<any> {
    return this.http.get<any>(
      `${environment.api}ia-modelos/analisis`,
      this.getHttpOptions()
    ).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: any): Observable<never> {
    console.error('Error en ContratosIAConfigService:', error);
    let errorMessage = 'Ocurrió un error al procesar la solicitud';
    
    if (error.error?.error) {
      errorMessage = error.error.error;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}