// services/chat.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface MensajeChat {
  rol: 'user' | 'assistant' | 'system';
  contenido: string;
  fecha_mensaje?: string;
  tokens_usados?: number;
}

export interface SesionChat {
  id: string;
  titulo: string;
  resumen?: string;
  mensajes_count: number;
  fecha_inicio: string;
  fecha_ultimo_mensaje: string;
  contrato_id?: number;
  numero_contrato?: string;
  entidad?: string;
}

export interface RespuestaChat {
  success: boolean;
  sesion_id: string;
  respuesta: string;
  fuentes?: any[];
  tokens_usados?: number;
  puede_continuar?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = environment.api + 'chat';

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
   * Iniciar o continuar conversación
   */
  conversar(params: {
    contrato_id: number;
    pregunta: string;
    continuar_sesion?: boolean;
    sesion_id?: string;
  }): Observable<RespuestaChat> {
    return this.http.post<RespuestaChat>(
      `${this.apiUrl}/conversar`,
      params,
      this.getHttpOptions()
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener historial de una conversación
   */
  obtenerHistorial(sesion_id: string): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/historial?sesion_id=${sesion_id}`,
      this.getHttpOptions()
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Listar sesiones de chat
   */
  listarSesiones(contrato_id?: number): Observable<any> {
    const params = contrato_id ? `?contrato_id=${contrato_id}` : '';
    return this.http.get<any>(
      `${this.apiUrl}/sesiones${params}`,
      this.getHttpOptions()
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Generar resumen de contrato
   */
  generarResumenContrato(contrato_id: number): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/generar-resumen`,
      { contrato_id },
      this.getHttpOptions()
    ).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: any): Observable<never> {
    console.error('Error en ChatService:', error);
    let errorMessage = 'Ocurrió un error al procesar la solicitud';
    
    if (error.error?.error) {
      errorMessage = error.error.error;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}