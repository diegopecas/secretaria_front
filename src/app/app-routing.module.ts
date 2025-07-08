import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/pages/login/login.component';
import { MenuComponent } from './components/pages/menu/menu.component';


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