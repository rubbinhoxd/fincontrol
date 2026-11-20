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
      const res = await getWhatsAppStatus();
      setSnapshot(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao reiniciar detecção');
    }
  };

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
        <div
          className="card-neo text-center py-16 flex items-center justify-center gap-2"
          style={{ color: 'var(--color-mist)' }}
        >
          <Loader2 size={18} className="animate-spin" /> Carregando...
        </div>
      ) : (
        <div className="max-w-2xl">
          {error && (
            <div
              className="mb-4 p-3 rounded-xl text-sm"
              style={{
                backgroundColor: 'color-mix(in oklab, var(--color-danger) 10%, transparent)',
                border: '1px solid color-mix(in oklab, var(--color-danger) 30%, transparent)',
                color: 'var(--color-danger)',
              }}
            >
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
    <div className="card-neo text-center" style={{ padding: '40px 32px' }}>
      <div
        className="w-16 h-16 mx-auto mb-5 rounded-full flex items-center justify-center"
        style={{
          backgroundColor: 'color-mix(in oklab, var(--color-signal) 12%, transparent)',
          border: '1px solid color-mix(in oklab, var(--color-signal) 30%, transparent)',
        }}
      >
        <MessageCircle size={28} style={{ color: 'var(--color-signal)' }} />
      </div>
      <h2
        className="mb-2"
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 500,
          fontSize: 22,
          letterSpacing: '-0.02em',
          color: 'var(--color-paper-white)',
        }}
      >
        Conecte seu WhatsApp
      </h2>
      <p className="mb-6" style={{ color: 'var(--color-fog)', fontSize: 14 }}>
        Fale com o Savey pelo WhatsApp pra cadastrar transações no ritmo do dia a dia.
        Basta escanear um QR code e criar um grupo pessoal.
      </p>
      <button onClick={onConnect} disabled={connecting} className="btn-primary">
        {connecting ? (
          <><Loader2 size={16} className="animate-spin" /> Iniciando...</>
        ) : (
          <><MessageCircle size={16} /> Conectar meu WhatsApp</>
        )}
      </button>
    </div>
  );
}

function WaitingQrView({ qr, onCancel }: { qr: string | null; onCancel: () => void }) {
  return (
    <div className="card-neo" style={{ padding: 32 }}>
      <div className="flex items-center gap-3 mb-5">
        <Smartphone size={22} style={{ color: 'var(--color-signal)' }} />
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            fontSize: 20,
            letterSpacing: '-0.02em',
            color: 'var(--color-paper-white)',
          }}
        >
          Escaneie o QR code
        </h2>
      </div>

      <ol className="text-sm space-y-1.5 mb-6 list-decimal list-inside" style={{ color: 'var(--color-fog)' }}>
        <li>Abra o WhatsApp no celular</li>
        <li>Vá em <strong style={{ color: 'var(--color-paper-white)' }}>Configurações → Aparelhos conectados</strong></li>
        <li>Toque em <strong style={{ color: 'var(--color-paper-white)' }}>Conectar um aparelho</strong> e aponte a câmera aqui</li>
      </ol>

      <div className="flex justify-center mb-5">
        {qr ? (
          <img
            src={qr}
            alt="QR Code"
            className="w-64 h-64 rounded-2xl"
            style={{ border: '1px solid var(--color-steel-border)', backgroundColor: 'white', padding: 8 }}
          />
        ) : (
          <div
            className="w-64 h-64 flex items-center justify-center rounded-2xl"
            style={{ backgroundColor: 'var(--color-midnight-canvas)', border: '1px solid var(--color-steel-border)' }}
          >
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-signal)' }} />
          </div>
        )}
      </div>

      <p className="text-xs text-center mb-4" style={{ color: 'var(--color-mist)' }}>
        O QR expira em ~30s. Se sumir, um novo aparece automaticamente.
      </p>

      <button onClick={onCancel} className="btn-ghost w-full">
        Cancelar
      </button>
    </div>
  );
}

function PendingGroupView({ onCopyMsg, copiedMsg, onReset }: { onCopyMsg: () => void; copiedMsg: boolean; onReset: () => void }) {
  return (
    <div
      className="card-neo"
      style={{
        padding: 32,
        border: '1px solid color-mix(in oklab, var(--color-signal) 35%, transparent)',
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        <CheckCircle2 size={22} style={{ color: 'var(--color-signal)' }} />
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            fontSize: 20,
            letterSpacing: '-0.02em',
            color: 'var(--color-paper-white)',
          }}
        >
          Conectado! Falta 1 passo
        </h2>
      </div>

      <p className="mb-4" style={{ color: 'var(--color-fog)' }}>
        Pra deixar tudo pronto, crie um <strong style={{ color: 'var(--color-paper-white)' }}>grupo só com você</strong> no WhatsApp e
        mande uma mensagem qualquer nele. A gente detecta e ativa automaticamente.
      </p>

      <div
        className="rounded-2xl p-3 mb-4"
        style={{
          backgroundColor: 'color-mix(in oklab, var(--color-signal) 7%, transparent)',
          border: '1px solid color-mix(in oklab, var(--color-signal) 25%, transparent)',
        }}
      >
        <p className="text-xs" style={{ color: 'var(--color-fog)' }}>
          <strong style={{ color: 'var(--color-signal)' }}>Dica:</strong> O WhatsApp não deixa criar grupo só com você. A saída é:
          criar um grupo com qualquer contato de confiança, entrar nas configurações
          do grupo e <strong style={{ color: 'var(--color-paper-white)' }}>remover essa pessoa</strong>. No fim, sobra só você — e
          é aí que o Savey conecta.
        </p>
      </div>

      <div
        className="rounded-2xl p-4 mb-4 space-y-3"
        style={{
          backgroundColor: 'var(--color-midnight-canvas)',
          border: '1px solid var(--color-steel-border)',
        }}
      >
        <div>
          <p className="label-meta mb-1">Sugestão de nome do grupo</p>
          <p className="text-sm" style={{ color: 'var(--color-paper-white)', fontWeight: 400 }}>
            "Meu Savey" (ou o que preferir)
          </p>
        </div>
        <div>
          <p className="label-meta mb-1">Sugestão de mensagem</p>
          <div className="flex items-center gap-2">
            <p className="text-sm flex-1" style={{ color: 'var(--color-paper-white)', fontWeight: 400 }}>
              {SUGGESTED_MSG}
            </p>
            <button
              onClick={onCopyMsg}
              className="inline-flex items-center gap-1 text-xs"
              style={{ color: 'var(--color-signal)', fontWeight: 500 }}
            >
              <Copy size={12} /> {copiedMsg ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>
      </div>

      <div className="text-xs flex items-center gap-2 mb-4" style={{ color: 'var(--color-mist)' }}>
        <Loader2 size={12} className="animate-spin" />
        Aguardando você mandar a primeira mensagem... (janela de 10 min)
      </div>

      <div className="pt-4" style={{ borderTop: '1px solid var(--color-steel-border)' }}>
        <button
          onClick={onReset}
          className="text-xs transition-colors"
          style={{ color: 'var(--color-mist)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-danger)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-mist)')}
        >
          Travou? Reconectar do zero (novo QR)
        </button>
      </div>
    </div>
  );
}

function GroupTimeoutView({ onRestart, onReset }: { onRestart: () => void; onReset: () => void }) {
  return (
    <div
      className="card-neo"
      style={{
        padding: 32,
        border: '1px solid color-mix(in oklab, var(--color-warning) 35%, transparent)',
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        <XCircle size={22} style={{ color: 'var(--color-warning)' }} />
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            fontSize: 20,
            letterSpacing: '-0.02em',
            color: 'var(--color-paper-white)',
          }}
        >
          Detecção expirou
        </h2>
      </div>

      <p className="mb-6" style={{ color: 'var(--color-fog)' }}>
        A janela de 10 minutos pra detectar o grupo terminou sem receber mensagem.
        Sem stress — clica aqui pra reiniciar a detecção.
      </p>

      <button onClick={onRestart} className="btn-primary mb-4">
        <RefreshCw size={14} /> Reiniciar detecção
      </button>

      <div className="pt-4" style={{ borderTop: '1px solid var(--color-steel-border)' }}>
        <button
          onClick={onReset}
          className="text-xs transition-colors"
          style={{ color: 'var(--color-mist)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-danger)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-mist)')}
        >
          Ou reconectar do zero (novo QR)
        </button>
      </div>
    </div>
  );
}

function ActiveView({ snapshot, onDisconnect, onReset }: { snapshot: BotSessionSnapshot; onDisconnect: () => void; onReset: () => void }) {
  return (
    <div
      className="card-neo"
      style={{
        padding: 32,
        border: '1px solid color-mix(in oklab, var(--color-success) 35%, transparent)',
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        <CheckCircle2 size={22} style={{ color: 'var(--color-success)' }} />
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            fontSize: 20,
            letterSpacing: '-0.02em',
            color: 'var(--color-paper-white)',
          }}
        >
          Bot ativo
        </h2>
      </div>

      <p className="mb-4" style={{ color: 'var(--color-fog)' }}>
        O Savey tá recebendo suas mensagens no grupo:
      </p>

      <div
        className="rounded-2xl p-4 mb-6"
        style={{
          backgroundColor: 'var(--color-midnight-canvas)',
          border: '1px solid var(--color-steel-border)',
        }}
      >
        <p className="label-meta mb-1">Grupo</p>
        <p
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            fontSize: 18,
            color: 'var(--color-paper-white)',
            letterSpacing: '-0.01em',
          }}
        >
          {snapshot.groupName || '(nome não capturado)'}
        </p>
      </div>

      <div className="pt-4 flex flex-col gap-2" style={{ borderTop: '1px solid var(--color-steel-border)' }}>
        <button
          onClick={onReset}
          className="text-xs text-left transition-colors"
          style={{ color: 'var(--color-mist)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-signal)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-mist)')}
        >
          Travou? Reconectar do zero (novo QR)
        </button>
        <button
          onClick={onDisconnect}
          className="text-sm text-left"
          style={{ color: 'var(--color-danger)', fontWeight: 500 }}
        >
          Desconectar WhatsApp
        </button>
      </div>
    </div>
  );
}
