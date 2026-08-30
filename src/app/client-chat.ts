import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EnquiryApi, SenderMessageType, ChatMessage } from './enquiry-api';
import { mergeMessages, unixTimestamp } from './chat-utils';

@Component({
  selector: 'app-client-chat',
  imports: [DatePipe, RouterLink],
  styleUrl: './client-chat.css',
  template: ` <main class="client-shell">
    <header>
      <a routerLink="/client" aria-label="Bank home" (click)="onHomeClick()">M</a>
      <div><strong>Bank</strong><small>Customer support</small></div>
    </header>
    <section class="chat-card">
      <div class="chat-title">
        <div>
          <p>Customer care</p>
          <h1>How can we help?</h1>
        </div>
        <span class="online">● Support online</span>
      </div>
      <div class="messages" aria-live="polite">
        @if (!enquiryId()) {
          <div class="welcome">
            <div class="avatar">M</div>
            <h2>Welcome to customer support</h2>
            <p>Select up to two topics and your preferred language to get started.</p>
          </div>
        }
        @for (message of messages(); track message.dateTimeCreated + message.message) {
          <article [class]="messageClass(message)">
            <p>{{ message.message }}</p>
            @if (message.senderType !== 2) {
              <small
                >{{ message.senderName }} · {{ message.dateTimeCreated | date: 'shortTime' }}</small
              >
            }
          </article>
        }
      </div>
      @if (!enquiryId()) {
        <section class="onboarding">
          <div>
            <label>What do you need help with? <em>Choose up to 2</em></label>
            <div class="chips">
              @for (topic of topics; track topic) {
                <button
                  type="button"
                  [class.selected]="selectedTopics().includes(topic)"
                  (click)="toggleTopic(topic)"
                >
                  {{ topic }}
                </button>
              }
            </div>
          </div>
          <label>Preferred language</label>
          <div class="languages">
            @for (option of languages; track option.code) {
              <button
                type="button"
                [class.selected]="language() === option.code"
                (click)="language.set(option.code)"
              >
                {{ option.label }}
              </button>
            }
          </div>
        </section>
      }
      <form class="composer" (submit)="send($event)">
        <textarea
          [value]="draft()"
          (input)="draft.set($any($event.target).value)"
          [placeholder]="
            isClosed() ? 'This enquiry has been closed.' :
            enquiryId() ? 'Write a message…' :
            'Tell us a little more about your enquiry…'
          "
          aria-label="Message"
          rows="1"
          [disabled]="isClosed()"
        ></textarea
        ><button type="submit" [disabled]="!canSend() || sending() || isClosed()" aria-label="Send message">
          ↑
        </button>
      </form>
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }
    </section>
  </main>`,
})
export class ClientChat {
  readonly topics = [
    'Credit Cards',
    'Bank Accounts',
    'Login & Access',
    'Fraud & Security',
    'Payments & Transfers',
    'Loans',
    'Fees & Charges',
    'Statements & Documents',
  ];
  readonly languages = [
    { code: 'EN', label: 'English (EN)' },
    { code: 'ZH', label: 'Chinese (ZH)' },
    { code: 'MS', label: 'Malay (MS)' },
    { code: 'JP', label: 'Japanese (JP)' },
    { code: 'KO', label: 'Korean (KO)' },
  ];
  private readonly api = inject(EnquiryApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly clientId = this.getOrCreateClientId();
  readonly selectedTopics = signal<string[]>([]);
  readonly language = signal('EN');
  readonly draft = signal('');
  readonly messages = signal<ChatMessage[]>([]);
  readonly pollingTimestamp = signal<number | undefined>(undefined);
  readonly error = signal('');
  readonly sending = signal(false);
  readonly isClosed = signal(false);
  readonly enquiryId = signal(sessionStorage.getItem('enquiryId'));
  constructor() {
    this.poll();
    const id = window.setInterval(() => this.poll(), 10_000);
    this.destroyRef.onDestroy(() => clearInterval(id));
  }
  onHomeClick() {
    sessionStorage.removeItem('enquiryId');
    this.enquiryId.set(null);
    this.selectedTopics.set([]);
    this.language.set('EN');
    this.messages.set([]);
    this.pollingTimestamp.set(undefined);
    this.draft.set('');
    this.isClosed.set(false);
  }
  canSend() {
    return !!this.draft().trim() && (this.enquiryId() !== null || this.selectedTopics().length > 0);
  }
  toggleTopic(topic: string) {
    const current = this.selectedTopics();
    this.selectedTopics.set(
      current.includes(topic)
        ? current.filter((x) => x !== topic)
        : current.length < 2
          ? [...current, topic]
          : current,
    );
  }
  send(event: SubmitEvent) {
    event.preventDefault();
    if (!this.canSend() || this.sending() || this.isClosed()) return;
    const text = this.draft().trim();
    const messageId = crypto.randomUUID();
    this.sending.set(true);
    this.error.set('');
    const id = this.enquiryId();
    if (id)
      this.api
        .sendMessage({
          enquiryId: id,
          senderName: 'Client',
          senderType: SenderMessageType.Client,
          messageId,
          message: text,
        })
        .subscribe({
          next: () => {
            const outgoing = this.localMessage(messageId, text);
            this.messages.update((m) => [...m, outgoing]);
            this.pollingTimestamp.set(unixTimestamp([outgoing]));
            this.draft.set('');
            this.sending.set(false);
          },
          error: () => this.fail('Message could not be sent.'),
        });
    else
      this.api
        .createEnquiry({
          clientId: this.clientId,
          languageCode: this.language(),
          messageId,
          message: text,
          requiredSkills: this.selectedTopics(),
        })
        .subscribe({
          next: (response) => {
            this.enquiryId.set(response.enquiryId);
            sessionStorage.setItem('enquiryId', response.enquiryId);
            this.messages.set(response.messages);
            this.pollingTimestamp.set(unixTimestamp(response.messages));
            this.draft.set('');
            this.sending.set(false);
          },
          error: () => this.fail('Your enquiry could not be created. Please try again.'),
        });
  }
  poll() {
    const id = this.enquiryId();
    if (!id) return;
    this.api.getEnquiry({ enquiryId: id, from: this.pollingTimestamp() }).subscribe({
      next: (r) => {
        this.messages.update((m) => mergeMessages(m, r.messages));
        const timestamp = unixTimestamp(r.messages);
        if (timestamp !== undefined) this.pollingTimestamp.set(timestamp);
        this.isClosed.set(r.isClosed);
      },
      error: () => {},
    });
  }
  messageClass(message: ChatMessage) {
    return message.senderType === SenderMessageType.System
      ? 'system-message'
      : message.senderType === SenderMessageType.Client
        ? 'message outgoing'
        : 'message incoming';
  }
  private localMessage(messageId: string, message: string): ChatMessage {
    return {
      messageId,
      senderName: 'Client',
      senderType: SenderMessageType.Client,
      message,
      dateTimeCreated: new Date().toISOString(),
    };
  }
  private getOrCreateClientId() {
    const current = sessionStorage.getItem('clientId');
    if (current) return current;
    const clientId = crypto.randomUUID();
    sessionStorage.setItem('clientId', clientId);
    return clientId;
  }
  private fail(message: string) {
    this.error.set(message);
    this.sending.set(false);
  }
}
