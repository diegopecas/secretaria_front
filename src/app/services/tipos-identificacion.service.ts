import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface TipoIdentificacion {
  id: number;
  codigo: string;
  nombre: string;
  aplica_personas: boolean;
  aplica_empresas: boolean;
  activo: boolean;
  orden: number;
}

@Injectable({
  providedIn: 'root'
})
export class TiposIdentificacionService {
  private apiUrl = environment.api + 'tipos-identificacion';

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

  obtenerTodos(): Observable<TipoIdentificacion[]> {
    return this.http.get<TipoIdentificacion[]>(this.apiUrl, this.getHttpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  obtenerPorAplicacion(tipo: 'personas' | 'empresas'): Observable<TipoIdentificacion[]> {
    return this.http.get<TipoIdentificacion[]>(
      `${this.apiUrl}/aplicacion?tipo=${tipo}`, 
      this.getHttpOptions()
    ).pipe(
      catchError(this.handleError)
    );
  }

  obtenerPorId(id: number): Observable<TipoIdentificacion> {
    return this.http.get<TipoIdentificacion>(`${this.apiUrl}/${id}`, this.getHttpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  private handleError(error: any): Observable<never> {
    console.error('Error en TiposIdentificacionService:', error);
    let errorMessage = 'Ocurrió un error al procesar la solicitud';
    
    if (error.error?.error) {
      errorMessage = error.error.error;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}