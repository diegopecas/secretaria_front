import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { Contratista } from './contratistas.service';

export interface UsuarioContratista {
  usuario_id: number;
  contratista_id: number;
  es_principal: boolean;
  fecha_asignacion?: string;
  // Datos adicionales del contratista
  contratista?: Contratista;
}

@Injectable({
  providedIn: 'root'
})
export class UsuariosContratistasService {
  private apiUrl = environment.api + 'usuarios-contratistas';

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

  /**
   * Asignar contratista a usuario
   */
  asignar(usuario_id: number, contratista_id: number, es_principal: boolean = true): Observable<any> {
    const body = { usuario_id, contratista_id, es_principal };
    return this.http.post<any>(this.apiUrl, body, this.getHttpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Obtener contratistas por usuario
   */
  obtenerPorUsuario(usuario_id: number): Observable<Contratista[]> {
    return this.http.get<any>(`${this.apiUrl}?usuario_id=${usuario_id}`, this.getHttpOptions())
      .pipe(
        map(response => response.contratistas || []),
        catchError(this.handleError)
      );
  }

  /**
   * Obtener mis contratistas (usuario actual)
   */
  obtenerMisContratistas(): Observable<Contratista[]> {
    return this.http.get<any>(`${this.apiUrl}/mis-contratistas`, this.getHttpOptions())
      .pipe(
        map(response => response.contratistas || []),
        catchError(this.handleError)
      );
  }

  /**
   * Actualizar asociación (cambiar principal)
   */
  actualizar(usuario_id: number, contratista_id: number, es_principal: boolean): Observable<any> {
    const body = { usuario_id, contratista_id, es_principal };
    return this.http.put<any>(this.apiUrl, body, this.getHttpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Eliminar asociación
   */
  eliminar(usuario_id: number, contratista_id: number): Observable<any> {
    const options = {
      ...this.getHttpOptions(),
      body: { usuario_id, contratista_id }
    };
    return this.http.delete<any>(this.apiUrl, options)
      .pipe(
        catchError(this.handleError)
      );
  }

  private handleError(error: any): Observable<never> {
    console.error('Error en UsuariosContratistasService:', error);
    let errorMessage = 'Ocurrió un error al procesar la solicitud';
    
    if (error.error?.error) {
      errorMessage = error.error.error;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}