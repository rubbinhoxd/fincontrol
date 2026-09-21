import Anthropic from '@anthropic-ai/sdk';
import pino from 'pino';
import { config } from './config.js';
import { FaturaLlmResponse, LlmResponse } from './types.js';

const logger = pino({ level: config.logLevel }).child({ mod: 'llm' });

const client = new Anthropic({ apiKey: config.anthropic.apiKey });

/**
 * Chama o Claude Haiku com o system prompt e a mensagem do usuario.
 * Retorna o objeto ja parseado (JSON). Lanca em caso de falha.
 */
export async function interpret(systemPrompt: string, userMessage: string): Promise<LlmResponse> {
  const started = Date.now();

  const response = await client.messages.create({
    model: config.anthropic.model,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const elapsed = Date.now() - started;

  // Junta todos os blocos de texto da resposta
  const raw = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();

  logger.debug({ elapsed, tokens: response.usage, raw }, 'Resposta do LLM');

  // Extrai o JSON — o modelo as vezes envolve em ```json...```
  const jsonText = extractJson(raw);

  let parsed: LlmResponse;
  try {
    parsed = JSON.parse(jsonText) as LlmResponse;
  } catch (err) {
    logger.error({ raw }, 'JSON invalido do LLM');
    throw new Error('LLM devolveu JSON invalido');
  }

  return parsed;
}

/**
 * Chama Claude Haiku em modo VISION com uma imagem de fatura.
 * A imagem vai como bloco `image` base64. Retorna o array de transacoes ja parseado.
 */
export interface FaturaImage {
  base64: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
}

export async function interpretFatura(
  systemPrompt: string,
  imagesInput: string | FaturaImage[],
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' = 'image/jpeg'
): Promise<FaturaLlmResponse> {
  // Backward-compatible: aceita 1 imagem como string (assinatura antiga) OU array de imagens
  const images: FaturaImage[] = typeof imagesInput === 'string'
    ? [{ base64: imagesInput, mimeType }]
    : imagesInput;

  const started = Date.now();

  const content: Anthropic.MessageParam['content'] = images.map((img) => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: img.mimeType,
      data: img.base64,
    },
  }));

  const instructionText = images.length === 1
    ? 'Extraia todas as compras da fatura conforme as regras. Responda apenas com o JSON.'
    : `Voce recebeu ${images.length} imagens de fatura (podem ser prints do mesmo documento ou de partes diferentes). Extraia TODAS as transacoes UNICAS — se a mesma transacao aparecer em mais de uma imagem, cadastre uma so vez. Responda apenas com o JSON.`;

  content.push({ type: 'text', text: instructionText });

  const response = await client.messages.create({
    model: config.anthropic.model,
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: 'user', content }],
  });

  const elapsed = Date.now() - started;

  const raw = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();

  logger.info({ elapsed, tokens: response.usage, imageCount: images.length }, 'Resposta LLM (fatura)');
  logger.debug({ raw }, 'Raw LLM output (fatura)');

  const jsonText = extractJson(raw);

  let parsed: FaturaLlmResponse;
  try {
    parsed = JSON.parse(jsonText) as FaturaLlmResponse;
  } catch (err) {
    logger.error({ raw }, 'JSON invalido do LLM (fatura)');
    throw new Error('LLM devolveu JSON invalido para a fatura');
  }

  return parsed;
}

function extractJson(text: string): string {
  // Se veio em bloco de codigo, tira as crases
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  return text;
}
