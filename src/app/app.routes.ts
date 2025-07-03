import { Routes } from '@angular/router';
import { LoginComponent } from './components/pages/login/login.component';
import { MenuComponent } from './components/pages/menu/menu.component';
import { RegistroDiarioComponent } from './components/pages/registro-diario/registro-diario.component';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';
import { UsuariosComponent } from './components/pages/usuarios/usuarios.component';


export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'menu',
    component: MenuComponent,
    canActivate: [authGuard]
  },
  {
    path: 'registro-diario',
    component: RegistroDiarioComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      permissions: ['registro.ver']
    }
  },
  {
    path: 'usuarios',
    component: UsuariosComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      permissions: ['usuarios.ver']
    }
  },
  
  // Comentados hasta que se creen los componentes
  /*
  {
    path: 'reportes',
    loadComponent: () => import('./components/reportes/reportes.component').then(m => m.ReportesComponent),
    canActivate: [authGuard, roleGuard],
    data: {
      permissions: ['reportes.ver']
    }
  },
  {
    path: 'configuracion',
    loadComponent: () => import('./components/configuracion/configuracion.component').then(m => m.ConfiguracionComponent),
    canActivate: [authGuard, roleGuard],
    data: {
      permissions: ['config.ver']
    }
  },
  */
  {
    path: '**',
    redirectTo: '/login'
  }
];