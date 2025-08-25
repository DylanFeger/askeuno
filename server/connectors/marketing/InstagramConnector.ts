import { StubConnector } from '../base/StubConnector';
export class InstagramConnector extends StubConnector {
  constructor(config: any) { super(config, 'instagram', 'Instagram', 'marketing'); }
}
