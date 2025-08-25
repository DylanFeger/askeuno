import { StubConnector } from '../base/StubConnector';
export class BitbucketConnector extends StubConnector {
  constructor(config: any) { super(config, 'bitbucket', 'Bitbucket', 'productivity'); }
}
