import { StubConnector } from '../base/StubConnector';
export class DatadogConnector extends StubConnector {
  constructor(config: any) { super(config, 'datadog', 'Datadog', 'analytics'); }
}
