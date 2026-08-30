import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import {
  Agent,
  AgentStatus,
  AgentStatusName,
  ChatMessage,
  Enquiry,
  EnquiryApi,
  SenderMessageType,
} from './enquiry-api';
import { mergeMessages, unixTimestamp } from './chat-utils';

@Component({
  selector: 'app-agent-chat',
  imports: [DatePipe],
  styleUrl: './agent-chat.css',
  template: ` <main class="agent-shell">
    <header>
      <div class="brand">M</div>
      <div><strong>Bank</strong><small>Agent workspace</small></div>
      <div class="profile">
        <label
          >Agent profile<span
            class="status-indicator"
            [class.online]="status() === 0"
            [class.busy]="status() === 1"
            [class.offline]="status() === 2"
            aria-hidden="true"
          ></span
          ><select
            [value]="activeAgentId()"
            (change)="selectAgent($any($event.target).value)"
          >
            <option value="">Choose an agent</option>
            @for (agent of agents(); track agent.id) {
              <option [value]="agent.id">
                {{ statusIndicator(agent.status) }}
                {{ agent.agentName }} · {{ agent.activeEnquiriesCount }}/{{ agent.maxCapacity }}
              </option>
            }
          </select></label
        ><label
          >Status<select
            [value]="status()"
            (change)="changeStatus(+$any($event.target).value)"
            [disabled]="!activeAgentId()"
          >
            <option [value]="0">Online</option>
            <option [value]="1">Busy</option>
            <option [value]="2">Offline</option>
          </select></label
        >
      </div>
    </header>
    @if (!activeAgentId()) {
      <section class="empty">
        <h1>Choose your agent profile</h1>
        <p>Your assigned conversations will appear here.</p>
      </section>
    } @else {
      <section class="workspace">
        <nav aria-label="Enquiry chats">
          <div class="nav-title">
            <span>Active enquiries</span><b>{{ enquiries().length }}</b>
          </div>
          @for (enquiry of enquiries(); track enquiry.enquiryId) {
            <button
              [class.active]="activeEnquiryId() === enquiry.enquiryId"
              (click)="activeEnquiryId.set(enquiry.enquiryId)"
            >
              <span class="initial">{{ clientName(enquiry).slice(0, 1) }}</span
              ><span
                ><strong>{{ clientName(enquiry) }}</strong
                ><small>{{ enquiry.messages.at(-1)?.message || 'New enquiry' }}</small></span
              >
            </button>
          } @empty {
            <p class="no-chats">No active enquiries.</p>
          }
        </nav>
        <section class="conversation">
          @if (activeEnquiry(); as enquiry) {
            <div class="conversation-head">
              <div>
                <p>Customer enquiry</p>
                <h1>{{ clientName(enquiry) }}</h1>
              </div>
              <button
                class="close"
                (click)="close(enquiry.enquiryId)"
                [disabled]="closed().includes(enquiry.enquiryId)"
              >
                {{ closed().includes(enquiry.enquiryId) ? 'Closed' : 'Close enquiry' }}
              </button>
            </div>
            <div class="messages">
              @for (message of enquiry.messages; track message.dateTimeCreated + message.message) {
                <article [class]="messageClass(message)">
                  <p>{{ message.message }}</p>
                  @if (message.senderType !== 2) {
                    <small
                      >{{ message.senderName }} ·
                      {{ message.dateTimeCreated | date: 'shortTime' }}</small
                    >
                  }
                </article>
              }
            </div>
            <form class="composer" (submit)="send($event, enquiry.enquiryId)">
              <textarea
                [value]="draft()"
                (input)="draft.set($any($event.target).value)"
                [disabled]="closed().includes(enquiry.enquiryId)"
                [placeholder]="
                  closed().includes(enquiry.enquiryId)
                    ? 'This enquiry is closed'
                    : 'Reply to customer…'
                "
                aria-label="Reply"
                rows="1"
              ></textarea
              ><button
                type="submit"
                [disabled]="!draft().trim() || closed().includes(enquiry.enquiryId)"
              >
                ↑
              </button>
            </form>
          } @else {
            <div class="empty">
              <h1>Select an enquiry</h1>
              <p>Choose a conversation from the sidebar.</p>
            </div>
          }
        </section>
      </section>
    }
    @if (error()) {
      <p class="error">{{ error() }}</p>
    }
  </main>`,
})
export class AgentChat {
  private readonly api = inject(EnquiryApi);
  private readonly destroyRef = inject(DestroyRef);
  readonly agents = signal<Agent[]>([]);
  readonly activeAgentId = signal('');
  readonly status = signal(AgentStatus.Online);
  readonly enquiries = signal<Enquiry[]>([]);
  readonly pollingTimestamp = signal<number | undefined>(undefined);
  readonly activeEnquiryId = signal('');
  readonly draft = signal('');
  readonly closed = signal<string[]>([]);
  readonly error = signal('');
  constructor() {
    this.loadAgents();
    const interval = window.setInterval(() => {
      this.loadAgents();
      this.poll();
    }, 10000);
    this.destroyRef.onDestroy(() => clearInterval(interval));
  }
  loadAgents() {
    this.api
      .getAgents()
      .subscribe({
        next: (agents) => {
          this.agents.set(agents);
          const activeAgent = agents.find((agent) => agent.id === this.activeAgentId());
          if (activeAgent) this.status.set(activeAgent.status);
        },
        error: () => this.error.set('Agent profiles could not be loaded.'),
      });
  }
  activeEnquiry() {
    return this.enquiries().find((e) => e.enquiryId === this.activeEnquiryId());
  }
  selectAgent(id: string) {
    this.activeAgentId.set(id);
    this.enquiries.set([]);
    this.pollingTimestamp.set(undefined);
    this.activeEnquiryId.set('');
    const agent = this.agents().find((a) => a.id === id);
    if (agent) this.status.set(agent.status);
    this.poll();
  }
  changeStatus(status: AgentStatus) {
    const id = this.activeAgentId();
    if (!id) return;
    const statusName: Record<AgentStatus, AgentStatusName> = {
      0: 'Online',
      1: 'Busy',
      2: 'Offline',
    };
    this.status.set(status);
    this.api
      .setAgentStatus({ agentId: id, status: statusName[status] })
      .subscribe({ error: () => this.error.set('Status could not be updated.') });
  }
  poll() {
    const id = this.activeAgentId();
    if (!id) return;
    this.api.getAgentEnquiries({ agentId: id, from: this.pollingTimestamp() }).subscribe({
      next: (r) => {
        this.enquiries.update((current) =>
          r.enquiries.map((next) => {
            const old = current.find((x) => x.enquiryId === next.enquiryId);
            return old ? { ...next, messages: mergeMessages(old.messages, next.messages) } : next;
          }),
        );
        const timestamp = unixTimestamp(r.enquiries.flatMap((enquiry) => enquiry.messages));
        if (timestamp !== undefined) this.pollingTimestamp.set(timestamp);
        if (!this.activeEnquiryId() && r.enquiries[0])
          this.activeEnquiryId.set(r.enquiries[0].enquiryId);
      },
      error: () => {},
    });
  }
  send(event: SubmitEvent, enquiryId: string) {
    event.preventDefault();
    const message = this.draft().trim(),
      messageId = crypto.randomUUID(),
      agent = this.agents().find((a) => a.id === this.activeAgentId());
    if (!message || !agent) return;
    this.api
      .sendMessage({
        enquiryId,
        senderName: agent.agentName,
        senderType: SenderMessageType.Agent,
        messageId,
        message,
      })
      .subscribe({
        next: () => {
          const outgoing: ChatMessage = {
            messageId,
            senderName: agent.agentName,
            senderType: SenderMessageType.Agent,
            message,
            dateTimeCreated: new Date().toISOString(),
          };
          this.enquiries.update((all) =>
            all.map((e) =>
              e.enquiryId === enquiryId ? { ...e, messages: [...e.messages, outgoing] } : e,
            ),
          );
          this.pollingTimestamp.set(unixTimestamp([outgoing]));
          this.draft.set('');
        },
        error: () => this.error.set('Reply could not be sent.'),
      });
  }
  close(enquiryId: string) {
    const agentId = this.activeAgentId();
    this.api
      .closeEnquiry({ enquiryId, agentId })
      .subscribe({
        next: () => this.closed.update((ids) => [...ids, enquiryId]),
        error: () => this.error.set('Enquiry could not be closed.'),
      });
  }
  clientName(enquiry: Enquiry) {
    return (
      enquiry.messages.find((m) => m.senderType === SenderMessageType.Client)?.senderName ||
      'Customer'
    );
  }
  statusIndicator(status: AgentStatus) {
    return status === AgentStatus.Online
      ? '\u{1F7E2}'
      : status === AgentStatus.Busy
        ? '\u{1F534}'
        : '\u{26AA}';
  }
  messageClass(message: ChatMessage) {
    return message.senderType === SenderMessageType.System
      ? 'system-message'
      : message.senderType === SenderMessageType.Agent
        ? 'message outgoing'
        : 'message incoming';
  }
}
