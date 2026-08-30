import { ChatMessage } from './enquiry-api';

export function unixTimestamp(messages: ChatMessage[]): number | undefined { const value = messages.at(-1)?.dateTimeCreated; return value ? Math.floor(new Date(value).getTime() / 1000) : undefined; }
export function mergeMessages(existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const seen = new Set(existing.map(m => m.messageId));
  return [...existing, ...incoming.filter(m => !seen.has(m.messageId))];
}
