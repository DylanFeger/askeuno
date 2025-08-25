import { StubConnector } from '../base/StubConnector';
export class FreshBooksConnector extends StubConnector {
  constructor(config: any) { super(config, 'freshbooks', 'FreshBooks', 'finance'); }
}
