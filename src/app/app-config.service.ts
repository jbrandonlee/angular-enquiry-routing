import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { tap } from 'rxjs';

export interface AppConfig {
  apiUrl: string;
}

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private readonly http = inject(HttpClient);
  private config: AppConfig | undefined;

  load() {
    return this.http.get<AppConfig>('/config.json').pipe(
      tap((config) => {
        if (typeof config.apiUrl !== 'string' || config.apiUrl.length === 0) {
          throw new Error('The application config must define a non-empty apiUrl.');
        }

        this.config = config;
      }),
    );
  }

  get apiUrl(): string {
    if (!this.config) {
      throw new Error('Application config has not been loaded.');
    }

    return this.config.apiUrl;
  }
}
