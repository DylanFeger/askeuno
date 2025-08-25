import { StubConnector } from '../base/StubConnector';
export class JiraConnector extends StubConnector {
  constructor(config: any) { super(config, 'jira', 'Jira', 'productivity'); }
}
