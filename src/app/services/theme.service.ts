import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'secretaria_theme';
  private currentThemeSubject: BehaviorSubject<Theme>;
  public currentTheme$: Observable<Theme>;

  constructor() {
    // Obtener tema guardado o usar el preferido del sistema
    const savedTheme = this.getSavedTheme();
    this.currentThemeSubject = new BehaviorSubject<Theme>(savedTheme);
    this.currentTheme$ = this.currentThemeSubject.asObservable();
    
    // Aplicar tema inicial
    this.applyTheme(savedTheme);
    
    // Escuchar cambios en la preferencia del sistema
    this.watchSystemPreference();
  }

  get currentTheme(): Theme {
    return this.currentThemeSubject.value;
  }

  setTheme(theme: Theme): void {
    this.currentThemeSubject.next(theme);
    this.applyTheme(theme);
    this.saveTheme(theme);
  }

  toggleTheme(): void {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  private applyTheme(theme: Theme): void {
    // Remover clases anteriores
    document.body.classList.remove('theme-light', 'theme-dark');
    
    // Aplicar nueva clase
    document.body.classList.add(`theme-${theme}`);
    
    // Actualizar meta theme-color para navegadores móviles
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#1a1a1a' : '#ffffff');
    }
  }

  private getSavedTheme(): Theme {
    const saved = localStorage.getItem(this.THEME_KEY) as Theme;
    
    if (saved && (saved === 'light' || saved === 'dark')) {
      return saved;
    }
    
    // Si no hay tema guardado, usar la preferencia del sistema
    return this.getSystemPreference();
  }

  private saveTheme(theme: Theme): void {
    localStorage.setItem(this.THEME_KEY, theme);
  }

  private getSystemPreference(): Theme {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  private watchSystemPreference(): void {
    if (!window.matchMedia) return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Escuchar cambios en la preferencia del sistema
    mediaQuery.addEventListener('change', (e) => {
      // Solo cambiar si el usuario no ha seleccionado manualmente un tema
      if (!localStorage.getItem(this.THEME_KEY)) {
        const newTheme = e.matches ? 'dark' : 'light';
        this.setTheme(newTheme);
      }
    });
  }

  clearThemePreference(): void {
    localStorage.removeItem(this.THEME_KEY);
    // Volver a la preferencia del sistema
    this.setTheme(this.getSystemPreference());
  }
}