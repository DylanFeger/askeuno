import { StubConnector } from '../base/StubConnector';
export class ConstantContactConnector extends StubConnector {
  constructor(config: any) { super(config, 'constantcontact', 'Constant Contact', 'marketing'); }
}
