import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { MenuComponent } from './components/menu/menu.component';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  { 
    path: 'login', 
    component: LoginComponent 
  },
  { 
    path: 'menu', 
    component: MenuComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: '', 
    redirectTo: '/menu', 
    pathMatch: 'full' 
  },
  { 
    path: '**', 
    redirectTo: '/menu' 
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }