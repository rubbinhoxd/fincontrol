import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, KeyRound } from 'lucide-react';
import { resetPassword } from '../api/auth';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Link inválido — token ausente.');
      return;
    }
    if (password.length < 6) {
      setError('A senha precisa ter no mínimo 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não conferem.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Não foi possível redefinir. Link inválido ou expirado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--color-midnight-canvas)' }}
    >
      <div className="card-neo w-full max-w-md" style={{ padding: 36 }}>
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <img src="/favicon.png" alt="Savey" className="w-14 h-14 rounded-2xl" />
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 500,
              fontSize: 32,
              letterSpacing: '-0.03em',
              color: 'var(--color-paper-white)',
            }}
          >
            Savey
          </h1>
        </div>

        {!done ? (
          <>
            <div className="text-center mb-6">
              <KeyRound size={36} style={{ color: 'var(--color-signal)' }} className="mx-auto mb-3" />
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 500,
                  fontSize: 20,
                  color: 'var(--color-paper-white)',
                }}
              >
                Nova senha
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--color-fog)' }}>
                Escolha uma senha nova pra sua conta.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label-meta block mb-2">Nova senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  minLength={6}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="label-meta block mb-2">Confirmar senha</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="input"
                  minLength={6}
                  required
                />
              </div>

              {error && (
                <div
                  className="rounded-xl p-3"
                  style={{
                    backgroundColor: 'color-mix(in oklab, var(--color-danger) 10%, transparent)',
                    border: '1px solid color-mix(in oklab, var(--color-danger) 30%, transparent)',
                  }}
                >
                  <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" /> Salvando...</>
                ) : (
                  'Redefinir senha'
                )}
              </button>
            </form>

            <p className="text-center text-sm mt-6" style={{ color: 'var(--color-fog)' }}>
              <Link
                to="/login"
                style={{ color: 'var(--color-signal)', fontWeight: 500, textDecoration: 'none' }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
              >
                Voltar para o login
              </Link>
            </p>
          </>
        ) : (
          <div className="text-center">
            <CheckCircle2 size={44} style={{ color: 'var(--color-success)' }} className="mx-auto mb-4" />
            <h2
              className="mb-2"
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 500,
                fontSize: 20,
                color: 'var(--color-paper-white)',
              }}
            >
              Senha redefinida!
            </h2>
            <p style={{ color: 'var(--color-fog)' }}>Redirecionando pro login...</p>
          </div>
        )}
      </div>
    </div>
  );
}
