# Architecture Diagram: Nexus Performance Platform

This document contains the Mermaid.js representation of the Nexus architecture. 
**To generate a PDF or Image:** You can view this file natively in GitHub (which renders Mermaid automatically) and take a screenshot, or use a tool like [Mermaid Live Editor](https://mermaid.live/) to export it as a PNG/PDF.

```mermaid
graph TD
    %% User Interfaces
    subgraph "Client Tier (React + Vite)"
        UI_Login[Login / SSO Portal]
        UI_Emp[Employee Dashboard]
        UI_Mgr[Manager Dashboard]
        UI_Admin[Admin Analytics]
    end

    %% Routing & Auth
    UI_Login --> |"SSO / Credentials"| Auth_Layer

    subgraph "Security & Authentication Tier"
        Auth_Layer[Firebase Authentication]
        Entra_ID[Microsoft Entra ID / Azure AD]
        Auth_Layer <--> |"OAuth 2.0"| Entra_ID
    end

    %% State and Logic
    Auth_Layer --> |"JWT Token"| UI_Emp
    Auth_Layer --> |"JWT Token"| UI_Mgr
    Auth_Layer --> |"JWT Token"| UI_Admin

    %% Core Application Logic
    UI_Emp --> |"Submit Goals/Check-ins"| AppLogic
    UI_Mgr --> |"Approve/Reject"| AppLogic
    UI_Admin --> |"Cycle Mgmt/Analytics"| AppLogic

    subgraph "Data & Logic Tier (Firebase)"
        AppLogic[Frontend Services / Firebase SDK]
        Firestore[(Firestore NoSQL DB)]
        
        AppLogic <--> |"Read/Write"| Firestore
    end

    %% Event Triggers and Integrations
    AppLogic --> |"Escalation Rules Trigger"| NotificationEngine

    subgraph "External Integrations Tier"
        NotificationEngine[Notification & Escalation Engine]
        EmailJS[EmailJS API]
        MSTeams[Microsoft Teams Webhook]
        ClaudeAI[Claude AI Insights API]
        
        NotificationEngine --> |"SMTP Payload"| EmailJS
        NotificationEngine --> |"Adaptive Cards"| MSTeams
        UI_Admin <--> |"Fetch Insights"| ClaudeAI
    end

    %% Styling
    classDef primary fill:#5B5FFF,stroke:#fff,stroke-width:2px,color:#fff;
    classDef secondary fill:#00D4AA,stroke:#fff,stroke-width:2px,color:#fff;
    classDef external fill:#FF4757,stroke:#fff,stroke-width:2px,color:#fff;
    classDef db fill:#FFA502,stroke:#fff,stroke-width:2px,color:#fff;

    class UI_Login,UI_Emp,UI_Mgr,UI_Admin primary;
    class Auth_Layer,Entra_ID secondary;
    class EmailJS,MSTeams,ClaudeAI external;
    class Firestore db;
```

### Component Breakdown
1. **Client Tier**: The front-end application built in React. Handles rendering of the dashboards based on RBAC (Role-Based Access Control).
2. **Security Tier**: Firebase Auth acts as the primary gatekeeper, federating identity to Microsoft Entra ID for Enterprise Single Sign-On (SSO).
3. **Data & Logic Tier (Serverless BaaS)**: The system is completely serverless. Instead of hosting a traditional Node.js/Express or Python backend server, the client communicates directly with Cloud Firestore using the Firebase Web SDK. This provides direct-to-database real-time performance, ensures zero server maintenance overhead, and guarantees cost efficiency.
4. **Integration Tier**: The Notification engine broadcasts escalation events out to Email and Microsoft Teams simultaneously.
