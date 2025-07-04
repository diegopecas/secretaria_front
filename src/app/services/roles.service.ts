import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Rol {
  id: number;
  nombre: string;
  descripcion: string;
  activo?: boolean;
}

export interface Permiso {
  id: number;
  nombre: string;
  modulo: string;
  descripcion: string;
  activo?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class RolesService {
  private apiUrl = environment.api + 'roles';

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

  obtenerTodos(): Observable<HttpResponse<Rol[]>> {
    return this.http.get<Rol[]>(this.apiUrl, this.getHttpOptions())
      .pipe(
        tap((response: HttpResponse<Rol[]>) => {
          let respuesta: any = response.body;
          if (respuesta && respuesta.error) {
            throw respuesta.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  obtenerPorId(id: number): Observable<HttpResponse<Rol>> {
    return this.http.get<Rol>(`${this.apiUrl}/${id}`, this.getHttpOptions())
      .pipe(
        tap((response: HttpResponse<Rol>) => {
          let respuesta: any = response.body;
          if (respuesta && respuesta.error) {
            throw respuesta.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  crear(rol: Rol): Observable<any> {
    const body = JSON.stringify(rol);
    return this.http.post<any>(this.apiUrl, body, this.getHttpOptions()).pipe(
      tap((response: HttpResponse<any>) => {
        let respuesta: any = response.body;
        if (respuesta && respuesta.error) {
          console.log('Error en crear:', respuesta);
          throw respuesta.error;
        }
        console.log('Rol creado:', respuesta);
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  actualizar(rol: Rol): Observable<any> {
    const body = JSON.stringify(rol);
    return this.http.put<any>(this.apiUrl, body, this.getHttpOptions()).pipe(
      tap((response: HttpResponse<any>) => {
        let respuesta: any = response.body;
        if (respuesta && respuesta.error) {
          console.log('Error en actualizar:', respuesta);
          throw respuesta.error;
        }
        console.log('Rol actualizado:', respuesta);
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
    
    return this.http.request<any>('DELETE', this.apiUrl, options).pipe(
      tap((respuesta: any) => {
        if (respuesta && respuesta.error) {
          console.log('Error en eliminar:', respuesta);
          throw respuesta.error;
        }
        console.log('Rol eliminado:', respuesta);
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  obtenerPermisos(rolId: number): Observable<Permiso[]> {
    return this.http.get<Permiso[]>(`${this.apiUrl}/${rolId}/permisos`, this.getHttpOptions())
      .pipe(
        tap((response: any) => {
          if (response.body && response.body.error) {
            throw response.body.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  obtenerTodosLosPermisos(): Observable<Permiso[]> {
    return this.http.get<Permiso[]>(`${environment.api}permisos`, this.getHttpOptions())
      .pipe(
        tap((response: any) => {
          if (response.body && response.body.error) {
            throw response.body.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  asignarPermisos(rolId: number, permisos: number[]): Observable<any> {
    const body = JSON.stringify({ rol_id: rolId, permisos });
    return this.http.post<any>(`${this.apiUrl}/${rolId}/permisos`, body, this.getHttpOptions()).pipe(
      tap((response: HttpResponse<any>) => {
        let respuesta: any = response.body;
        if (respuesta && respuesta.error) {
          console.log('Error en asignar permisos:', respuesta);
          throw respuesta.error;
        }
        console.log('Permisos asignados:', respuesta);
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('Error en RolesService:', error);
    let errorMessage = 'Ocurrió un error; por favor intente más tarde.';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = `Error ${error.status}: ${error.message}`;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}