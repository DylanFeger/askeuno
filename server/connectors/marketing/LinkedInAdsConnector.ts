import { StubConnector } from '../base/StubConnector';
export class LinkedInAdsConnector extends StubConnector {
  constructor(config: any) { super(config, 'linkedin_ads', 'LinkedIn Ads', 'marketing'); }
}
