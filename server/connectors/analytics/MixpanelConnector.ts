import { StubConnector } from '../base/StubConnector';
export class MixpanelConnector extends StubConnector {
  constructor(config: any) { super(config, 'mixpanel', 'Mixpanel', 'analytics'); }
}
