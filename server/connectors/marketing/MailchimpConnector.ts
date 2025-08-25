import { StubConnector } from '../base/StubConnector';
export class MailchimpConnector extends StubConnector {
  constructor(config: any) { super(config, 'mailchimp', 'Mailchimp', 'marketing'); }
}
