import { StubConnector } from '../base/StubConnector';
export class TwitterAdsConnector extends StubConnector {
  constructor(config: any) { super(config, 'twitter_ads', 'Twitter Ads', 'marketing'); }
}
