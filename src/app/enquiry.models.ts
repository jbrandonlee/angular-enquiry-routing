export enum SenderMessageType { Agent = 0, Client = 1, System = 2 }
export enum AgentStatus { Online = 0, Busy = 1, Offline = 2 }
export type AgentStatusName = 'Online' | 'Busy' | 'Offline';

export interface ChatMessage { messageId: string; senderName: string; senderType: SenderMessageType; message: string; dateTimeCreated: string; }
export interface Enquiry { enquiryId: string; isClosed: boolean; messages: ChatMessage[]; }
export interface Agent { id: string; agentName: string; status: AgentStatus; activeEnquiriesCount: number; maxCapacity: number; }

export interface CreateEnquiryRequest { clientId: string; languageCode: string; messageId: string; message: string; requiredSkills: string[]; }
export type CreateEnquiryResponse = Enquiry;
export interface GetEnquiryRequest { enquiryId: string; from?: number; }
export type GetEnquiryResponse = Enquiry;
export interface SendEnquiryMessageRequest { enquiryId: string; senderName: string; senderType: SenderMessageType; messageId: string; message: string; }
export type SendEnquiryMessageResponse = void;
export type GetAgentsResponse = Agent[];
export interface GetAgentEnquiriesRequest { agentId: string; from?: number; }
export interface GetAgentEnquiriesResponse { agentName: string; enquiries: Enquiry[]; }
export interface SetAgentStatusRequest { agentId: string; status: AgentStatusName; }
export type SetAgentStatusResponse = void;
export interface CloseEnquiryRequest { enquiryId: string; agentId: string; }
export type CloseEnquiryResponse = void;
