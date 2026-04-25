import { extractInboundMessages } from './whatsapp-ingest.service';

describe('extractInboundMessages', () => {
  it('maps text message to inquiry_text', () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    type: 'text',
                    from: '919811223344',
                    text: { body: 'Hello org cabcdefghijklmnopqrs' },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const m = extractInboundMessages(payload);
    expect(m).toHaveLength(1);
    expect(m[0]!.mappedIntent).toBe('inquiry_text');
    expect(m[0]!.messageType).toBe('text');
    expect(m[0]!.fromWaId).toBe('919811223344');
  });

  it('maps button reply', () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    type: 'button',
                    from: '1',
                    button: { payload: 'cta_yes' },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const m = extractInboundMessages(payload);
    expect(m[0]!.mappedIntent).toBe('button_reply');
    expect(m[0]!.buttonPayload).toBe('cta_yes');
  });
});
