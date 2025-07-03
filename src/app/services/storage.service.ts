import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly prefix = 'sec_';

  constructor() {}

  // Guardar datos con encoding básico
  setItem(key: string, value: any): void {
    try {
      const data = JSON.stringify(value);
      const encoded = this.encode(data);
      localStorage.setItem(this.prefix + key, encoded);
    } catch (error) {
      console.error('Error guardando en storage:', error);
    }
  }

  // Obtener datos decodificados
  getItem(key: string): any {
    try {
      const encoded = localStorage.getItem(this.prefix + key);
      if (!encoded) return null;
      
      const decoded = this.decode(encoded);
      return JSON.parse(decoded);
    } catch (error) {
      console.error('Error leyendo del storage:', error);
      return null;
    }
  }

  // Eliminar item
  removeItem(key: string): void {
    localStorage.removeItem(this.prefix + key);
  }

  // Limpiar todo el storage de la app
  clear(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }

  // Verificar si existe una clave
  hasItem(key: string): boolean {
    return localStorage.getItem(this.prefix + key) !== null;
  }

  // Encoding básico (no es encriptación real, pero evita datos en texto plano)
  private encode(data: string): string {
    return btoa(encodeURIComponent(data).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));
  }

  // Decoding
  private decode(data: string): string {
    return decodeURIComponent(atob(data).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
  }

  // Almacenamiento temporal en memoria (más seguro para datos sensibles)
  private memoryStorage = new Map<string, any>();

  setMemory(key: string, value: any): void {
    this.memoryStorage.set(key, value);
  }

  getMemory(key: string): any {
    return this.memoryStorage.get(key);
  }

  removeMemory(key: string): void {
    this.memoryStorage.delete(key);
  }

  clearMemory(): void {
    this.memoryStorage.clear();
  }
}