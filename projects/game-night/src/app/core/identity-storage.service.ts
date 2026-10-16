import { Injectable } from '@angular/core';
import { StoredIdentity } from '../models/session.models';

const KEY = 'game-night.identity';

/**
 * Keeps this browser tab's seat in a session (sessionStorage is per-tab, which is exactly right
 * here - each player's own device/tab is its own identity, and a page refresh shouldn't lose it).
 */
@Injectable({ providedIn: 'root' })
export class IdentityStorageService {
  save(identity: StoredIdentity): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    sessionStorage.setItem(KEY, JSON.stringify(identity));
  }

  load(): StoredIdentity | null {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }
    const raw = sessionStorage.getItem(KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as StoredIdentity;
    } catch {
      return null;
    }
  }

  clear(): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    sessionStorage.removeItem(KEY);
  }
}
