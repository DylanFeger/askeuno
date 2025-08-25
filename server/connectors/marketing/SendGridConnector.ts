import { StubConnector } from '../base/StubConnector';
export class SendGridConnector extends StubConnector {
  constructor(config: any) { super(config, 'sendgrid', 'SendGrid', 'marketing'); }
}
