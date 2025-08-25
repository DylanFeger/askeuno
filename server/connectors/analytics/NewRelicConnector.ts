import { StubConnector } from '../base/StubConnector';
export class NewRelicConnector extends StubConnector {
  constructor(config: any) { super(config, 'newrelic', 'New Relic', 'analytics'); }
}
