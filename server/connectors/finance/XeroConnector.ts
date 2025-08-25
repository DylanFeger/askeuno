import { StubConnector } from '../base/StubConnector';
export class XeroConnector extends StubConnector {
  constructor(config: any) { super(config, 'xero', 'Xero', 'finance'); }
}
