import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Supervisor {
  id?: number;
  contrato_id?: number;
  nombre: string;
  cargo?: string;
  tipo?: 'principal' | 'apoyo';
  activo?: boolean;
  fecha_asignacion?: string;
}

export interface Obligacion {
  id?: number;
  contrato_id?: number;
  numero_obligacion: number;
  descripcion: string;
  activo?: boolean;
}

export interface ValorMensual {
  id?: number;
  contrato_id?: number;
  mes: number;
  anio: number;
  valor: number;
  porcentaje_avance_fisico?: number;
  porcentaje_avance_financiero?: number;
}

export interface Contrato {
  id?: number;
  numero_contrato: string;
  contratista_id: number;
  contratista_nombre?: string;
  contratista_identificacion?: string;
  entidad_id: number;
  entidad_nombre?: string;
  fecha_suscripcion: string;
  fecha_inicio: string;
  fecha_terminacion: string;
  plazo_dias?: number;
  objeto_contrato: string;
  valor_total: number;
  dependencia?: string;
  unidad_operativa?: string;
  estado?: 'activo' | 'suspendido' | 'finalizado' | 'liquidado';
  dias_restantes?: number;
  total_obligaciones?: number;
  total_supervisores?: number;
  supervisores?: Supervisor[];
  obligaciones?: Obligacion[];
  valores_mensuales?: ValorMensual[];
}

@Injectable({
  providedIn: 'root'
})
export class ContratosService {
  private apiUrl = environment.api + 'contratos';

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

  obtenerTodos(): Observable<Contrato[]> {
    return this.http.get<Contrato[]>(this.apiUrl, this.getHttpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  obtenerPorId(id: number): Observable<Contrato> {
    return this.http.get<Contrato>(`${this.apiUrl}/${id}`, this.getHttpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  crear(contrato: Contrato): Observable<any> {
    return this.http.post<any>(this.apiUrl, contrato, this.getHttpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  actualizar(contrato: Contrato): Observable<any> {
    return this.http.put<any>(this.apiUrl, contrato, this.getHttpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  cambiarEstado(id: number, estado: string): Observable<any> {
    return this.http.patch<any>(
      `${this.apiUrl}/estado`, 
      { id, estado }, 
      this.getHttpOptions()
    ).pipe(
      catchError(this.handleError)
    );
  }

  gestionarSupervisores(contrato_id: number, supervisores: Supervisor[]): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/supervisores`,
      { contrato_id, supervisores },
      this.getHttpOptions()
    ).pipe(
      catchError(this.handleError)
    );
  }

  gestionarObligaciones(contrato_id: number, obligaciones: Obligacion[]): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/obligaciones`,
      { contrato_id, obligaciones },
      this.getHttpOptions()
    ).pipe(
      catchError(this.handleError)
    );
  }

  gestionarValoresMensuales(contrato_id: number, valores_mensuales: ValorMensual[]): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/valores-mensuales`,
      { contrato_id, valores_mensuales },
      this.getHttpOptions()
    ).pipe(
      catchError(this.handleError)
    );
  }

  buscar(params: {
    q?: string;
    estado?: string;
    contratista_id?: number;
    entidad_id?: number;
  }): Observable<Contrato[]> {
    let url = `${this.apiUrl}/buscar?`;
    const queryParams: string[] = [];
    
    if (params.q) queryParams.push(`q=${encodeURIComponent(params.q)}`);
    if (params.estado) queryParams.push(`estado=${params.estado}`);
    if (params.contratista_id) queryParams.push(`contratista_id=${params.contratista_id}`);
    if (params.entidad_id) queryParams.push(`entidad_id=${params.entidad_id}`);
    
    url += queryParams.join('&');
    
    return this.http.get<Contrato[]>(url, this.getHttpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  private handleError(error: any): Observable<never> {
    console.error('Error en ContratosService:', error);
    let errorMessage = 'Ocurrió un error al procesar la solicitud';
    
    if (error.error?.error) {
      errorMessage = error.error.error;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}