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
        UI_Admin[Admin Analytics & Completion Dashboard]
        SetupScript[Setup & Seeding Engine]
    end

    %% Routing & Auth
    UI_Login --> |"SSO / Credentials"| Auth_Layer

    subgraph "Security & Authentication Tier"
        Auth_Layer[Firebase Authentication]
        Entra_ID[Microsoft Entra ID / Azure AD]
        APIKeyStorage[localStorage API Key Injection]
        Auth_Layer <--> |"OAuth 2.0"| Entra_ID
    end

    %% State and Logic
    Auth_Layer --> |"JWT Token"| UI_Emp
    Auth_Layer --> |"JWT Token"| UI_Mgr
    Auth_Layer --> |"JWT Token"| UI_Admin

    %% Core Application Logic
    UI_Emp --> |"Submit Goals/Check-ins"| AppLogic
    UI_Mgr --> |"Approve/Return (writes to Audit Log)"| AppLogic
    UI_Admin --> |"Cycle Mgmt / Demo Time Machine"| AppLogic
    SetupScript --> |"Pre-seeds users, goals, check-ins, audits"| AppLogic

    subgraph "Data & Logic Tier (Firebase)"
        AppLogic[Frontend Services / Firebase SDK]
        FirestoreSec[Firestore Security Rules RBAC]
        Firestore[(Firestore NoSQL DB)]
        
        AppLogic <--> |"Validates via"| FirestoreSec
        FirestoreSec <--> |"Read/Write"| Firestore
    end

    %% Event Triggers and Integrations
    AppLogic --> |"Escalation Rules Trigger"| NotificationEngine

    subgraph "External Integrations Tier"
        NotificationEngine[Notification & Escalation Engine]
        EmailJS[EmailJS API]
        MSTeams[Microsoft Teams Webhook]
        GeminiAI[Google Gemini 2.5 Flash API]
        LocalFallback[Dual-Engine Local Fallback Offline Goals]
        
        NotificationEngine --> |"SMTP Payload"| EmailJS
        NotificationEngine --> |"Adaptive Cards"| MSTeams
        UI_Admin <--> |"Fetch Org Insights"| GeminiAI
        UI_Emp <--> |"Suggest Goals"| GeminiAI
        GeminiAI -.-> |"Fails? Auto-Fallback"| LocalFallback
        LocalFallback -.-> |"Pre-mapped Goals"| UI_Emp
    end

    %% Export
    UI_Admin --> |"Base64 Data URI XLSX"| ExportReport[Achievement / Audit Export]

    %% Styling
    classDef primary fill:#5B5FFF,stroke:#fff,stroke-width:2px,color:#fff;
    classDef secondary fill:#00D4AA,stroke:#fff,stroke-width:2px,color:#fff;
    classDef external fill:#FF4757,stroke:#fff,stroke-width:2px,color:#fff;
    classDef db fill:#FFA502,stroke:#fff,stroke-width:2px,color:#fff;
    classDef security fill:#9B59FF,stroke:#fff,stroke-width:2px,color:#fff;

    class UI_Login,UI_Emp,UI_Mgr,UI_Admin,SetupScript primary;
    class Auth_Layer,Entra_ID secondary;
    class EmailJS,MSTeams,GeminiAI,LocalFallback external;
    class Firestore db;
    class FirestoreSec,APIKeyStorage security;
```

### Component Breakdown
1. **Client Tier**: The front-end application built in React. Handles rendering of the dashboards based on RBAC (Role-Based Access Control). Incorporates a Setup Engine to pre-seed comprehensive test data (including Q1 check-ins and audit logs) to avoid cold-load analytics states.
2. **Security & Authentication Tier**: Firebase Auth acts as the primary gatekeeper, federating identity to Microsoft Entra ID for Enterprise Single Sign-On (SSO). Includes a secure localStorage mechanism to inject the Gemini API key during hackathon demos without committing secrets to Git.
3. **Data & Logic Tier (Serverless BaaS)**: The system is completely serverless. The client communicates directly with Cloud Firestore using the Firebase Web SDK. Strict **Firestore Security Rules** enforce role-based access policies (Admin/Manager/Employee isolation) at the database layer. An embedded "Demo Time Machine" allows admins to instantly warp global timestamps to test cycle transitions.
4. **Integration Tier**: 
   - **Google Gemini 2.5 Flash**: Real-time AI goal and strategy generation with a robust **Dual-Engine Local Fallback** that guarantees a crash-proof demo if the API rate limits or network fails.
   - **Notification Engine**: Broadcasts escalation events out to Email and Microsoft Teams simultaneously.
5. **Data Export**: Generates raw Excel (`.xlsx`) compliance exports (Achievement Reports and full Audit Trails) directly in the browser via Base64 Data URIs, completely avoiding server-side blob generation.
