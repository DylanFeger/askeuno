import { StubConnector } from '../base/StubConnector';
export class ZendeskConnector extends StubConnector {
  constructor(config: any) { super(config, 'zendesk', 'Zendesk', 'crm'); }
}
