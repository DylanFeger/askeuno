import { StubConnector } from '../base/StubConnector';
export class ActiveCampaignConnector extends StubConnector {
  constructor(config: any) { super(config, 'activecampaign', 'ActiveCampaign', 'marketing'); }
}
