import { useEffect, useState } from 'react';
import { MessageCircle, Loader2, CheckCircle2, XCircle, RefreshCw, Copy, Smartphone } from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import {
  connectWhatsApp,
  disconnectWhatsApp,
  getWhatsAppStatus,
  restartGroupDetection,
  type BotSessionSnapshot,
} from '../api/whatsapp';

const POLL_INTERVAL_MS = 2500;
const SUGGESTED_MSG = 'Olá Savey!';

export default function WhatsApp() {
  const [snapshot, setSnapshot] = useState<BotSessionSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [copiedMsg, setCopiedMsg] = useState(false);

  // Fetch inicial + polling enquanto status !== ACTIVE nem DISCONNECTED
  useEffect(() => {
    let stopped = false;
    let timer: number | null = null;

    const tick = async () => {
      try {
        const res = await getWhatsAppStatus();
        if (stopped) return;
        setSnapshot(res.data);
      } catch (err: any) {
        if (stopped) return;
        setError(err.response?.data?.message || 'Erro ao consultar status');
      } finally {
        if (!stopped) setLoading(false);
      }

      const status = snapshot?.status;
      // Continua polling se em estado transitorio
      if (!stopped && status !== 'ACTIVE' && status !== 'DISCONNECTED') {
        timer = window.setTimeout(tick, POLL_INTERVAL_MS);
      }
    };

    tick();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [snapshot?.status]);

  const handleConnect = async () => {
    setError('');
    setConnecting(true);
    try {
      const res = await connectWhatsApp();
      setSnapshot(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Não foi possível iniciar a conexão. Tenta de novo em alguns segundos.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Desconectar o WhatsApp? Você precisará escanear um QR novo pra reconectar.')) return;
    try {
      await disconnectWhatsApp();
      setSnapshot({ status: 'DISCONNECTED', qr: null, allowedJid: null, groupName: null });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao desconectar');
    }
  };

  const handleRestartDetection = async () => {
    try {
      await restartGroupDetection();
      // Refresh status
      const res = await getWhatsAppStatus();
      setSnapshot(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao reiniciar detecção');
    }
  };

  /** Reconectar do zero: apaga a sessao atual e ja inicia uma nova (novo QR). */
  const handleReset = async () => {
    if (!confirm('Isso apaga a sessão atual e gera um QR novo. Você precisará escanear de novo. Continuar?')) return;
    setError('');
    setConnecting(true);
    try {
      await disconnectWhatsApp();
      const res = await connectWhatsApp();
      setSnapshot(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao reconectar.');
    } finally {
      setConnecting(false);
    }
  };

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(SUGGESTED_MSG);
      setCopiedMsg(true);
      setTimeout(() => setCopiedMsg(false), 2000);
    } catch {}
  };

  return (
    <PageContainer title="WhatsApp">
      {loading ? (
        <div className="text-center py-12 text-gray-400 flex items-center justify-center gap-2">
          <Loader2 size={20} className="animate-spin" /> Carregando...
        </div>
      ) : (
        <div className="max-w-2xl">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-danger/10 text-danger text-sm">
              {error}
            </div>
          )}

          {(!snapshot || snapshot.status === 'DISCONNECTED') && (
            <DisconnectedView onConnect={handleConnect} connecting={connecting} />
          )}

          {snapshot?.status === 'WAITING_QR' && (
            <WaitingQrView qr={snapshot.qr} onCancel={handleDisconnect} />
          )}

          {snapshot?.status === 'PENDING_GROUP' && (
            <PendingGroupView onCopyMsg={copyMessage} copiedMsg={copiedMsg} onReset={handleReset} />
          )}

          {snapshot?.status === 'GROUP_TIMEOUT' && (
            <GroupTimeoutView onRestart={handleRestartDetection} onReset={handleReset} />
          )}

          {snapshot?.status === 'ACTIVE' && (
            <ActiveView snapshot={snapshot} onDisconnect={handleDisconnect} onReset={handleReset} />
          )}
        </div>
      )}
    </PageContainer>
  );
}

// ============ Sub-views ============

function DisconnectedView({ onConnect, connecting }: { onConnect: () => void; connecting: boolean }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-800 text-center">
      <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
        <MessageCircle size={32} className="text-primary" />
      </div>
      <h2 className="text-xl font-semibold dark:text-gray-100 mb-2">Conecte seu WhatsApp</h2>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        Fale com o Savey pelo WhatsApp pra cadastrar transações no ritmo do dia a dia.
        Basta escanear um QR code e criar um grupo pessoal.
      </p>
      <button
        onClick={onConnect}
        disabled={connecting}
        className="bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 inline-flex items-center gap-2"
      >
        {connecting ? (
          <><Loader2 size={16} className="animate-spin" /> Iniciando...</>
        ) : (
          <><MessageCircle size={18} /> Conectar meu WhatsApp</>
        )}
      </button>
    </div>
  );
}

function WaitingQrView({ qr, onCancel }: { qr: string | null; onCancel: () => void }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
      <div className="flex items-center gap-3 mb-6">
        <Smartphone size={24} className="text-primary" />
        <h2 className="text-xl font-semibold dark:text-gray-100">Escaneie o QR code</h2>
      </div>

      <ol className="text-sm text-gray-600 dark:text-gray-300 space-y-1 mb-6 list-decimal list-inside">
        <li>Abra o WhatsApp no celular</li>
        <li>Vá em <strong>Configurações → Aparelhos conectados</strong></li>
        <li>Toque em <strong>Conectar um aparelho</strong> e aponte a câmera aqui</li>
      </ol>

      <div className="flex justify-center mb-6">
        {qr ? (
          <img src={qr} alt="QR Code" className="w-64 h-64 rounded-lg border border-gray-200 dark:border-gray-700" />
        ) : (
          <div className="w-64 h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 text-center mb-4">
        💡 O QR expira em ~30s. Se sumir, um novo aparece automaticamente.
      </p>

      <button
        onClick={onCancel}
        className="w-full border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm"
      >
        Cancelar
      </button>
    </div>
  );
}

function PendingGroupView({ onCopyMsg, copiedMsg, onReset }: { onCopyMsg: () => void; copiedMsg: boolean; onReset: () => void }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-sm border border-primary/30">
      <div className="flex items-center gap-3 mb-4">
        <CheckCircle2 size={24} className="text-primary" />
        <h2 className="text-xl font-semibold dark:text-gray-100">Conectado! Falta 1 passo</h2>
      </div>

      <p className="text-gray-600 dark:text-gray-300 mb-3">
        Pra deixar tudo pronto, crie um <strong>grupo só com você</strong> no WhatsApp e
        mande uma mensagem qualquer nele. A gente detecta e ativa automaticamente.
      </p>

      <div className="bg-mint/50 dark:bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4">
        <p className="text-xs text-gray-700 dark:text-gray-300">
          💡 <strong>O WhatsApp não deixa criar grupo só com você.</strong> A saída é:
          criar um grupo com qualquer contato de confiança, entrar nas configurações
          do grupo e <strong>remover essa pessoa</strong>. No fim, sobra só você — e
          é aí que o Savey conecta.
        </p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4 space-y-3">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sugestão de nome do grupo:</p>
          <p className="text-sm font-medium dark:text-gray-200">"Meu Savey" (ou o que preferir)</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sugestão de mensagem:</p>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium dark:text-gray-200 flex-1">{SUGGESTED_MSG}</p>
            <button
              onClick={onCopyMsg}
              className="text-primary hover:text-primary-dark inline-flex items-center gap-1 text-xs font-medium"
            >
              <Copy size={14} /> {copiedMsg ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-2 mb-4">
        <Loader2 size={12} className="animate-spin" />
        Aguardando você mandar a primeira mensagem... (janela de 10 min)
      </div>

      <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
        <button
          onClick={onReset}
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-danger"
        >
          Travou? Reconectar do zero (novo QR)
        </button>
      </div>
    </div>
  );
}

function GroupTimeoutView({ onRestart, onReset }: { onRestart: () => void; onReset: () => void }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-sm border border-warning/30">
      <div className="flex items-center gap-3 mb-4">
        <XCircle size={24} className="text-warning" />
        <h2 className="text-xl font-semibold dark:text-gray-100">Detecção expirou</h2>
      </div>

      <p className="text-gray-600 dark:text-gray-300 mb-6">
        A janela de 10 minutos pra detectar o grupo terminou sem receber mensagem.
        Sem stress — clica aqui pra reiniciar a detecção.
      </p>

      <button
        onClick={onRestart}
        className="bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-dark transition-colors inline-flex items-center gap-2 mb-4"
      >
        <RefreshCw size={16} /> Reiniciar detecção
      </button>

      <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
        <button onClick={onReset} className="text-xs text-gray-500 dark:text-gray-400 hover:text-danger">
          Ou reconectar do zero (novo QR)
        </button>
      </div>
    </div>
  );
}

function ActiveView({ snapshot, onDisconnect, onReset }: { snapshot: BotSessionSnapshot; onDisconnect: () => void; onReset: () => void }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-sm border border-success/30">
      <div className="flex items-center gap-3 mb-4">
        <CheckCircle2 size={24} className="text-success" />
        <h2 className="text-xl font-semibold dark:text-gray-100">Bot ativo</h2>
      </div>

      <p className="text-gray-600 dark:text-gray-300 mb-4">
        O Savey tá recebendo suas mensagens no grupo:
      </p>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Grupo</p>
        <p className="text-lg font-semibold dark:text-gray-100">
          {snapshot.groupName || '(nome não capturado)'}
        </p>
      </div>

      <div className="border-t border-gray-100 dark:border-gray-800 pt-4 flex flex-col gap-2">
        <button onClick={onReset} className="text-xs text-gray-500 dark:text-gray-400 hover:text-primary text-left">
          Travou? Reconectar do zero (novo QR)
        </button>
        <button onClick={onDisconnect} className="text-danger hover:underline text-sm font-medium text-left">
          Desconectar WhatsApp
        </button>
      </div>
    </div>
  );
}
