import { Routes } from '@angular/router';
import { AgentChat } from './agent-chat';
import { ClientChat } from './client-chat';

export const routes: Routes = [
  { path: 'client', component: ClientChat, title: 'Customer support' },
  { path: 'agent', component: AgentChat, title: 'Agent workspace' },
  { path: '', pathMatch: 'full', redirectTo: 'client' },
  { path: '**', redirectTo: 'client' },
];
