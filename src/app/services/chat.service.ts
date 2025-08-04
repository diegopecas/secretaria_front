import { NgZone } from '@angular/core';
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
export interface SSEEvent {
  event: string;
  data: any;
}
@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = environment.api + 'chat';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private ngZone: NgZone
  ) { }

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

  /**
   * Iniciar conversación con streaming
   */
  conversarStreaming(params: {
    contrato_id: number;
    pregunta: string;
    continuar_sesion?: boolean;
    sesion_id?: string;
    proveedor?: string;
  },
    onMessage: (event: SSEEvent) => void,
    onError?: (error: any) => void,
    onComplete?: () => void): EventSource {

    const token = this.authService.getAccessToken();
    const baseUrl = environment.api.replace(/\/$/, '');

    // Codificar parámetros en la URL
    const queryParams = new URLSearchParams({
      contrato_id: params.contrato_id.toString(),
      pregunta: params.pregunta,
      continuar_sesion: params.continuar_sesion ? 'true' : 'false',
      sesion_id: params.sesion_id || '',
      proveedor: params.proveedor || ''
    });

    const url = `${baseUrl}/chat/conversar-stream?${queryParams.toString()}`;

    // Crear EventSource con token en URL
    const eventSource = new EventSource(`${url}&token=${encodeURIComponent(token || '')}`);

    // Manejar evento de sesión
    eventSource.addEventListener('session', (event: any) => {
      try {
        const data = JSON.parse(event.data);
        this.ngZone.run(() => {
          onMessage({ event: 'session', data });
        });
      } catch (e) {
        console.error('Error parseando sesión:', e);
      }
    });

    // Manejar evento de estado
    eventSource.addEventListener('status', (event: any) => {
      try {
        const data = JSON.parse(event.data);
        this.ngZone.run(() => {
          onMessage({ event: 'status', data });
        });
      } catch (e) {
        console.error('Error parseando status:', e);
      }
    });

    // Manejar evento de fuentes
    eventSource.addEventListener('sources', (event: any) => {
      try {
        const data = JSON.parse(event.data);
        this.ngZone.run(() => {
          onMessage({ event: 'sources', data });
        });
      } catch (e) {
        console.error('Error parseando sources:', e);
      }
    });

    // Manejar evento de mensaje
    eventSource.addEventListener('message', (event: any) => {
      try {
        const data = JSON.parse(event.data);
        this.ngZone.run(() => {
          onMessage({ event: 'message', data });
        });
      } catch (e) {
        console.error('Error parseando message:', e);
      }
    });

    // Manejar evento de error
    eventSource.addEventListener('error', (event: any) => {
      if (event.data) {
        try {
          const data = JSON.parse(event.data);
          this.ngZone.run(() => {
            onMessage({ event: 'error', data });
          });
        } catch (e) {
          console.error('Error parseando error:', e);
        }
      }
    });

    // Manejar evento de finalización
    eventSource.addEventListener('done', (event: any) => {
      try {
        const data = JSON.parse(event.data);
        this.ngZone.run(() => {
          onMessage({ event: 'done', data });
          if (onComplete) onComplete();
        });
        eventSource.close();
      } catch (e) {
        console.error('Error parseando done:', e);
      }
    });

    // Manejar errores de conexión
    eventSource.onerror = (error) => {
      console.error('Error SSE:', error);
      this.ngZone.run(() => {
        if (onError) onError(error);
      });
      eventSource.close();
    };

    return eventSource;
  }
}