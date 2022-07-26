import { OktaResource } from '.';

export interface OktaLogEvent extends OktaResource {
  actor: OktaLogActor;
  displayMessage: string;
  eventType: string;
  legacyEventType?: string;
  published: string;
  uuid: string;
  version: string;
  debugContext: OktaDebugContext;
  target: [LogTarget: OktaLogTarget];
}

export interface OktaLogActor {
  id: string;
  type: string;
  alternateId: string;
  displayName: string;
  detailEntry?: string;
}

export interface OktaDebugContext {
  debugData: {
    requestId: string;
    dtHash: string;
    requestUri: string;
    url: string;
  };
}

export interface OktaLogTarget {
  id: string;
  type: string;
  alternateId: string;
  displayName: string;
  detailEntry?: string;
}
