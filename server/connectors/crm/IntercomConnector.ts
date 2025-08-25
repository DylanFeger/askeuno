import { StubConnector } from '../base/StubConnector';
export class IntercomConnector extends StubConnector {
  constructor(config: any) { super(config, 'intercom', 'Intercom', 'crm'); }
}
