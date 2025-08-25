import { StubConnector } from '../base/StubConnector';
export class SnowflakeConnector extends StubConnector {
  constructor(config: any) { super(config, 'snowflake', 'Snowflake', 'analytics'); }
}
