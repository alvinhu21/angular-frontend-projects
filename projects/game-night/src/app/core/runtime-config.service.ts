import { Injectable } from '@angular/core';

/**
 * Every device on the home network loads this app from the SAME host machine's LAN IP (just on
 * the frontend's own port); the API always lives on that identical host, port 8080. Deriving the
 * base URL from window.location instead of a baked-in environment constant means the app works
 * from any computer in the house without per-device configuration.
 */
@Injectable({ providedIn: 'root' })
export class RuntimeConfigService {
  private readonly apiPort = 8080;

  get apiBaseUrl(): string {
    return `${this.protocol}//${this.hostname}:${this.apiPort}`;
  }

  get wsBaseUrl(): string {
    return `${this.apiBaseUrl}/ws`;
  }

  private get hostname(): string {
    return typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  }

  private get protocol(): string {
    return typeof window !== 'undefined' ? window.location.protocol : 'http:';
  }
}
