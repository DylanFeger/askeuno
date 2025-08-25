import { StubConnector } from '../base/StubConnector';
export class PipedriveConnector extends StubConnector {
  constructor(config: any) { super(config, 'pipedrive', 'Pipedrive', 'crm'); }
}
