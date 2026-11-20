import axios from 'axios';
import { isJwtExpired } from '../utils/jwt';

const client = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Rotas publicas — nao disparam logout se der 401 (o caso normal de login
// com senha errada, por exemplo). Sao rotas de /auth/*.
const PUBLIC_PATHS = ['/auth/login', '/auth/register', '/auth/verify', '/auth/forgot-password', '/auth/reset-password', '/auth/resend-verification'];

function isPublicPath(url: string | undefined): boolean {
  if (!url) return false;
  return PUBLIC_PATHS.some((p) => url.startsWith(p));
}

/**
 * Caso raro de concorrencia: 1a request dispara o redirect, as seguintes
 * nao precisam redirecionar de novo. Evita piscar/race entre varias telas.
 */
let redirecting = false;

function forceLogoutAndRedirect(reason: 'expired' | 'invalid') {
  if (redirecting) return;
  redirecting = true;
  localStorage.removeItem('token');
  localStorage.removeItem('userName');
  // Full reload pra garantir que qualquer state em memoria seja descartado
  window.location.replace(`/login?${reason === 'expired' ? 'expired=1' : 'unauthorized=1'}`);
}

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  // Se o token existe mas ja expirou, nao envia a request — redireciona ja
  if (token && !isPublicPath(config.url) && isJwtExpired(token)) {
    forceLogoutAndRedirect('expired');
    // Cancela a request pra nao gerar erro de network
    return Promise.reject(new axios.Cancel('session expired'));
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    // Nao tratamos erros das rotas publicas aqui (login errado, etc)
    const url = error.config?.url as string | undefined;
    if (isPublicPath(url)) return Promise.reject(error);

    const status = error.response?.status;
    // 401 = JWT invalido/expirado; 403 pode acontecer quando o Spring Security
    // rejeita o token antes mesmo de passar pelo filtro JWT (ex: EMAIL_NOT_VERIFIED
    // ja tem seu proprio code — esse so dispara em casos de token ruim)
    if (status === 401 || (status === 403 && error.response?.data?.error !== 'EMAIL_NOT_VERIFIED')) {
      const token = localStorage.getItem('token');
      forceLogoutAndRedirect(isJwtExpired(token) ? 'expired' : 'invalid');
    }
    return Promise.reject(error);
  }
);

export default client;
