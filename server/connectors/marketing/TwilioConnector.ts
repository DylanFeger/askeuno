import { StubConnector } from '../base/StubConnector';
export class TwilioConnector extends StubConnector {
  constructor(config: any) { super(config, 'twilio', 'Twilio', 'marketing'); }
}
