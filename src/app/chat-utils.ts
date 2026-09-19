import { ChatMessage } from './enquiry-api';
import { Enquiry } from './enquiry.models';

export function unixTimestamp(messages: ChatMessage[]): number | undefined { const value = messages.at(-1)?.dateTimeCreated; return value ? Math.floor(new Date(value).getTime() / 1000) : undefined; }
export function mergeMessages(existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const seen = new Set(existing.map(m => m.messageId));
  return [...existing, ...incoming.filter(m => !seen.has(m.messageId))];
}

export function mergeEnquiries(current: Enquiry[], incoming: Enquiry[]): Enquiry[] {
  const byId = new Map(current.map((enquiry) => [enquiry.enquiryId, enquiry]));

  for (const next of incoming) {
    const old = byId.get(next.enquiryId);
    byId.set(
      next.enquiryId,
      old ? { ...next, messages: mergeMessages(old.messages, next.messages) } : next,
    );
  }

  for (const existing of current) {
    if (existing.isClosed && !incoming.some((next) => next.enquiryId === existing.enquiryId)) {
      byId.set(existing.enquiryId, existing);
    }
  }

  return [...byId.values()];
}
