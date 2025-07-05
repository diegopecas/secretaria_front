import { Routes } from '@angular/router';
import { LoginComponent } from './components/pages/login/login.component';
import { MenuComponent } from './components/pages/menu/menu.component';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';
import { ConfiguracionComponent } from './components/pages/configuracion/configuracion.component';
import { GestionRolComponent } from './components/pages/configuracion/roles/gestion-rol/gestion-rol.component';
import { RolesComponent } from './components/pages/configuracion/roles/roles.component';
import { UsuariosComponent } from './components/pages/configuracion/usuarios/usuarios.component';


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
    canActivate: [authGuard],
    data: { breadcrumb: 'Menú Principal' }
  },
  {
    path: 'configuracion',
    component: ConfiguracionComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      permissions: ['config.ver']
    }
  },
  {
    path: 'configuracion/usuarios',
    component: UsuariosComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      permissions: ['usuarios.ver']
    }
  },
  {
    path: 'configuracion/usuarios/crear',
    loadComponent: () => import('./components/pages/configuracion/usuarios/gestion-usuario/gestion-usuario.component').then(m => m.GestionUsuarioComponent),
    canActivate: [authGuard, roleGuard],
    data: {
      permissions: ['usuarios.crear'],
      mode: 'create'
    }
  },
  {
    path: 'configuracion/usuarios/editar/:id',
    loadComponent: () => import('./components/pages/configuracion/usuarios/gestion-usuario/gestion-usuario.component').then(m => m.GestionUsuarioComponent),
    canActivate: [authGuard, roleGuard],
    data: {
      permissions: ['usuarios.editar'],
      mode: 'edit'
    }
  },
  {
    path: 'configuracion/usuarios/detalle/:id',
    loadComponent: () => import('./components/pages/configuracion/usuarios/gestion-usuario/gestion-usuario.component').then(m => m.GestionUsuarioComponent),
    canActivate: [authGuard, roleGuard],
    data: {
      permissions: ['usuarios.ver'],
      mode: 'view'
    }
  },
  {
    path: 'configuracion/roles',
    component: RolesComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      permissions: ['roles.ver']
    }
  },
  {
    path: 'configuracion/roles/crear',
    component: GestionRolComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      permissions: ['roles.crear'],
      mode: 'create'
    }
  },
  {
    path: 'configuracion/roles/editar/:id',
    component: GestionRolComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      permissions: ['roles.editar'],
      mode: 'edit'
    }
  },
  {
    path: 'configuracion/roles/detalle/:id',
    component: GestionRolComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      permissions: ['roles.ver'],
      mode: 'view'
    }
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];