import { StubConnector } from '../base/StubConnector';
export class SegmentConnector extends StubConnector {
  constructor(config: any) { super(config, 'segment', 'Segment', 'analytics'); }
}
