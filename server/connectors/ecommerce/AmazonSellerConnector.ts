import { StubConnector } from '../base/StubConnector';
export class AmazonSellerConnector extends StubConnector {
  constructor(config: any) { super(config, 'amazon_seller', 'Amazon Seller', 'ecommerce'); }
}
