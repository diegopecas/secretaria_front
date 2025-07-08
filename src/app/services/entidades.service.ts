import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Entidad {
  id?: number;
  nombre: string;
  tipo_identificacion_id: number;
  tipo_identificacion_codigo?: string;
  tipo_identificacion_nombre?: string;
  identificacion: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  descripcion?: string;
  activo?: boolean;
  total_contratos?: number;
  contratos_activos?: number;
  contratos?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class EntidadesService {
  private apiUrl = environment.api + 'entidades';

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

  obtenerTodos(): Observable<Entidad[]> {
    return this.http.get<Entidad[]>(this.apiUrl, this.getHttpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  obtenerPorId(id: number): Observable<Entidad> {
    return this.http.get<Entidad>(`${this.apiUrl}/${id}`, this.getHttpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  crear(entidad: Entidad): Observable<any> {
    return this.http.post<any>(this.apiUrl, entidad, this.getHttpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  actualizar(entidad: Entidad): Observable<any> {
    return this.http.put<any>(this.apiUrl, entidad, this.getHttpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

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

  buscar(query: string, activo?: boolean): Observable<Entidad[]> {
    let url = `${this.apiUrl}/buscar?q=${encodeURIComponent(query)}`;
    if (activo !== undefined) {
      url += `&activo=${activo}`;
    }
    
    return this.http.get<Entidad[]>(url, this.getHttpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  private handleError(error: any): Observable<never> {
    console.error('Error en EntidadesService:', error);
    let errorMessage = 'Ocurrió un error al procesar la solicitud';
    
    if (error.error?.error) {
      errorMessage = error.error.error;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}