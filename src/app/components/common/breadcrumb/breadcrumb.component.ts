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
    'detalle': 'Detalle',
    'permisos': 'Permisos',
    'gestion': 'Gestión'
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
      });
    
    // Generar inicial
    this.breadcrumbs = this.buildBreadcrumbs();
  }

  private buildBreadcrumbs(): Breadcrumb[] {
    const breadcrumbs: Breadcrumb[] = [];
    const url = this.router.url;
    
    // Remover el hash y query params si existen
    const cleanUrl = url.split('?')[0].split('#')[0];
    
    // Dividir la URL en segmentos
    const segments = cleanUrl.split('/').filter(segment => segment !== '');
    
    let currentUrl = '';
    const processedSegments: { segment: string, url: string }[] = [];
    
    // Primero, procesar todos los segmentos para construir las URLs correctas
    segments.forEach((segment, index) => {
      // Si es un ID numérico, no lo procesamos como segmento individual
      if (this.isNumeric(segment)) {
        return;
      }
      
      currentUrl += `/${segment}`;
      processedSegments.push({ segment, url: currentUrl });
    });
    
    // Ahora construir los breadcrumbs
    processedSegments.forEach((item, index) => {
      const { segment, url } = item;
      const isLast = index === processedSegments.length - 1;
      
      // Obtener el label para este segmento
      let label = this.routeLabels[segment] || this.formatLabel(segment);
      
      // Si es el último segmento y es una acción (crear, editar, detalle)
      // no lo hacemos clickeable
      const isAction = ['crear', 'editar', 'detalle'].includes(segment);
      
      breadcrumbs.push({
        label: label,
        url: url,
        isActive: isLast || (isAction && isLast)
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

  private isNumeric(value: string): boolean {
    return !isNaN(Number(value)) && !isNaN(parseFloat(value));
  }
}