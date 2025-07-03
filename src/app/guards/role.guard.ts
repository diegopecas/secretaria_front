import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Primero verificar si está logueado
  if (!authService.isLoggedIn()) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  // Obtener permisos requeridos de la ruta
  const requiredPermissions = route.data['permissions'] as string[] || [];
  const requireAll = route.data['requireAll'] as boolean || false;

  // Si no hay requisitos de permisos, permitir acceso
  if (requiredPermissions.length === 0) {
    return true;
  }

  let hasAccess = false;

  // Verificar permisos
  if (requireAll) {
    // Requiere TODOS los permisos
    hasAccess = requiredPermissions.every(p => authService.hasPermission(p));
  } else {
    // Requiere AL MENOS UN permiso
    hasAccess = authService.hasAnyPermission(requiredPermissions);
  }

  if (!hasAccess) {
    // Redirigir a página de acceso denegado o al menú
    console.warn('Acceso denegado. Permisos requeridos:', requiredPermissions);
    router.navigate(['/menu']);
    return false;
  }

  return true;
};