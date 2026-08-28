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
export async function interpretFatura(
  systemPrompt: string,
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' = 'image/jpeg'
): Promise<FaturaLlmResponse> {
  const started = Date.now();

  const response = await client.messages.create({
    model: config.anthropic.model,
    max_tokens: 4096, // fatura pode ter muitas linhas
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType,
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: 'Extraia todas as compras da fatura conforme as regras. Responda apenas com o JSON.',
          },
        ],
      },
    ],
  });

  const elapsed = Date.now() - started;

  const raw = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();

  logger.info({ elapsed, tokens: response.usage }, 'Resposta LLM (fatura)');
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
