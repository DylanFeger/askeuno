import { StubConnector } from '../base/StubConnector';
export class NetSuiteConnector extends StubConnector {
  constructor(config: any) { super(config, 'netsuite', 'NetSuite', 'finance'); }
}
