import { Routes } from '@angular/router';
import { authGuard } from '../../../guards/auth.guard';
import { roleGuard } from '../../../guards/role.guard';

// Componente principal del módulo
import { CuentasCobroComponent } from './cuentas-cobro.component';

// Componentes de contratistas
import { ListaContratistasComponent } from './contratistas/lista-contratistas/lista-contratistas.component';
import { GestionContratistaComponent } from './contratistas/gestion-contratista/gestion-contratista.component';

// Componentes de entidades
import { ListaEntidadesComponent } from './entidades/lista-entidades/lista-entidades.component';
import { GestionEntidadComponent } from './entidades/gestion-entidad/gestion-entidad.component';

// Componentes de contratos
import { ListaContratosComponent } from './contratos/lista-contratos/lista-contratos.component';
import { GestionContratoComponent } from './contratos/gestion-contrato/gestion-contrato.component';

export const CUENTAS_COBRO_ROUTES: Routes = [
  {
    path: '',
    component: CuentasCobroComponent,
    canActivate: [authGuard],
    data: {
      breadcrumb: 'Cuentas de Cobro',
      permissions: ['contratos.gestionar', 'cuentas_cobro.ver']
    }
  },

  // Rutas de Contratistas
  {
    path: 'contratistas',
    canActivate: [authGuard, roleGuard],
    data: {
      breadcrumb: 'Contratistas',
      permissions: ['contratos.gestionar']
    },
    children: [
      {
        path: '',
        component: ListaContratistasComponent,
        data: { breadcrumb: null }
      },
      {
        path: 'crear',
        component: GestionContratistaComponent,
        data: {
          breadcrumb: 'Crear',
          mode: 'create'
        }
      },
      {
        path: 'editar/:id',
        component: GestionContratistaComponent,
        data: {
          breadcrumb: 'Editar',
          mode: 'edit'
        }
      },
      {
        path: 'detalle/:id',
        component: GestionContratistaComponent,
        data: {
          breadcrumb: 'Detalle',
          mode: 'view'
        }
      }
    ]
  },

  // Rutas de Entidades
  {
    path: 'entidades',
    canActivate: [authGuard, roleGuard],
    data: {
      breadcrumb: 'Entidades',
      permissions: ['contratos.gestionar']
    },
    children: [
      {
        path: '',
        component: ListaEntidadesComponent,
        data: { breadcrumb: null }
      },
      {
        path: 'crear',
        component: GestionEntidadComponent,
        data: {
          breadcrumb: 'Crear',
          mode: 'create'
        }
      },
      {
        path: 'editar/:id',
        component: GestionEntidadComponent,
        data: {
          breadcrumb: 'Editar',
          mode: 'edit'
        }
      },
      {
        path: 'detalle/:id',
        component: GestionEntidadComponent,
        data: {
          breadcrumb: 'Detalle',
          mode: 'view'
        }
      }
    ]
  },

  // Rutas de Contratos
  {
    path: 'contratos',
    canActivate: [authGuard, roleGuard],
    data: {
      breadcrumb: 'Contratos',
      permissions: ['contratos.gestionar']
    },
    children: [
      {
        path: '',
        component: ListaContratosComponent,
        data: { breadcrumb: null }
      },
      {
        path: 'crear',
        component: GestionContratoComponent,
        data: {
          breadcrumb: 'Crear',
          mode: 'create'
        }
      },
      {
        path: 'editar/:id',
        component: GestionContratoComponent,
        data: {
          breadcrumb: 'Editar',
          mode: 'edit'
        }
      },
      {
        path: 'detalle/:id',
        component: GestionContratoComponent,
        data: {
          breadcrumb: 'Detalle',
          mode: 'view'
        }
      }
    ]
  },

  // Rutas futuras
  {
    path: 'actividades',
    redirectTo: '/cuentas-cobro',
    pathMatch: 'full'
  },
  {
    path: 'generar',
    redirectTo: '/cuentas-cobro',
    pathMatch: 'full'
  },
  {
    path: 'mis-cuentas',
    redirectTo: '/cuentas-cobro',
    pathMatch: 'full'
  }
];