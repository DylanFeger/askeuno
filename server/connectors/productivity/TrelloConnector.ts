import { StubConnector } from '../base/StubConnector';
export class TrelloConnector extends StubConnector {
  constructor(config: any) { super(config, 'trello', 'Trello', 'productivity'); }
}
