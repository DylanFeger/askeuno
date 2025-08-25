import { StubConnector } from '../base/StubConnector';
export class OpsgenieConnector extends StubConnector {
  constructor(config: any) { super(config, 'opsgenie', 'Opsgenie', 'productivity'); }
}
