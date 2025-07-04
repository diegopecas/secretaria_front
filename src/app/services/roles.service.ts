import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Rol {
  id: number;
  nombre: string;
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
      })
    };
  }

  obtenerTodos(): Observable<Rol[]> {
    return this.http.get<Rol[]>(this.apiUrl, this.getHttpOptions());
  }

  obtenerPermisos(rolId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${rolId}/permisos`, this.getHttpOptions());
  }
}