import { BaseConnector, ConnectorMetadata, ConnectionConfig } from './base/BaseConnector';

// Import all connectors
import { HubSpotConnector } from './crm/HubSpotConnector';
import { PipedriveConnector } from './crm/PipedriveConnector';
import { GoogleAnalyticsConnector } from './analytics/GoogleAnalyticsConnector';
import { FacebookAdsConnector } from './marketing/FacebookAdsConnector';
import { MailchimpConnector } from './marketing/MailchimpConnector';
import { WooCommerceConnector } from './ecommerce/WooCommerceConnector';
import { XeroConnector } from './finance/XeroConnector';
import { MixpanelConnector } from './analytics/MixpanelConnector';
import { InstagramConnector } from './marketing/InstagramConnector';
import { LinkedInAdsConnector } from './marketing/LinkedInAdsConnector';
import { TwitterAdsConnector } from './marketing/TwitterAdsConnector';
import { AmazonSellerConnector } from './ecommerce/AmazonSellerConnector';
import { EbayConnector } from './ecommerce/EbayConnector';
import { BigCommerceConnector } from './ecommerce/BigCommerceConnector';
import { NetSuiteConnector } from './finance/NetSuiteConnector';
import { FreshBooksConnector } from './finance/FreshBooksConnector';
import { ZohoCRMConnector } from './crm/ZohoCRMConnector';
import { MicrosoftDynamicsConnector } from './crm/MicrosoftDynamicsConnector';
import { SlackConnector } from './productivity/SlackConnector';
import { TrelloConnector } from './productivity/TrelloConnector';
import { AsanaConnector } from './productivity/AsanaConnector';
import { JiraConnector } from './productivity/JiraConnector';
import { SegmentConnector } from './analytics/SegmentConnector';
import { AmplitudeConnector } from './analytics/AmplitudeConnector';
import { SendGridConnector } from './marketing/SendGridConnector';
import { KlaviyoConnector } from './marketing/KlaviyoConnector';
import { ActiveCampaignConnector } from './marketing/ActiveCampaignConnector';
import { ConstantContactConnector } from './marketing/ConstantContactConnector';
import { TwilioConnector } from './marketing/TwilioConnector';
import { IntercomConnector } from './crm/IntercomConnector';
import { ZendeskConnector } from './crm/ZendeskConnector';
import { FreshdeskConnector } from './crm/FreshdeskConnector';
import { ClickUpConnector } from './productivity/ClickUpConnector';
import { MondayConnector } from './productivity/MondayConnector';
import { NotionConnector } from './productivity/NotionConnector';
import { AirtableConnector } from './productivity/AirtableConnector';
import { GitHubConnector } from './productivity/GitHubConnector';
import { GitLabConnector } from './productivity/GitLabConnector';
import { BitbucketConnector } from './productivity/BitbucketConnector';
import { SnowflakeConnector } from './analytics/SnowflakeConnector';
import { BigQueryConnector } from './analytics/BigQueryConnector';
import { RedshiftConnector } from './analytics/RedshiftConnector';
import { DatadogConnector } from './analytics/DatadogConnector';
import { NewRelicConnector } from './analytics/NewRelicConnector';
import { SentryConnector } from './analytics/SentryConnector';
import { PagerDutyConnector } from './productivity/PagerDutyConnector';
import { OpsgenieConnector } from './productivity/OpsgenieConnector';

// Connector registry - maps connector IDs to their implementations
export const connectorRegistry: Record<string, typeof BaseConnector> = {
  // CRM
  'hubspot': HubSpotConnector,
  'pipedrive': PipedriveConnector,
  'zoho_crm': ZohoCRMConnector,
  'dynamics': MicrosoftDynamicsConnector,
  'intercom': IntercomConnector,
  'zendesk': ZendeskConnector,
  'freshdesk': FreshdeskConnector,
  
  // Marketing
  'facebook_ads': FacebookAdsConnector,
  'instagram': InstagramConnector,
  'linkedin_ads': LinkedInAdsConnector,
  'twitter_ads': TwitterAdsConnector,
  'mailchimp': MailchimpConnector,
  'sendgrid': SendGridConnector,
  'klaviyo': KlaviyoConnector,
  'activecampaign': ActiveCampaignConnector,
  'constantcontact': ConstantContactConnector,
  'twilio': TwilioConnector,
  
  // E-commerce
  'woocommerce': WooCommerceConnector,
  'amazon_seller': AmazonSellerConnector,
  'ebay': EbayConnector,
  'bigcommerce': BigCommerceConnector,
  
  // Finance/Accounting
  'xero': XeroConnector,
  'netsuite': NetSuiteConnector,
  'freshbooks': FreshBooksConnector,
  
  // Analytics
  'google_analytics': GoogleAnalyticsConnector,
  'mixpanel': MixpanelConnector,
  'segment': SegmentConnector,
  'amplitude': AmplitudeConnector,
  'snowflake': SnowflakeConnector,
  'bigquery': BigQueryConnector,
  'redshift': RedshiftConnector,
  'datadog': DatadogConnector,
  'newrelic': NewRelicConnector,
  'sentry': SentryConnector,
  
  // Productivity
  'slack': SlackConnector,
  'trello': TrelloConnector,
  'asana': AsanaConnector,
  'jira': JiraConnector,
  'clickup': ClickUpConnector,
  'monday': MondayConnector,
  'notion': NotionConnector,
  'airtable': AirtableConnector,
  'github': GitHubConnector,
  'gitlab': GitLabConnector,
  'bitbucket': BitbucketConnector,
  'pagerduty': PagerDutyConnector,
  'opsgenie': OpsgenieConnector,
};

/**
 * Get all available connector metadata
 */
export function getAllConnectorMetadata(): ConnectorMetadata[] {
  return Object.entries(connectorRegistry).map(([id, ConnectorClass]) => {
    // Create a temporary instance to get metadata
    const tempInstance = new (ConnectorClass as any)({});
    return tempInstance.getMetadata();
  });
}

/**
 * Create a connector instance
 */
export function createConnector(
  connectorId: string, 
  config: ConnectionConfig
): BaseConnector {
  const ConnectorClass = connectorRegistry[connectorId];
  
  if (!ConnectorClass) {
    throw new Error(`Unknown connector: ${connectorId}`);
  }
  
  return new (ConnectorClass as any)(config);
}

/**
 * Get connector metadata by ID
 */
export function getConnectorMetadata(connectorId: string): ConnectorMetadata | null {
  const ConnectorClass = connectorRegistry[connectorId];
  
  if (!ConnectorClass) {
    return null;
  }
  
  const tempInstance = new (ConnectorClass as any)({});
  return tempInstance.getMetadata();
}