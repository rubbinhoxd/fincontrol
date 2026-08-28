import Anthropic from '@anthropic-ai/sdk';
import pino from 'pino';
import { config } from './config.js';
import { LlmResponse } from './types.js';

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

function extractJson(text: string): string {
  // Se veio em bloco de codigo, tira as crases
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  return text;
}
