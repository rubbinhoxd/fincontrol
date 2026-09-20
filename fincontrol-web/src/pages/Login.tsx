import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { MailCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import * as authApi from '../api/auth';

type ViewState =
  | { kind: 'form' }
  | { kind: 'checkEmail'; email: string }
  | { kind: 'needsVerification'; email: string };

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

  const { login } = useAuth();
  const navigate = useNavigate();

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

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <img src="/favicon.png" alt="Savey" className="w-16 h-16 rounded-2xl shadow-md" />
          </div>
          <h1 className="text-3xl font-bold text-primary">Savey</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">smart money, simple control</p>
        </div>

        {view.kind === 'form' && (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" required />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Senha</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" required minLength={6} />
              </div>

              {error && <p className="text-sm text-danger">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {loading ? 'Carregando...' : isRegister ? 'Criar conta' : 'Entrar'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
              {isRegister ? 'Já tem conta?' : 'Não tem conta?'}{' '}
              <button onClick={() => { setIsRegister(!isRegister); setError(''); }} className="text-primary font-medium hover:underline">
                {isRegister ? 'Entrar' : 'Criar conta'}
              </button>
            </p>
          </>
        )}

        {(view.kind === 'checkEmail' || view.kind === 'needsVerification') && (
          <div className="text-center">
            <MailCheck size={48} className="mx-auto text-primary mb-4" />
            <h2 className="text-xl font-semibold dark:text-gray-100 mb-2">
              {view.kind === 'checkEmail' ? 'Confira seu email' : 'Email não verificado'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {view.kind === 'checkEmail'
                ? 'Mandamos um link de confirmação pra '
                : 'Precisamos confirmar '}
              <strong className="dark:text-gray-300">{view.email}</strong>
              {view.kind === 'checkEmail'
                ? '. Abra o email e clica no botão pra ativar sua conta.'
                : ' antes de você entrar. Confira sua caixa de entrada.'}
            </p>

            <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
              💡 Não achou? Olha também na pasta de <strong>spam</strong> ou <strong>lixo eletrônico</strong>.
            </p>

            <button
              onClick={() => handleResend(view.email)}
              disabled={resendCooldown > 0 || resendLoading}
              className="w-full mb-3 border border-primary text-primary py-2.5 rounded-lg font-medium hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {resendLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Enviando...
                </>
              ) : resendCooldown > 0 ? (
                `Reenviar em ${resendCooldown}s`
              ) : (
                'Reenviar email'
              )}
            </button>

            {resendMsg && <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{resendMsg}</p>}

            <button
              onClick={backToForm}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary"
            >
              Voltar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
