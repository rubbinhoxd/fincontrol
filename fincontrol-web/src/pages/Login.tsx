import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MailCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import * as authApi from '../api/auth';

type ViewState =
  | { kind: 'form' }
  | { kind: 'checkEmail'; email: string }
  | { kind: 'needsVerification'; email: string };

// Tags decorativas flutuantes (estilo Copilot Money) — composicao de categorias
// de financas pessoais em posicao fixa, rotacao aleatoria, cores da paleta.
const FLOATING_TAGS = [
  { label: '🛒 Mercado',    color: 'var(--color-tag-coral)',     top: '12%',  left: '8%',  rotate: '-10deg' },
  { label: '🏠 Aluguel',    color: 'var(--color-tag-tangerine)', top: '22%',  right: '10%', rotate: '8deg' },
  { label: '✈️ Viagem',     color: 'var(--color-tag-sky)',       top: '68%',  left: '6%',  rotate: '-6deg' },
  { label: '💼 Salário',    color: 'var(--color-tag-lime)',      top: '78%',  right: '8%', rotate: '9deg' },
  { label: '🎬 Streaming',  color: 'var(--color-tag-violet)',    top: '42%',  left: '4%',  rotate: '-12deg' },
  { label: '📈 Investir',   color: 'var(--color-tag-sunflower)', top: '52%',  right: '6%', rotate: '6deg' },
  { label: '☕ Café',       color: 'var(--color-tag-ember)',     top: '88%',  left: '12%', rotate: '-4deg' },
  { label: '🎓 Educação',   color: 'var(--color-tag-hot-pink)',  top: '14%',  right: '35%', rotate: '-6deg' },
];

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<ViewState>({ kind: 'form' });
  const [resendMsg, setResendMsg] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [sessionNotice, setSessionNotice] = useState<string>('');

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('expired') === '1') {
      setSessionNotice('Sua sessão expirou. Entre de novo pra continuar.');
    } else if (params.get('unauthorized') === '1') {
      setSessionNotice('Sua sessão foi encerrada. Entre de novo.');
    }
    if (params.get('expired') || params.get('unauthorized')) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await authApi.register(name, email, password);
        setView({ kind: 'checkEmail', email });
      } else {
        const response = await authApi.login(email, password);
        if (!response.data.token) throw new Error('Token ausente na resposta.');
        login(response.data.token, response.data.name);
        navigate('/');
      }
    } catch (err: any) {
      if (err.response?.status === 403 && err.response?.data?.error === 'EMAIL_NOT_VERIFIED') {
        setView({ kind: 'needsVerification', email });
      } else {
        setError(err.response?.data?.message || 'Erro ao autenticar');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (targetEmail: string) => {
    if (resendCooldown > 0 || resendLoading) return;
    setResendMsg('');
    setResendLoading(true);
    try {
      await authApi.resendVerification(targetEmail);
      setResendMsg('Email reenviado. Confira sua caixa de entrada e a pasta de spam / lixo eletrônico.');
      setResendCooldown(30);
    } catch {
      setResendMsg('Não foi possível reenviar agora. Tente novamente em alguns minutos.');
    } finally {
      setResendLoading(false);
    }
  };

  const backToForm = () => {
    setView({ kind: 'form' });
    setError('');
    setResendMsg('');
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-6" style={{ backgroundColor: 'var(--color-midnight-canvas)' }}>
      {/* Tags flutuantes decorativas (escondidas em mobile) */}
      <div className="absolute inset-0 pointer-events-none hidden md:block" aria-hidden="true">
        {FLOATING_TAGS.map((tag, i) => (
          <span
            key={i}
            className="tag-floating absolute"
            style={{
              backgroundColor: tag.color,
              top: tag.top,
              left: tag.left,
              right: tag.right,
              transform: `rotate(${tag.rotate})`,
            }}
          >
            {tag.label}
          </span>
        ))}
      </div>

      {/* Card central */}
      <div className="card-neo relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src="/favicon.png" alt="Savey" className="w-14 h-14 rounded-2xl shadow-md" />
          </div>
          <h1 className="text-3xl mb-2" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '-0.02em' }}>
            Savey
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-fog)', fontWeight: 300 }}>
            smart money, simple control
          </p>
        </div>

        {/* Banner de sessao expirada */}
        {sessionNotice && view.kind === 'form' && (
          <div className="mb-4 p-3 rounded-xl text-sm" style={{ backgroundColor: 'color-mix(in oklab, var(--color-warning) 12%, transparent)', border: '1px solid color-mix(in oklab, var(--color-warning) 30%, transparent)', color: 'var(--color-warning)' }}>
            {sessionNotice}
          </div>
        )}

        {view.kind === 'form' && (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div>
                  <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-mist)', fontWeight: 500 }}>Nome</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" required />
                </div>
              )}

              <div>
                <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-mist)', fontWeight: 500 }}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" required />
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <label className="block text-xs uppercase tracking-wider" style={{ color: 'var(--color-mist)', fontWeight: 500 }}>Senha</label>
                  {!isRegister && (
                    <Link to="/forgot-password" className="text-xs hover:underline" style={{ color: 'var(--color-signal)' }}>
                      Esqueci minha senha
                    </Link>
                  )}
                </div>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" required minLength={6} />
              </div>

              {error && <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>}

              <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                {loading ? 'Carregando...' : isRegister ? 'Criar conta' : 'Entrar'}
              </button>
            </form>

            <p className="text-center text-sm mt-6" style={{ color: 'var(--color-fog)' }}>
              {isRegister ? 'Já tem conta?' : 'Não tem conta?'}{' '}
              <button onClick={() => { setIsRegister(!isRegister); setError(''); }} className="font-medium hover:underline" style={{ color: 'var(--color-signal)' }}>
                {isRegister ? 'Entrar' : 'Criar conta'}
              </button>
            </p>
          </>
        )}

        {(view.kind === 'checkEmail' || view.kind === 'needsVerification') && (
          <div className="text-center">
            <MailCheck size={48} className="mx-auto mb-4" style={{ color: 'var(--color-signal)' }} />
            <h2 className="text-xl mb-2" style={{ fontWeight: 500 }}>
              {view.kind === 'checkEmail' ? 'Confira seu email' : 'Email não verificado'}
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-fog)' }}>
              {view.kind === 'checkEmail'
                ? 'Mandamos um link de confirmação pra '
                : 'Precisamos confirmar '}
              <strong style={{ color: 'var(--color-paper-white)' }}>{view.email}</strong>
              {view.kind === 'checkEmail'
                ? '. Abra o email e clica no botão pra ativar sua conta.'
                : ' antes de você entrar. Confira sua caixa de entrada.'}
            </p>

            <p className="text-xs mb-6" style={{ color: 'var(--color-mist)' }}>
              💡 Não achou? Olha também na pasta de <strong>spam</strong> ou <strong>lixo eletrônico</strong>.
            </p>

            <button
              onClick={() => handleResend(view.email)}
              disabled={resendCooldown > 0 || resendLoading}
              className="btn-ghost w-full mb-3"
            >
              {resendLoading ? (
                <><Loader2 size={16} className="animate-spin" /> Enviando...</>
              ) : resendCooldown > 0 ? (
                `Reenviar em ${resendCooldown}s`
              ) : (
                'Reenviar email'
              )}
            </button>

            {resendMsg && <p className="text-sm mb-3" style={{ color: 'var(--color-fog)' }}>{resendMsg}</p>}

            <button onClick={backToForm} className="text-sm hover:underline" style={{ color: 'var(--color-mist)' }}>
              Voltar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
