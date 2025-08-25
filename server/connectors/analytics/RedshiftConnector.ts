import { StubConnector } from '../base/StubConnector';
export class RedshiftConnector extends StubConnector {
  constructor(config: any) { super(config, 'redshift', 'Redshift', 'analytics'); }
}
