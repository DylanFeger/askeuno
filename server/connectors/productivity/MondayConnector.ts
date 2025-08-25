import { StubConnector } from '../base/StubConnector';
export class MondayConnector extends StubConnector {
  constructor(config: any) { super(config, 'monday', 'Monday.com', 'productivity'); }
}
