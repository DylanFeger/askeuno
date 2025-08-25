import { StubConnector } from '../base/StubConnector';
export class AmplitudeConnector extends StubConnector {
  constructor(config: any) { super(config, 'amplitude', 'Amplitude', 'analytics'); }
}
