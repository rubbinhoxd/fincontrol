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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
        <div className="flex justify-center mb-3">
          <img src="/favicon.png" alt="Savey" className="w-16 h-16 rounded-2xl shadow-md" />
        </div>
        <h1 className="text-3xl font-bold text-primary">Savey</h1>

        <div className="my-8">
          {status === 'loading' && (
            <>
              <Loader2 size={48} className="mx-auto text-primary animate-spin mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Processando...</p>
            </>
          )}
          {status === 'success' && (
            <>
              <BellOff size={48} className="mx-auto text-primary mb-4" />
              <h2 className="text-xl font-semibold dark:text-gray-100 mb-2">Notificações desativadas</h2>
              <p className="text-gray-500 dark:text-gray-400">
                Você não vai mais receber lembretes por email. Se mudar de ideia, é só reativar nas configurações da conta.
              </p>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle size={48} className="mx-auto text-danger mb-4" />
              <h2 className="text-xl font-semibold dark:text-gray-100 mb-2">Link inválido</h2>
              <p className="text-gray-500 dark:text-gray-400">Não conseguimos processar essa desativação.</p>
            </>
          )}
        </div>

        <Link
          to="/login"
          className="inline-block bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-dark transition-colors"
        >
          Ir pro login
        </Link>
      </div>
    </div>
  );
}
