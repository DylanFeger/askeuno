import { StubConnector } from '../base/StubConnector';
export class MicrosoftDynamicsConnector extends StubConnector {
  constructor(config: any) { super(config, 'dynamics', 'Microsoft Dynamics', 'crm'); }
}
