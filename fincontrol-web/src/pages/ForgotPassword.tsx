import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck, Loader2 } from 'lucide-react';
import { forgotPassword } from '../api/auth';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch {
      setSent(true);
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
        <div className="text-center mb-8">
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
          <p className="mt-1 text-sm" style={{ color: 'var(--color-mist)' }}>
            smart money, simple control
          </p>
        </div>

        {!sent ? (
          <>
            <h2
              className="text-center mb-2"
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 500,
                fontSize: 20,
                color: 'var(--color-paper-white)',
              }}
            >
              Esqueci minha senha
            </h2>
            <p className="text-sm text-center mb-6" style={{ color: 'var(--color-fog)' }}>
              Coloca teu email e a gente manda um link pra criar uma senha nova.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label-meta block mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  required
                />
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" /> Enviando...</>
                ) : (
                  'Enviar link de redefinição'
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center">
            <MailCheck size={44} style={{ color: 'var(--color-signal)' }} className="mx-auto mb-4" />
            <h2
              className="mb-2"
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 500,
                fontSize: 20,
                color: 'var(--color-paper-white)',
              }}
            >
              Se o email existir, chegará um link
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-fog)' }}>
              Confira sua caixa de entrada em{' '}
              <strong style={{ color: 'var(--color-paper-white)' }}>{email}</strong>.
            </p>
            <p className="text-xs" style={{ color: 'var(--color-mist)' }}>
              Não achou? Olha também na pasta de <strong>spam</strong> ou{' '}
              <strong>lixo eletrônico</strong>. O link vale por 1 hora.
            </p>
          </div>
        )}

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
      </div>
    </div>
  );
}
