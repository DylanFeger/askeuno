import { StubConnector } from '../base/StubConnector';
export class ZohoCRMConnector extends StubConnector {
  constructor(config: any) { super(config, 'zoho_crm', 'Zoho CRM', 'crm'); }
}
