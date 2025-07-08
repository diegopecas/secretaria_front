import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Contratista {
  id?: number;
  tipo_identificacion_id: number;
  tipo_identificacion_codigo?: string;
  tipo_identificacion_nombre?: string;
  identificacion: string;
  nombre_completo: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  activo?: boolean;
  total_contratos?: number;
  contratos_activos?: number;
  contratos?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class ContratistasService {
  private apiUrl = environment.api + 'contratistas'; // Sin la barra al final

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    console.log('URL del servicio de contratistas:', this.apiUrl);
  }

  private getHttpOptions() {
    const token = this.authService.getAccessToken();
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      })
    };
  }

  obtenerTodos(): Observable<Contratista[]> {
    console.log('Llamando a:', this.apiUrl);
    console.log('Headers:', this.getHttpOptions());
    
    return this.http.get<any>(this.apiUrl, this.getHttpOptions())
      .pipe(
        tap(response => {
          console.log('Respuesta cruda del servidor:', response);
        }),
        map((response: any) => {
          // Si la respuesta es directamente un array
          if (Array.isArray(response)) {
            return response;
          }
          // Si viene envuelta en algún objeto
          console.warn('La respuesta no es un array directo:', response);
          return [];
        }),
        catchError(this.handleError)
      );
  }

  obtenerPorId(id: number): Observable<Contratista> {
    return this.http.get<Contratista>(`${this.apiUrl}/${id}`, this.getHttpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  crear(contratista: Contratista): Observable<any> {
    return this.http.post<any>(this.apiUrl, contratista, this.getHttpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  actualizar(contratista: Contratista): Observable<any> {
    return this.http.put<any>(this.apiUrl, contratista, this.getHttpOptions())
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

  buscar(query: string, activo?: boolean): Observable<Contratista[]> {
    let url = `${this.apiUrl}/buscar?q=${encodeURIComponent(query)}`;
    if (activo !== undefined) {
      url += `&activo=${activo}`;
    }
    
    return this.http.get<Contratista[]>(url, this.getHttpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  private handleError(error: any): Observable<never> {
    console.error('Error en ContratistasService:', error);
    console.error('Status:', error.status);
    console.error('Status Text:', error.statusText);
    console.error('URL:', error.url);
    console.error('Message:', error.message);
    console.error('Error completo:', error);
    
    let errorMessage = 'Ocurrió un error al procesar la solicitud';
    
    if (error.status === 0) {
      errorMessage = 'No se pudo conectar con el servidor. Verifique que el backend esté ejecutándose.';
    } else if (error.status === 401) {
      errorMessage = 'No autorizado. Por favor inicie sesión nuevamente.';
    } else if (error.status === 403) {
      errorMessage = 'No tiene permisos para realizar esta acción.';
    } else if (error.status === 404) {
      errorMessage = 'Recurso no encontrado. Verifique la URL del servicio.';
    } else if (error.error?.error) {
      errorMessage = error.error.error;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}