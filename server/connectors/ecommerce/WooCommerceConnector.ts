import { StubConnector } from '../base/StubConnector';
export class WooCommerceConnector extends StubConnector {
  constructor(config: any) { super(config, 'woocommerce', 'WooCommerce', 'ecommerce'); }
}
