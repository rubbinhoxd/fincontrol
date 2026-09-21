import axios, { AxiosInstance, AxiosError } from 'axios';
import pino from 'pino';
import { config } from './config.js';
import { Card, Category, TransactionRequest, TransactionResponse } from './types.js';

const logger = pino({ level: config.logLevel }).child({ mod: 'fincontrol' });

const CACHE_TTL_MS = 5 * 60 * 1000;

interface Cache<T> {
  value: T | null;
  fetchedAt: number;
}

/**
 * Cliente HTTP autenticado como um usuario especifico. Pega JWT via
 * /api/internal/service-token (INTERNAL_SHARED_SECRET) — nao precisa
 * de email/senha do usuario.
 */
export class FincontrolClient {
  private http: AxiosInstance;
  private jwt: string | null = null;
  private jwtExpiresAt = 0;
  private categoriesCache: Cache<Category[]> = { value: null, fetchedAt: 0 };
  private cardsCache: Cache<Card[]> = { value: null, fetchedAt: 0 };

  constructor(private readonly userId: string) {
    this.http = axios.create({
      baseURL: config.fincontrol.apiUrl,
      timeout: 15000,
    });
  }

  /** Pega JWT pra esse user via endpoint interno da API. */
  private async fetchJwt(): Promise<void> {
    const maxAttempts = 10;
    let attempt = 0;
    while (true) {
      attempt++;
      try {
        const res = await this.http.post(
          '/internal/service-token',
          { userId: this.userId },
          { headers: { 'X-Internal-Secret': config.fincontrol.internalSecret } }
        );
        this.jwt = res.data.token;
        // JWT vale 24h — assume 23h de margem
        this.jwtExpiresAt = Date.now() + 23 * 60 * 60 * 1000;
        logger.info({ userId: this.userId, email: res.data.email }, 'Service token obtido');
        return;
      } catch (err: any) {
        const isRetryable =
          err?.code === 'ECONNREFUSED' ||
          err?.code === 'ECONNRESET' ||
          err?.code === 'ETIMEDOUT' ||
          err?.response?.status >= 500;
        if (!isRetryable || attempt >= maxAttempts) {
          throw err;
        }
        const delayMs = Math.min(1000 * Math.pow(1.5, attempt - 1), 10000);
        logger.warn({ attempt, code: err?.code, delayMs }, 'Fetch service-token falhou (retryable)');
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  private async ensureAuth(): Promise<void> {
    if (!this.jwt || Date.now() > this.jwtExpiresAt) {
      await this.fetchJwt();
    }
  }

  private authHeader() {
    if (!this.jwt) throw new Error('Nao autenticado');
    return { Authorization: `Bearer ${this.jwt}` };
  }

  private async withAuth<T>(fn: () => Promise<T>): Promise<T> {
    await this.ensureAuth();
    try {
      return await fn();
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 401) {
        logger.warn({ userId: this.userId }, 'JWT expirado, re-buscando');
        this.jwt = null;
        await this.ensureAuth();
        return await fn();
      }
      throw err;
    }
  }

  async listCategories(forceRefresh = false): Promise<Category[]> {
    const now = Date.now();
    if (!forceRefresh && this.categoriesCache.value && now - this.categoriesCache.fetchedAt < CACHE_TTL_MS) {
      return this.categoriesCache.value;
    }
    const res = await this.withAuth(() =>
      this.http.get<Category[]>('/categories', { headers: this.authHeader() })
    );
    this.categoriesCache = { value: res.data, fetchedAt: now };
    return res.data;
  }

  async listCards(forceRefresh = false): Promise<Card[]> {
    const now = Date.now();
    if (!forceRefresh && this.cardsCache.value && now - this.cardsCache.fetchedAt < CACHE_TTL_MS) {
      return this.cardsCache.value;
    }
    const res = await this.withAuth(() =>
      this.http.get<Card[]>('/cards', { headers: this.authHeader() })
    );
    this.cardsCache = { value: res.data, fetchedAt: now };
    return res.data;
  }

  async createTransaction(payload: TransactionRequest, force = false): Promise<TransactionResponse> {
    const res = await this.withAuth(() =>
      this.http.post<TransactionResponse>('/transactions', payload, {
        headers: this.authHeader(),
        params: force ? { force: 'true' } : undefined,
      })
    );
    return res.data;
  }

  async getTransaction(id: string): Promise<TransactionResponse> {
    const res = await this.withAuth(() =>
      this.http.get<TransactionResponse>(`/transactions/${id}`, { headers: this.authHeader() })
    );
    return res.data;
  }

  async updateTransaction(id: string, payload: TransactionRequest): Promise<TransactionResponse> {
    const res = await this.withAuth(() =>
      this.http.put<TransactionResponse>(`/transactions/${id}`, payload, { headers: this.authHeader() })
    );
    return res.data;
  }

  async deleteTransaction(id: string, mode: 'single' | 'future' = 'single'): Promise<void> {
    await this.withAuth(() =>
      this.http.delete(`/transactions/${id}`, {
        headers: this.authHeader(),
        params: { mode },
      })
    );
  }

  async listRecentTransactions(limit = 15): Promise<TransactionResponse[]> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const res = await this.withAuth(() =>
      this.http.get<TransactionResponse[]>('/transactions', {
        headers: this.authHeader(),
        params: { yearMonth },
      })
    );
    return res.data
      .slice()
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
      .slice(0, limit);
  }
}
