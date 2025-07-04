import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, NavigationEnd, RouterModule, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';

interface Breadcrumb {
  label: string;
  url: string;
  isActive: boolean;
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLink],
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.scss']
})
export class BreadcrumbComponent implements OnInit {
  @Input() customBreadcrumbs?: Breadcrumb[]; // Para breadcrumbs personalizados
  breadcrumbs: Breadcrumb[] = [];

  // Mapeo de rutas a nombres legibles
  private routeLabels: { [key: string]: string } = {
    'menu': 'Menú Principal',
    'configuracion': 'Configuración',
    'usuarios': 'Usuarios',
    'roles': 'Roles',
    'registro-diario': 'Registro Diario',
    'reportes': 'Reportes',
    'editar': 'Editar',
    'crear': 'Crear',
    'detalle': 'Detalle'
  };

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {}

  ngOnInit() {
    // Si hay breadcrumbs personalizados, usarlos
    if (this.customBreadcrumbs && this.customBreadcrumbs.length > 0) {
      this.breadcrumbs = this.customBreadcrumbs;
      return;
    }

    // Generar breadcrumbs automáticamente
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.breadcrumbs = this.buildBreadcrumbs();
        console.log('Breadcrumbs generados:', this.breadcrumbs); // Debug
      });
    
    // Generar inicial
    this.breadcrumbs = this.buildBreadcrumbs();
    console.log('Breadcrumbs iniciales:', this.breadcrumbs); // Debug
  }

  private buildBreadcrumbs(): Breadcrumb[] {
    const breadcrumbs: Breadcrumb[] = [];
    const url = this.router.url;
    
    // Dividir la URL en segmentos
    const segments = url.split('/').filter(segment => segment !== '');
    
    let currentUrl = '';
    
    segments.forEach((segment, index) => {
      currentUrl += `/${segment}`;
      
      // Obtener el label para este segmento
      const label = this.routeLabels[segment] || this.formatLabel(segment);
      
      breadcrumbs.push({
        label: label,
        url: currentUrl,
        isActive: index === segments.length - 1
      });
    });
    
    return breadcrumbs;
  }

  private formatLabel(path: string): string {
    // Convertir kebab-case a Title Case
    return path
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}