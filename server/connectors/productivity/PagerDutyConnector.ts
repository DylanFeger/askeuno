import { StubConnector } from '../base/StubConnector';
export class PagerDutyConnector extends StubConnector {
  constructor(config: any) { super(config, 'pagerduty', 'PagerDuty', 'productivity'); }
}
