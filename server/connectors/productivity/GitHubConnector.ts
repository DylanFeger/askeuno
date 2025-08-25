import { StubConnector } from '../base/StubConnector';
export class GitHubConnector extends StubConnector {
  constructor(config: any) { super(config, 'github', 'GitHub', 'productivity'); }
}
