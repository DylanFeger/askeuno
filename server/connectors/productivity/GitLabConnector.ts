import { StubConnector } from '../base/StubConnector';
export class GitLabConnector extends StubConnector {
  constructor(config: any) { super(config, 'gitlab', 'GitLab', 'productivity'); }
}
