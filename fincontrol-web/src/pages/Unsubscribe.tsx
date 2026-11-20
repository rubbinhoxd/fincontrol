import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BellOff, Loader2, XCircle } from 'lucide-react';
import { unsubscribe } from '../api/notifications';

type Status = 'loading' | 'success' | 'error';

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      return;
    }
    unsubscribe(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
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
              <p style={{ color: 'var(--color-fog)' }}>Processando...</p>
            </>
          )}
          {status === 'success' && (
            <>
              <BellOff size={44} style={{ color: 'var(--color-signal)' }} className="mx-auto mb-4" />
              <h2
                className="mb-2"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 500,
                  fontSize: 20,
                  color: 'var(--color-paper-white)',
                }}
              >
                Notificações desativadas
              </h2>
              <p style={{ color: 'var(--color-fog)' }}>
                Você não vai mais receber lembretes por email. Se mudar de ideia, é só reativar nas configurações da conta.
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
                Link inválido
              </h2>
              <p style={{ color: 'var(--color-fog)' }}>Não conseguimos processar essa desativação.</p>
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
