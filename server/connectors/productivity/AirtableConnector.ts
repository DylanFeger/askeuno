import { StubConnector } from '../base/StubConnector';
export class AirtableConnector extends StubConnector {
  constructor(config: any) { super(config, 'airtable', 'Airtable', 'productivity'); }
}
