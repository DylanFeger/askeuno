import { StubConnector } from '../base/StubConnector';
export class BigCommerceConnector extends StubConnector {
  constructor(config: any) { super(config, 'bigcommerce', 'BigCommerce', 'ecommerce'); }
}
