import { StubConnector } from '../base/StubConnector';
export class EbayConnector extends StubConnector {
  constructor(config: any) { super(config, 'ebay', 'eBay', 'ecommerce'); }
}
