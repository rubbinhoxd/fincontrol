import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { verifyEmail } from '../api/auth';

type Status = 'loading' | 'success' | 'error';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Link inválido — token ausente.');
      return;
    }

    verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Não foi possível verificar. Link inválido ou expirado.');
      });
  }, [searchParams]);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--color-midnight-canvas)' }}
    >
      <div className="card-neo w-full max-w-md text-center" style={{ padding: 36 }}>
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

        <div className="my-8">
          {status === 'loading' && (
            <>
              <Loader2 size={44} style={{ color: 'var(--color-signal)' }} className="animate-spin mx-auto mb-4" />
              <p style={{ color: 'var(--color-fog)' }}>Verificando seu email...</p>
            </>
          )}

          {status === 'success' && (
            <>
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
                Email confirmado!
              </h2>
              <p style={{ color: 'var(--color-fog)' }}>
                Sua conta está pronta. Você já pode entrar.
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle size={44} style={{ color: 'var(--color-danger)' }} className="mx-auto mb-4" />
              <h2
                className="mb-2"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 500,
                  fontSize: 20,
                  color: 'var(--color-paper-white)',
                }}
              >
                Não deu certo
              </h2>
              <p style={{ color: 'var(--color-fog)' }}>{message}</p>
            </>
          )}
        </div>

        <Link to="/login" className="btn-primary inline-flex">
          Ir pro login
        </Link>
      </div>
    </div>
  );
}
