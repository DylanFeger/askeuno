import { StubConnector } from '../base/StubConnector';
export class FreshdeskConnector extends StubConnector {
  constructor(config: any) { super(config, 'freshdesk', 'Freshdesk', 'crm'); }
}
