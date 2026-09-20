/angular-developer

# Overview

The web application is a customer enquiry chat application for a bank. It consists of two pages both with a similar chat interface, one for use by the client to raise enquiries, one for use by the human agent to answer enquiries. The url routes are /client and /agent respectively.

## Chat Interface

Each chat interface has a scrollable conversation history, and a chat box at the bottom with a send button. There are three types of chat messages to display, defined by their SenderType which can either be Client, System, or Agent. Client or Agent messages are to be displayed on the left or right, with messages sent by the user on the right and messages received from others on the left. For example, for the client chat page, all `SenderMessageType.Client` messages are on the right in chat bubbles, while `SenderMessageType.Agent` messages are displayed on the left in chat bubbles. `SenderMessageType.System` messages are displayed in a smaller font in the middle without using chat bubbles.


# Client Page
On the client chat page with a light-mode color scheme, the user is first prompted to select what topics they need help with within the chat box. The customer should be allowed to pick up to two categories out of the following list: Credit Cards, Bank Accounts, Login & Access, Fraud & Security, Payments & Transfers, Loans, Fees & Charges, Statements & Documents. They must also pick one preferred language out of the following list: English (EN), Chinese (ZH), Malay (MS), Japanese (JP), Korean (KO). After picking the categories, they can then write an initial message in a chat box to describe their enquiry.

When the client successfully creates an enquiry, the categories and language is sent to `POST /enquiries` with the initial message, receiving an enquiryId back in response. The enquiryId is saved to the browser local storage, and used in subsequent requests.

Further messages are then posted to `POST /enquiries/{enquiryId}/message`. From then on, the client polls the `GET /enquiries/{enquiryId}?from={unixtimestamp}` every 10 seconds to retrieve new messages, which are then appended to the chat interface.

## Client Page APIs

Endpoint: `POST /enquiries`
Description: Creates a new enquiry with the selected topics and initial message.

Request:
```json
{
    "clientId": "c1c3e734-b72f-41ae-9f85-a4994d2d4a71",
    "languageCode": "EN",
    "messageId": "fa6bc2ce-6b51-4d42-b390-6084241be1c4",
    "message": "Help, I forgot my PIN.",
    "requiredSkills": ["Bank Accounts","Login & Access"]
}
```

Response:
```json
{
    "enquiryId": "1d692705-66cc-40fc-8e52-aa9faaf039f5",
    "isClosed": false,
    "dateTimeCreated": "2026-09-19T08:54:26.5998643+00:00",
    "messages": [
        {
            "senderName": "Client",
            "senderType": 1,
            "messageId": "fa6bc2ce-6b51-4d42-b390-6084241be1c4",
            "message": "Help, I forgot my PIN.",
            "dateTimeCreated": "2026-09-19T08:54:26.5998604+00:00"
        },
        {
            "senderName": "System",
            "senderType": 2,
            "messageId": "d3b2c9e3-ec13-4b46-87d5-1825d6e93480",
            "message": "Agent Alex has been added to the chat.",
            "dateTimeCreated": "2026-09-19T08:54:26.8067972+00:00"
        }
    ]
}
```

Endpoint: `POST /enquiries/{enquiryId}/message`
Description: Sends a new message to the enquiry chat.

Request:
```json
{
    "enquiryId": "1d692705-66cc-40fc-8e52-aa9faaf039f5",
    "senderName": "Client",
    "senderType": 1,
    "messageId": "2838779b-c310-4913-aab7-1516f1f66c83",
    "message": "Thank you!"
}
```

Endpoint: `GET /enquiries/{enquiryId}?from={unixtimestamp}`
Description: Gets a list of new messages for the specified enquiry, from the provided timestamp parameter. These messages are appended to the respective enquiry chats.

Response:
```json
{
    "enquiryId": "1d692705-66cc-40fc-8e52-aa9faaf039f5",
    "isClosed": true,
    "dateTimeCreated": "2026-09-19T08:54:26.599864+00:00",
    "messages": [
        {
            "senderName": "Client",
            "senderType": 1,
            "messageId": "fa6bc2ce-6b51-4d42-b390-6084241be1c4",
            "message": "Help, I forgot my PIN.",
            "dateTimeCreated": "2026-09-19T08:54:26.59986+00:00"
        },
        {
            "senderName": "System",
            "senderType": 2,
            "messageId": "d3b2c9e3-ec13-4b46-87d5-1825d6e93480",
            "message": "Agent Alex has been added to the chat.",
            "dateTimeCreated": "2026-09-19T08:54:26.806797+00:00"
        },
        {
            "senderName": "Alex",
            "senderType": 0,
            "messageId": "86e0fa06-a56a-4fad-b6b0-a7efc4f9b53b",
            "message": "Please proceed to reset your password using SingPass.",
            "dateTimeCreated": "2026-09-19T08:58:00.132872+00:00"
        },
        {
            "senderName": "Client",
            "senderType": 1,
            "messageId": "2838779b-c310-4913-aab7-1516f1f66c83",
            "message": "Thank you!",
            "dateTimeCreated": "2026-09-19T08:58:10.785413+00:00"
        },
        {
            "senderName": "System",
            "senderType": 2,
            "messageId": "714942ae-aa82-482a-9c4d-a2d996f93e46",
            "message": "The chat is now closed.",
            "dateTimeCreated": "2026-09-19T09:06:33.092498+00:00"
        }
    ]
}
```


# Agent Page

The agent chat interface is similar to the client chat interface, but has a dark-mode color scheme and has tabs to toggle between multiple enquiry chats.

On loading the agent chat page, the system calls `GET /agents` to retrieve a list of Agent Details. These are used to populate a dropdown selection at the top of the page to set the active agent for the session. 

Upon selecting an active agent profile, the page polls the `GET /agents/{agentId}/enquiries?from={unixtimestamp}` endpoint every 10 seconds to retrieve new messages for all the agent's active enquiries. On selecting a profile, this query is sent without the timestamp parameter to retrieve all messages. Otherwise, this query is sent with the timestamp of the latest received message. New messages retrieved from this endpoint is appended to the respective chats.

Messages are posted to the same `POST /enquiries/{enquiryId}/message` endpoint. The agent can also close enquiries via a button on each enquiry tab. This sends a message to `PUT /enquiries/{enquiryId}/close`. When an enquiry is closed, the chat box is now disabled, but the chat history is still scrollable.

The agent can also set their status to an enum value (Online = 0, Busy = 1, Offline = 2) via another dropdown. Updating this sends a message to `PUT /agents/{agentId}/status`.


## Agent Page APIs

Endpoint: `GET /agents`
Description: Populates a dropdown selection menu at the top of the page with the agent name, current active enquiries, max capacity, and status.

Response:
```json
[
    {
        "id": "e7a0783e-1715-44d5-9ae3-61eff3523195",
        "agentName": "Alex",
        "status": 2,
        "activeEnquiriesCount": 0,
        "maxCapacity": 3
    },
    {
        "id": "30494c07-4399-4518-9294-ddcd1bd69050",
        "agentName": "Bob",
        "status": 0,
        "activeEnquiriesCount": 1,
        "maxCapacity": 2
    }
]
```

Endpoint: `GET /agents/{agentId}/enquiries?from={unixtimestamp}`
Description: Gets a list of new messages for each active enquiry, from the provided timestamp parameter. These messages are appended to the respective enquiry chats.

Response:
```json
{
    "agentName": "Alex",
    "enquiries": [
        {
            "enquiryId": "1d692705-66cc-40fc-8e52-aa9faaf039f5",
            "isClosed": false,
            "dateTimeCreated": "2026-09-19T08:54:26.599864+00:00",
            "messages": [
                {
                    "senderName": "Client",
                    "senderType": 1,
                    "messageId": "fa6bc2ce-6b51-4d42-b390-6084241be1c4",
                    "message": "Help, I forgot my PIN.",
                    "dateTimeCreated": "2026-09-19T08:54:26.59986+00:00"
                },
                {
                    "senderName": "System",
                    "senderType": 2,
                    "messageId": "d3b2c9e3-ec13-4b46-87d5-1825d6e93480",
                    "message": "Agent Alex has been added to the chat.",
                    "dateTimeCreated": "2026-09-19T08:54:26.806797+00:00"
                },
                {
                    "senderName": "Alex",
                    "senderType": 0,
                    "messageId": "86e0fa06-a56a-4fad-b6b0-a7efc4f9b53b",
                    "message": "Please proceed to reset your password using SingPass.",
                    "dateTimeCreated": "2026-09-19T08:58:00.132872+00:00"
                }
            ]
        }
    ]
}
```

Endpoint: `PUT /agents/{agentId}/status`
Description: Sets the current selected agent's status.

Request:
```json
{
    "agentId": "e7a0783e-1715-44d5-9ae3-61eff3523195",
    "status": "Online"
}
```

Endpoint: `POST /enquiries/{enquiryId}/message`
Description: Sends a new message to the enquiry chat.

Request:
```json
{
    "enquiryId": "1d692705-66cc-40fc-8e52-aa9faaf039f5",
    "senderName": "Alex",
    "senderType": 0,
    "messageId": "86e0fa06-a56a-4fad-b6b0-a7efc4f9b53b",
    "message": "Please proceed to reset your password using SingPass."
}
```

Endpoint: `PUT /enquiries/{enquiryId}/close`
Description: Sets the current enquiry's state to closed.

Request:
```json
{
    "enquiryId": "1d692705-66cc-40fc-8e52-aa9faaf039f5",
    "agentId": "e7a0783e-1715-44d5-9ae3-61eff3523195"
}
```
