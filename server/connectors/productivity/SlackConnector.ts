import { StubConnector } from '../base/StubConnector';
export class SlackConnector extends StubConnector {
  constructor(config: any) { super(config, 'slack', 'Slack', 'productivity'); }
}
