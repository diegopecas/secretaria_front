import { Directive, Input, TemplateRef, ViewContainerRef, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Subject, takeUntil } from 'rxjs';

@Directive({
  selector: '[hasPermission]',
  standalone: true
})
export class HasPermissionDirective implements OnInit, OnDestroy {
  @Input() hasPermission: string | string[] = '';
  @Input() hasPermissionOr: boolean = true; // true = OR, false = AND
  
  private destroy$ = new Subject<void>();

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Escuchar cambios en el usuario actual
    this.authService.currentUser
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateView();
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateView() {
    const hasPermission = this.checkPermission();
    
    if (hasPermission) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }

  private checkPermission(): boolean {
    if (!this.hasPermission) return true;

    if (Array.isArray(this.hasPermission)) {
      if (this.hasPermissionOr) {
        // OR: tiene al menos uno de los permisos
        return this.authService.hasAnyPermission(this.hasPermission);
      } else {
        // AND: tiene todos los permisos
        return this.hasPermission.every(p => this.authService.hasPermission(p));
      }
    } else {
      // Un solo permiso
      return this.authService.hasPermission(this.hasPermission);
    }
  }
}