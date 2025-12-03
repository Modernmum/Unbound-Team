# Unbound.team - Bot Testing System

AI bots that test your website like real users and tell you what's broken.

## What We Built

A system where AI bots:
1. Open your website in a real browser
2. Act like different types of users (business owners, executives, freelancers)
3. Go through user journeys (signup, onboarding, using features)
4. Find issues and rate the experience
5. Report results to you

## Live Demo

- **Main Site**: https://unboundteam-three.vercel.app
- **Test Results**: Click green "View Test Results" button
- **Test Page**: https://unboundteam-three.vercel.app/maggie.html

## Files

```
/
├── index.html              # Main site
├── maggie.html             # Test results
├── SETUP.sql               # Database setup
│
├── backend/services/
│   ├── bot-user-persona.js     # Bot that tests websites
│   ├── bot-testing-service.js  # Saves results
│   └── agent-network.js        # Bot communication
│
└── test/
    └── test-maggie-forbes-site.js  # Run test
```

## Setup (5 minutes)

1. Create Supabase project at https://supabase.com
2. Run `SETUP.sql` in Supabase SQL Editor
3. Add credentials to `backend/.env`
4. Run: `node test/test-maggie-forbes-site.js`
5. View: https://unboundteam-three.vercel.app/maggie.html

Done!
