import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';
import { first } from 'rxjs/operators';
import { AppConfigService } from '../../../services/app-config.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  loading = false;
  submitted = false;
  error = '';
  returnUrl: string = '/menu';

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private notificationService: NotificationService,
    public configService: AppConfigService  
  ) {
    // Redirigir si ya está logueado
    if (this.authService.currentUserValue) {
      this.router.navigate(['/menu']);
    }
  }

  ngOnInit() {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

    // Obtener return url de los parámetros o usar default
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/menu';
  }

  // Getter para acceder fácilmente a los campos del form
  get f() { return this.loginForm.controls; }

  onSubmit() {
    this.submitted = true;
    this.error = '';

    // Si el form es inválido, no continuar
    if (this.loginForm.invalid) {
      this.notificationService.warning('Por favor complete todos los campos correctamente');
      return;
    }

    this.loading = true;
    this.authService.login(this.f['email'].value, this.f['password'].value)
      .pipe(first())
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success('Inicio de sesión exitoso', 'Bienvenido');
            this.router.navigate([this.returnUrl]);
          } else {
            this.error = response.error || 'Error al iniciar sesión';
            this.notificationService.error(this.error);
            this.loading = false;
          }
        },
        error: (error) => {
          this.error = error.error?.error || 'Error al conectar con el servidor';
          this.notificationService.error(this.error, 'Error de conexión');
          this.loading = false;
        }
      });
  }
}