import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Actividad {
  id?: number;
  contrato_id: number;
  fecha_actividad: string;
  descripcion_actividad: string;
  audio_narrado_url?: string;
  transcripcion_texto?: string;
  transcripcion_proveedor?: string;
  transcripcion_modelo?: string;
  transcripcion_confianza?: number;
  metadata?: any;
  procesado_ia?: boolean;
  fecha_registro?: string;
  fecha_actualizacion?: string;
  // Relaciones
  obligaciones?: Obligacion[];
  archivos?: ArchivoAdjunto[];
  // Campos adicionales para mostrar
  obligaciones_info?: string;
  total_archivos?: number;
  numero_contrato?: string;
  entidad_nombre?: string;
}

export interface Obligacion {
  id?: number;
  numero_obligacion: number;
  descripcion: string;
}

export interface ArchivoAdjunto {
  id: number;
  nombre_archivo: string;
  tipo_archivo_id: number;
  tipo_archivo_nombre?: string;
  tamanio_bytes: number;
  archivo_url: string;
  procesado?: boolean;
  fecha_carga?: string;
}

export interface ResumenActividades {
  anio: number;
  mes: number;
  total_actividades: number;
  obligaciones_cubiertas: number;
  dias_trabajados: number;
  archivos_adjuntos: number;
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
        // No incluir Content-Type para que el navegador lo setee con boundary
      })
    };
  }

  crear(actividad: Actividad, obligaciones_ids: number[], archivos?: File[]): Observable<any> {
    const formData = new FormData();
    
    // Datos básicos de la actividad
    formData.append('contrato_id', actividad.contrato_id.toString());
    formData.append('fecha_actividad', actividad.fecha_actividad);
    formData.append('descripcion_actividad', actividad.descripcion_actividad);
    
    // Obligaciones (como JSON array)
    if (obligaciones_ids && obligaciones_ids.length > 0) {
      formData.append('obligaciones_ids', JSON.stringify(obligaciones_ids));
    }
    
    // Transcripción si existe
    if (actividad.transcripcion_texto) {
      formData.append('transcripcion_texto', actividad.transcripcion_texto);
    }
    
    if (actividad.transcripcion_proveedor) {
      formData.append('transcripcion_proveedor', actividad.transcripcion_proveedor);
    }
    
    if (actividad.transcripcion_modelo) {
      formData.append('transcripcion_modelo', actividad.transcripcion_modelo);
    }
    
    if (actividad.transcripcion_confianza !== undefined) {
      formData.append('transcripcion_confianza', actividad.transcripcion_confianza.toString());
    }
    
    // Metadata si existe
    if (actividad.metadata) {
      formData.append('metadata', JSON.stringify(actividad.metadata));
    }
    
    // Archivos adjuntos
    if (archivos && archivos.length > 0) {
      archivos.forEach((archivo, index) => {
        formData.append(`archivo_${index}`, archivo, archivo.name);
      });
    }
    
    return this.http.post<any>(this.apiUrl, formData, this.getHttpOptionsWithFiles())
      .pipe(
        catchError(this.handleError)
      );
  }

  obtenerPorPeriodo(contrato_id: number, mes: number, anio: number): Observable<Actividad[]> {
    const params = `?contrato_id=${contrato_id}&mes=${mes}&anio=${anio}`;
    return this.http.get<any>(`${this.apiUrl}/periodo${params}`, this.getHttpOptions())
      .pipe(
        map(response => response.actividades || []),
        catchError(this.handleError)
      );
  }

  obtenerPorId(id: number): Observable<Actividad> {
    return this.http.get<any>(`${this.apiUrl}/detalle?id=${id}`, this.getHttpOptions())
      .pipe(
        map(response => response.actividad),
        catchError(this.handleError)
      );
  }

  buscar(contrato_id: number, pregunta: string): Observable<any> {
    const body = { contrato_id, pregunta };
    return this.http.post<any>(`${this.apiUrl}/buscar`, body, {
      ...this.getHttpOptions(),
      headers: this.getHttpOptions().headers.append('Content-Type', 'application/json')
    }).pipe(
      catchError(this.handleError)
    );
  }

  actualizar(actividad: Actividad, obligaciones_ids: number[], archivos?: File[]): Observable<any> {
    const formData = new FormData();
    
    // ID obligatorio para actualizar
    formData.append('id', actividad.id!.toString());
    
    // Datos que pueden actualizarse
    if (actividad.descripcion_actividad !== undefined) {
      formData.append('descripcion_actividad', actividad.descripcion_actividad);
    }
    
    if (actividad.fecha_actividad !== undefined) {
      formData.append('fecha_actividad', actividad.fecha_actividad);
    }
    
    // Obligaciones actualizadas
    if (obligaciones_ids !== undefined) {
      formData.append('obligaciones_ids', JSON.stringify(obligaciones_ids));
    }
    
    // Metadata si existe
    if (actividad.metadata) {
      formData.append('metadata', JSON.stringify(actividad.metadata));
    }
    
    // Nuevos archivos adjuntos
    if (archivos && archivos.length > 0) {
      archivos.forEach((archivo, index) => {
        formData.append(`archivo_${index}`, archivo, archivo.name);
      });
    }
    
    return this.http.post<any>(`${this.apiUrl}/actualizar`, formData, this.getHttpOptionsWithFiles())
      .pipe(
        catchError(this.handleError)
      );
  }

  eliminar(id: number): Observable<any> {
    const body = { id };
    return this.http.request<any>('DELETE', this.apiUrl, {
      ...this.getHttpOptions(),
      headers: this.getHttpOptions().headers.append('Content-Type', 'application/json'),
      body
    }).pipe(
      catchError(this.handleError)
    );
  }

  eliminarArchivo(archivo_id: number): Observable<any> {
    const body = { archivo_id };
    return this.http.request<any>('DELETE', `${this.apiUrl}/archivo`, {
      ...this.getHttpOptions(),
      headers: this.getHttpOptions().headers.append('Content-Type', 'application/json'),
      body
    }).pipe(
      catchError(this.handleError)
    );
  }

  obtenerResumen(contrato_id: number): Observable<ResumenActividades[]> {
    return this.http.get<any>(`${this.apiUrl}/resumen?contrato_id=${contrato_id}`, this.getHttpOptions())
      .pipe(
        map(response => response.resumen || []),
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