import { StubConnector } from '../base/StubConnector';
export class BigQueryConnector extends StubConnector {
  constructor(config: any) { super(config, 'bigquery', 'BigQuery', 'analytics'); }
}
