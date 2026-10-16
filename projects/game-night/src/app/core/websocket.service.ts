import { Injectable, inject } from '@angular/core';
import { Client, IFrame, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { RuntimeConfigService } from './runtime-config.service';

/**
 * Thin wrapper around a single STOMP-over-SockJS connection for one game session. The backend
 * authenticates the connection from the sessionCode/playerId CONNECT headers (see
 * StompAuthChannelInterceptor server-side) - there's no separate login step.
 */
@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private client: Client | null = null;

  connect(sessionCode: string, playerId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        resolve();
        return;
      }
      const client = new Client({
        webSocketFactory: () => new SockJS(this.runtimeConfig.wsBaseUrl),
        connectHeaders: { sessionCode, playerId },
        reconnectDelay: 2000,
        onConnect: () => resolve(),
        onStompError: (frame: IFrame) => reject(new Error(frame.headers['message'] ?? 'STOMP connection error')),
      });
      client.activate();
      this.client = client;
    });
  }

  disconnect(): void {
    this.client?.deactivate();
    this.client = null;
  }

  get connected(): boolean {
    return !!this.client?.connected;
  }

  onTopic<T>(destination: string, callback: (payload: T) => void): StompSubscription | undefined {
    return this.client?.subscribe(destination, (message: IMessage) => {
      callback(JSON.parse(message.body) as T);
    });
  }

  send(destination: string, body: unknown = {}): void {
    this.client?.publish({ destination, body: JSON.stringify(body) });
  }
}
