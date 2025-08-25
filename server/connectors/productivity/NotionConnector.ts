import { StubConnector } from '../base/StubConnector';
export class NotionConnector extends StubConnector {
  constructor(config: any) { super(config, 'notion', 'Notion', 'productivity'); }
}
