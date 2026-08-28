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

export class FincontrolClient {
  private http: AxiosInstance;
  private jwt: string | null = null;
  private categoriesCache: Cache<Category[]> = { value: null, fetchedAt: 0 };
  private cardsCache: Cache<Card[]> = { value: null, fetchedAt: 0 };

  constructor() {
    this.http = axios.create({
      baseURL: config.fincontrol.apiUrl,
      timeout: 15000,
    });
  }

  async login(): Promise<void> {
    logger.info('Autenticando na fincontrol-api...');
    const res = await this.http.post('/auth/login', {
      email: config.fincontrol.email,
      password: config.fincontrol.password,
    });
    this.jwt = res.data.token;
    logger.info({ userName: res.data.name }, 'Login OK');
  }

  private authHeader() {
    if (!this.jwt) throw new Error('Nao autenticado');
    return { Authorization: `Bearer ${this.jwt}` };
  }

  /** Executa uma requisicao autenticada. Se 401, tenta re-login uma vez. */
  private async withAuth<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 401) {
        logger.warn('JWT expirado, re-autenticando...');
        await this.login();
        return await fn();
      }
      throw err;
    }
  }

  async listCategories(forceRefresh = false): Promise<Category[]> {
    const now = Date.now();
    if (
      !forceRefresh &&
      this.categoriesCache.value &&
      now - this.categoriesCache.fetchedAt < CACHE_TTL_MS
    ) {
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
    if (
      !forceRefresh &&
      this.cardsCache.value &&
      now - this.cardsCache.fetchedAt < CACHE_TTL_MS
    ) {
      return this.cardsCache.value;
    }
    const res = await this.withAuth(() =>
      this.http.get<Card[]>('/cards', { headers: this.authHeader() })
    );
    this.cardsCache = { value: res.data, fetchedAt: now };
    return res.data;
  }

  async createTransaction(payload: TransactionRequest): Promise<TransactionResponse> {
    const res = await this.withAuth(() =>
      this.http.post<TransactionResponse>('/transactions', payload, { headers: this.authHeader() })
    );
    return res.data;
  }

  /** Busca uma transacao especifica pelo id. */
  async getTransaction(id: string): Promise<TransactionResponse> {
    const res = await this.withAuth(() =>
      this.http.get<TransactionResponse>(`/transactions/${id}`, { headers: this.authHeader() })
    );
    return res.data;
  }

  /** Atualiza (PUT). Sempre envia o payload completo. */
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

  /**
   * Lista as transacoes do mes atual (o mais recente que a API oferece via um filtro simples).
   * Ordena por data DESC e retorna as primeiras N.
   */
  async listRecentTransactions(limit = 15): Promise<TransactionResponse[]> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const res = await this.withAuth(() =>
      this.http.get<TransactionResponse[]>('/transactions', {
        headers: this.authHeader(),
        params: { yearMonth },
      })
    );
    // Ordena por data de CRIACAO (mais recente primeiro) para que "ultima"
    // corresponda a "a que acabei de cadastrar" — o modelo mental do usuario.
    return res.data
      .slice()
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
      .slice(0, limit);
  }
}
