import { StubConnector } from '../base/StubConnector';
export class SentryConnector extends StubConnector {
  constructor(config: any) { super(config, 'sentry', 'Sentry', 'analytics'); }
}
