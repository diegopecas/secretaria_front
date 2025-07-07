import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { LayoutComponent } from '../../../common/layout/layout.component';
import { BreadcrumbComponent } from '../../../common/breadcrumb/breadcrumb.component';
import { HasPermissionDirective } from '../../../../directives/has-permission.directive';
import { AppConfigService, AppConfig } from '../../../../services/app-config.service';
import { NotificationService } from '../../../../services/notification.service';
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-configuracion-sistema',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LayoutComponent,
    BreadcrumbComponent
  ],
  templateUrl: './configuracion-sistema.component.html',
  styleUrls: ['./configuracion-sistema.component.scss']
})
export class ConfiguracionSistemaComponent implements OnInit {
  configForm!: FormGroup;
  isLoading = false;
  currentConfig!: AppConfig;

  constructor(
    private fb: FormBuilder,
    private configService: AppConfigService,
    private notificationService: NotificationService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.currentConfig = this.configService.config;
    this.initForm();
  }

  initForm() {
    this.configForm = this.fb.group({
      name: [this.currentConfig.name, [Validators.required]],
      shortName: [this.currentConfig.shortName, [Validators.required, Validators.maxLength(3)]],
      icon: [this.currentConfig.icon],
      description: [this.currentConfig.description, [Validators.required]],
      footer: [this.currentConfig.footer, [Validators.required]]
    });
  }

  onSubmit() {
    if (this.configForm.invalid) {
      this.notificationService.warning('Por favor complete todos los campos requeridos');
      return;
    }

    this.isLoading = true;
    const newConfig = this.configForm.value;

    // Actualizar configuración
    this.configService.updateConfig(newConfig);
    this.configService.saveToLocalStorage();

    setTimeout(() => {
      this.isLoading = false;
      this.notificationService.success('Configuración actualizada correctamente');
    }, 500);
  }

  cancelar() {
    this.configForm.reset(this.currentConfig);
  }

  // Getters para vista previa
  get previewName(): string {
    return this.configForm.get('name')?.value || 'Nombre de la App';
  }

  get previewShortName(): string {
    return this.configForm.get('shortName')?.value || 'NA';
  }

  get previewIcon(): string {
    return this.configForm.get('icon')?.value || '';
  }

  get previewDescription(): string {
    return this.configForm.get('description')?.value || 'Descripción del sistema';
  }

  get previewFooter(): string {
    return this.configForm.get('footer')?.value || 'Footer del sistema';
  }

  get f() {
    return this.configForm.controls;
  }

  hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }
}