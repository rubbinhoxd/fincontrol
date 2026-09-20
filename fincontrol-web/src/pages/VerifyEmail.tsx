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
              <p className="text-gray-500 dark:text-gray-400">Verificando seu email...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 size={48} className="mx-auto text-primary mb-4" />
              <h2 className="text-xl font-semibold dark:text-gray-100 mb-2">Email confirmado!</h2>
              <p className="text-gray-500 dark:text-gray-400">
                Sua conta está pronta. Você já pode entrar.
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle size={48} className="mx-auto text-danger mb-4" />
              <h2 className="text-xl font-semibold dark:text-gray-100 mb-2">Não deu certo</h2>
              <p className="text-gray-500 dark:text-gray-400">{message}</p>
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
