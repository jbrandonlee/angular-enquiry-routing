import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { CloseEnquiryRequest, CloseEnquiryResponse, CreateEnquiryRequest, CreateEnquiryResponse, GetAgentEnquiriesRequest, GetAgentEnquiriesResponse, GetAgentsResponse, GetEnquiryRequest, GetEnquiryResponse, SendEnquiryMessageRequest, SendEnquiryMessageResponse, SetAgentStatusRequest, SetAgentStatusResponse } from './enquiry.models';

export * from './enquiry.models';

@Injectable({ providedIn: 'root' })
export class EnquiryApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://localhost:8081';

  createEnquiry(request: CreateEnquiryRequest) { return this.http.post<CreateEnquiryResponse>(`${this.baseUrl}/enquiries`, request); }
  getEnquiry(request: GetEnquiryRequest) { return this.http.get<GetEnquiryResponse>(`${this.baseUrl}/enquiries/${request.enquiryId}`, { params: request.from === undefined ? undefined : new HttpParams().set('from', request.from) }); }
  sendMessage(request: SendEnquiryMessageRequest) { return this.http.post<SendEnquiryMessageResponse>(`${this.baseUrl}/enquiries/${request.enquiryId}/message`, request); }
  getAgents() { return this.http.get<GetAgentsResponse>(`${this.baseUrl}/agents`); }
  getAgentEnquiries(request: GetAgentEnquiriesRequest) { return this.http.get<GetAgentEnquiriesResponse>(`${this.baseUrl}/agents/${request.agentId}/enquiries`, { params: request.from === undefined ? undefined : new HttpParams().set('from', request.from) }); }
  setAgentStatus(request: SetAgentStatusRequest) { return this.http.put<SetAgentStatusResponse>(`${this.baseUrl}/agents/${request.agentId}/status`, { AgentId: request.agentId, Status: request.status }); }
  closeEnquiry(request: CloseEnquiryRequest) { return this.http.put<CloseEnquiryResponse>(`${this.baseUrl}/enquiries/${request.enquiryId}/close`, { EnquiryId: request.enquiryId, AgentId: request.agentId }); }
}
