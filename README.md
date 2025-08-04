📍 Euroxin Field Visit App
A mobile-first platform designed to streamline the planning, tracking, and reporting of field visits—perfect for marketers, supervisors, and admins in fast-moving field environments.

🚀 Overview
Euroxin Field Visit empowers field teams with real-time GPS check-ins, interactive maps, visit logging, task management, and knowledge resources—bundled in a clean React Native interface backed by Firebase.

📱 Key Features
Visit Planning & Tracking

Check-in/out via GPS & POIs

View past visits & visit outcomes

Smart Attendance

Auto check-out if >1km from visit zone

Geofence-triggered actions

Visit Summary & Logs

Contact info, product interest, comments, images

Task Management

Weekly/monthly task assignment

Real-time progress tracking

Live Field Rep Map

Supervisor-only module

Scrollable rep view + activity feed

Stock Monitoring

Distributor/product listings & contacts

Knowledge Center

Filterable training hub (Sales/Product/Compliance)

User Profiles

Role-based access & customizable settings

🛠 Tech Stack
Layer	Tools Used
Frontend	React Native
Backend	Firebase (Auth, Firestore, Functions)
Maps	Google Maps API
Admin Web	React, Next.js, Firebase SDK
Hosting	Vercel, Firebase Hosting
👥 Target Users
Field Marketers (Mobile-only)

Supervisors (Mobile + Admin access)

Admins (Full access via web portal)

🌐 Admin Web Modules
Dashboard: KPIs, charts, completion rates

User Management: Region/role assignment

Task Scheduler: Recurring/one-off plans

Live Tracking: Timeline/map view of reps

Stock Management: Distributor oversight

Knowledge Uploads: PDF/video updates

Settings: Visit radius, branding, languages

🔐 Security
Role-based access control (RBAC)

Audit logs and user session protection

📦 Installation
bash
# Clone the repo
git clone https://github.com/kid-yP/euroxin-field-visit.git

# Install dependencies
npm install

# Run the app
npm start
