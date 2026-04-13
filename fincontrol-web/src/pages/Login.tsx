import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import * as authApi from '../api/auth';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = isRegister
        ? await authApi.register(name, email, password)
        : await authApi.login(email, password);

      login(response.data.token, response.data.name);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">FinControl</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Controle financeiro pessoal</p>
        </div>

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
          {isRegister ? 'Ja tem conta?' : 'Nao tem conta?'}{' '}
          <button onClick={() => { setIsRegister(!isRegister); setError(''); }} className="text-primary font-medium hover:underline">
            {isRegister ? 'Entrar' : 'Criar conta'}
          </button>
        </p>
      </div>
    </div>
  );
}
