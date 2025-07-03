import {
  HttpClient,
  HttpErrorResponse,
  HttpResponse,
  HttpHeaders
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface Usuario {
  id?: number;
  nombre: string;
  email: string;
  password?: string;
  roles?: string[];
  activo?: boolean;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
  ultimo_acceso?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UsuariosService {
  private servicio = environment.api + 'usuarios';

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
      }),
      observe: 'response' as 'response'
    };
  }

  obtenerTodos(): Observable<HttpResponse<Usuario[]>> {
    return this.http
      .get<Usuario[]>(this.servicio, this.getHttpOptions())
      .pipe(
        tap((response: HttpResponse<Usuario[]>) => {
          let respuesta: any = response.body;
          if (respuesta && respuesta.error) {
            throw respuesta.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  obtenerPorId(id: number): Observable<HttpResponse<Usuario>> {
    return this.http
      .get<Usuario>(`${this.servicio}/${id}`, this.getHttpOptions())
      .pipe(
        tap((response: HttpResponse<Usuario>) => {
          let respuesta: any = response.body;
          if (respuesta && respuesta.error) {
            throw respuesta.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  crear(usuario: Usuario): Observable<any> {
    const body = JSON.stringify(usuario);
    return this.http.post<any>(this.servicio, body, this.getHttpOptions()).pipe(
      tap((response: HttpResponse<any>) => {
        let respuesta: any = response.body;
        if (respuesta && respuesta.error) {
          console.log('Error en crear:', respuesta);
          throw respuesta.error;
        }
        console.log('Usuario creado:', respuesta);
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  actualizar(usuario: Usuario): Observable<any> {
    const body = JSON.stringify(usuario);
    console.log("Actualizar usuario:", body);
    return this.http.put<any>(this.servicio, body, this.getHttpOptions()).pipe(
      tap((response: HttpResponse<any>) => {
        let respuesta: any = response.body;
        if (respuesta && respuesta.error) {
          console.log('Error en actualizar:', respuesta);
          throw respuesta.error;
        }
        console.log('Usuario actualizado:', respuesta);
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  eliminar(id: number): Observable<any> {
    const body = JSON.stringify({ id });
    const options = {
      headers: this.getHttpOptions().headers,
      body: body
    };
    
    return this.http.request<any>('DELETE', this.servicio, options).pipe(
      tap((respuesta: any) => {
        if (respuesta && respuesta.error) {
          console.log('Error en eliminar:', respuesta);
          throw respuesta.error;
        }
        console.log('Usuario eliminado:', respuesta);
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  cambiarEstado(id: number, activo: boolean): Observable<any> {
    const body = JSON.stringify({ id, activo });
    return this.http.patch<any>(`${this.servicio}/estado`, body, this.getHttpOptions()).pipe(
      tap((response: HttpResponse<any>) => {
        let respuesta: any = response.body;
        if (respuesta && respuesta.error) {
          console.log('Error en cambiar estado:', respuesta);
          throw respuesta.error;
        }
        console.log('Estado cambiado:', respuesta);
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  asignarRoles(id: number, roles: string[]): Observable<any> {
    const body = JSON.stringify({ id, roles });
    return this.http.post<any>(`${this.servicio}/roles`, body, this.getHttpOptions()).pipe(
      tap((response: HttpResponse<any>) => {
        let respuesta: any = response.body;
        if (respuesta && respuesta.error) {
          console.log('Error en asignar roles:', respuesta);
          throw respuesta.error;
        }
        console.log('Roles asignados:', respuesta);
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('Error en UsuariosService:', error);
    let errorMessage = 'Ocurrió un error; por favor intente más tarde.';
    
    if (error.error instanceof ErrorEvent) {
      // Error del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del servidor
      errorMessage = `Error ${error.status}: ${error.message}`;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}