import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/lobby-home/lobby-home.component').then((m) => m.LobbyHomeComponent),
  },
  {
    path: 'create/:gameType',
    loadComponent: () =>
      import('./features/create-session/create-session.component').then((m) => m.CreateSessionComponent),
  },
  {
    path: 'join',
    loadComponent: () => import('./features/join-session/join-session.component').then((m) => m.JoinSessionComponent),
  },
  {
    path: 'session/:code/lobby',
    loadComponent: () =>
      import('./features/session-lobby/session-lobby.component').then((m) => m.SessionLobbyComponent),
  },
  {
    path: 'session/:code/wof/host',
    loadComponent: () =>
      import('./features/wof/wof-host-board/wof-host-board.component').then((m) => m.WofHostBoardComponent),
  },
  {
    path: 'session/:code/wof/play',
    loadComponent: () =>
      import('./features/wof/wof-player-controller/wof-player-controller.component').then(
        (m) => m.WofPlayerControllerComponent,
      ),
  },
  {
    path: 'session/:code/jeopardy/host',
    loadComponent: () =>
      import('./features/jeopardy/jeopardy-host-board/jeopardy-host-board.component').then(
        (m) => m.JeopardyHostBoardComponent,
      ),
  },
  {
    path: 'jeopardy/results',
    loadComponent: () =>
      import('./features/jeopardy/results/jeopardy-results.component').then((m) => m.JeopardyResultsComponent),
  },
  {
    path: 'session/:code/jeopardy/play',
    loadComponent: () =>
      import('./features/jeopardy/jeopardy-player-controller/jeopardy-player-controller.component').then(
        (m) => m.JeopardyPlayerControllerComponent,
      ),
  },
  { path: '**', redirectTo: '' },
];
