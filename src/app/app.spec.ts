import { describe, expect, it } from 'vitest';
import { mergeEnquiries } from './chat-utils';

describe('AgentChat', () => {
  it('keeps a closed enquiry in the chat list after polling', () => {
    const closedEnquiry = {
      enquiryId: 'enq-1',
      isClosed: true,
      messages: [{
        messageId: 'm-1',
        senderName: 'Client',
        senderType: 1,
        message: 'Need help',
        dateTimeCreated: '2024-01-01T00:00:00.000Z',
      }],
    };

    const merged = mergeEnquiries([closedEnquiry as any], []);

    expect(merged.some((enquiry) => enquiry.enquiryId === 'enq-1')).toBe(true);
  });
});
