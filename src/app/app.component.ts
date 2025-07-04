// app.component.ts
import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationComponent } from './components/common/notification/notification.component';

import { ThemeService } from './services/theme.service';
import { SpinnerComponent } from './components/common/spinner/spinner.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NotificationComponent, SpinnerComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'secretaria';

  constructor(private themeService: ThemeService) {}

  ngOnInit(): void {
    // El servicio de temas se inicializa automáticamente
    // y aplica el tema guardado o el preferido del sistema
  }
}