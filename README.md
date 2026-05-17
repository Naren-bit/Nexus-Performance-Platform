# Nexus Performance Platform

![Nexus Logo/Banner](public/vite.svg) *Replace with actual banner if available*

**Nexus** is a centralized, high-performance organizational goal management platform. It streamlines the entire employee performance cycle—empowering teams to set annual OKRs aligned with company Thrust Areas, facilitating seamless manager approvals, enabling structured quarterly check-ins, and providing Admins with real-time analytics and automated escalation tracking.

## 🚀 Live Demo & Repository
- **Source Code Repository**: [https://github.com/Naren-bit/Nexus-Performance-Platform.git](https://github.com/Naren-bit/Nexus-Performance-Platform.git)
- **Live Hosted URL**: *(Insert Vercel/Netlify URL here)*

---

## 🔑 Login Credentials (User Journeys)
The platform features three distinct user journeys. You can seamlessly switch between these roles using the **"Quick Demo Access"** buttons on the login modal, or manually use the following credentials:

| Role | Email Address | Password |
| :--- | :--- | :--- |
| **Employee** | `employee@demo.nexus.com` | `Demo@1234` |
| **Manager** | `manager@demo.nexus.com` | `Demo@1234` |
| **Admin** | `admin@demo.nexus.com` | `Demo@1234` |

*(Note: The system supports an auto-signup fallback for demo purposes. Any custom email used during the hackathon demo will automatically register as an Employee account).*

---

## 🏗️ Architecture & Technologies Used
*The platform is **completely serverless**, built on a modern **Backend-as-a-Service (BaaS)** architecture. All business and routing logic executes directly on the client, utilizing Firebase SDKs to communicate with cloud services—eliminating the need to host, secure, or pay for a dedicated backend application server.*

### Core Tech Stack
- **Frontend**: React.js + Vite
- **Styling**: Vanilla CSS + Glassmorphism UI + Lucide React Icons
- **Routing**: React Router DOM
- **Charts/Analytics**: Chart.js / react-chartjs-2

### Backend & Infrastructure (100% Serverless BaaS)
- **Database**: Firebase Firestore (NoSQL Document Database)
- **Authentication**: Firebase Authentication
- **SSO Integration**: Microsoft Entra ID (Azure AD) via Firebase OAuthProvider

### Third-Party Integrations
- **Notifications Engine**: EmailJS for reliable email delivery.
- **Enterprise Messaging**: Microsoft Teams Adaptive Cards Webhook (Simulated).
- **AI Analytics**: Claude AI Integration (Simulated for Admin Insights).

### Architecture Diagram
*Please see the `ARCHITECTURE.md` file in this repository for the complete system architecture diagram, which can be rendered to PDF/Image.*

---

## ✨ Core Features Built to BRD Specifications

### 1. Role-Based Workflows
- **Employees**: Can submit Q1-Q4 goals, track progress, and submit quarterly check-ins.
- **Managers**: Can review, approve, or return employee goals with feedback. View team-wide check-in completion.
- **Admins**: Can initiate new Performance Cycles, view organization-wide heatmaps, and manage overall system health.

### 2. Advanced Analytics Dashboard
- Real-time Org Heatmaps showing goal alignment across departments.
- QoQ (Quarter-on-Quarter) progress tracking and dynamic score computations.
- "Manager Effectiveness" visualizations.

### 3. Automated Escalation Engine
- **Level 1 (L1)**: Flags missing goal submissions to direct managers.
- **Level 2 (L2)**: Escalates consistently missed check-ins to department heads.
- **Level 3 (L3)**: High-level escalations for organizational blockers, sent directly to Admin/HR.
- *All escalations trigger multi-channel alerts (In-App, Email, and Microsoft Teams).*

---

## 🧪 Architectural Assumptions & Simulation Strategy

To ensure a seamless, production-ready live pitch that is both highly robust and secure during the 5-minute hackathon evaluation, our team made several strategic engineering assumptions and implemented realistic simulation modules:

### 1. AI Integration & Security (Claude AI & Copilot)
*   **Assumption:** Storing private Anthropic or OpenAI API keys directly in a client-side React frontend is a major security risk (keys could easily be extracted via the browser inspect tool).
*   **Strategy:** 
    *   **Admin AI Insights**: We simulated the AI feedback box with realistic, themed operational analyses using mock delays. 
    *   **Goal Copilot**: The AI-assisted "Suggest Goal" button on the employee page dynamically maps a deterministic set of optimized, high-performance SMART goals based on the employee's selected Thrust Area.
    *   **Production Path**: In a real production deployment, these features would call a secure cloud-based serverless backend proxy (like Firebase Cloud Functions or an Express API gateway) to manage and authenticate the LLM API calls secretly.

### 2. Time-Bound Performance Cycles (The Demo Time Machine)
*   **Assumption:** Evaluators need to test year-long performance flows (Goal Setting in May, Q1 in July, Q2 in October, etc.) in a few minutes, which is impossible with standard locked schedules.
*   **Strategy:** We engineered an **"Admin Demo Time Machine"** banner at the top of the Admin Dashboard. This allows the judge to instantly warp the system's global Firestore timestamps forward/backward, immediately triggering real-time UI reactions (opening check-in windows, locked goal sheet edits, and L1-L3 escalation triggers).

### 3. Microsoft Teams Webhook Integrations
*   **Assumption:** Hackathon environments lack live corporate Office 365 / MS Teams developer sandbox environments to display active webhook notifications.
*   **Strategy:** The app constructs complete Microsoft Adaptive Card JSON structures ready for standard incoming webhook routing. We mocked the final network request locally while displaying the constructed cards to prove exact compliance with Teams bot payloads.

---

## 🛠️ Local Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Naren-bit/Nexus-Performance-Platform.git
   cd Nexus-Performance-Platform
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Initialize the Database:**
   Start the dev server and navigate to `http://localhost:5173/setup` to populate the Firestore database with the required mock data and organizational hierarchy.
4. **Run the development server:**
   ```bash
   npm run dev
   ```

---
*Built with ❤️ for the Hackathon.*
