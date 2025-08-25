import { StubConnector } from '../base/StubConnector';
export class AsanaConnector extends StubConnector {
  constructor(config: any) { super(config, 'asana', 'Asana', 'productivity'); }
}
