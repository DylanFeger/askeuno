import { StubConnector } from '../base/StubConnector';
export class KlaviyoConnector extends StubConnector {
  constructor(config: any) { super(config, 'klaviyo', 'Klaviyo', 'marketing'); }
}
