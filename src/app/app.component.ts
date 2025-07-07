import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { AppConfigService } from './services/app-config.service';
import { NotificationComponent } from './components/common/notification/notification.component';
import { SpinnerComponent } from './components/common/spinner/spinner.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NotificationComponent, SpinnerComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  constructor(
    private titleService: Title,
    private configService: AppConfigService
  ) {}

  ngOnInit() {
    // Establecer título inicial
    this.titleService.setTitle(this.configService.appName);
    
    // Suscribirse a cambios de configuración
    this.configService.config$.subscribe(config => {
      this.titleService.setTitle(config.name);
    });
  }
}