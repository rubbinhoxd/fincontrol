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
      // Mesmo em erro, mostra a mesma mensagem (nao vaza se email existe)
      setSent(true);
    } finally {
      setLoading(false);
    }
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

        {!sent ? (
          <>
            <h2 className="text-xl font-semibold dark:text-gray-100 mb-2 text-center">Esqueci minha senha</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">
              Coloca teu email e a gente manda um link pra criar uma senha nova.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
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
            <MailCheck size={48} className="mx-auto text-primary mb-4" />
            <h2 className="text-xl font-semibold dark:text-gray-100 mb-2">Se o email existir, chegará um link</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Confira sua caixa de entrada em <strong className="dark:text-gray-300">{email}</strong>.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
              💡 Não achou? Olha também na pasta de <strong>spam</strong> ou <strong>lixo eletrônico</strong>. O link vale por 1 hora.
            </p>
          </div>
        )}

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          <Link to="/login" className="text-primary font-medium hover:underline">
            Voltar para o login
          </Link>
        </p>
      </div>
    </div>
  );
}
