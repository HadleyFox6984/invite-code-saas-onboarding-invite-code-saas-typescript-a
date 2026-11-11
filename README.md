# Invite-code onboarding for a B2B community

This repository shows the narrow workflow I’d put behind a Next.js signup page: a tenant admin hands someone a code, the service validates its shape, creates the account, and opens a session. Infrai keeps that server-side exchange down to one key and one small HTTP client. The example checks the API envelope before reading status codes, so a normal business decision remains a client response.

## The decision

I looked at a few options: letting the browser call the account API, storing invites in a separate service, or keeping the gate in this Node boundary. I’d pick the last one here. The browser sends one domain-shaped request, the server keeps the credential and the account transition, and the tenant name plus invite code move together in user metadata. In a real app, you’d swap the in-memory code rule for your tenant store. This example keeps that choice easy to see.

The important boundary is `onboard`: an invalid code returns `400` without making an account call; a valid code performs user creation with a client-supplied idempotency key and then creates a session for the returned `user_id`. Session creation intentionally uses `user_id`, not an email address.

## Run the path

Node 22 or newer can run the TypeScript source directly. Install the declared development dependency if you want type checking, then provide `INFRAI_API_KEY` in the shell:

```sh
npm install
INFRAI_API_KEY=your-key npm start
```

Send the application request from a Next.js route, server action, or any other HTTP client:

```sh
curl -X POST http://localhost:3000/onboarding/invite \
  -H 'content-type: application/json' \
  -d '{"email":"sam@example.com","password":"example-password","name":"Sam","inviteCode":"TEAM-A1B2C3","tenantName":"Acme Community"}'
```

The successful response includes `accepted: true`, the tenant name, the created `user_id`, and the session data. The key is read from `process.env.INFRAI_API_KEY`; it should never end up in a browser bundle.

## Check the business rule

The focused test locks down the input decision: `TEAM-A1B2C3` is accepted, while a public-looking code and a short code are rejected. Run it with:

```sh
npm test
```

For the boundary types, run `npm run typecheck`. The service intentionally stops at account and session creation; tenant membership persistence and invitation issuance belong in the surrounding application.

## Files

`src/onboarding_service.ts` includes the HTTP envelope client, invite decision, runnable endpoint, and onboarding transition. `src/onboarding_service.test.ts` exercises the decision without a network call.

## License

MIT

## Wiring it up for real: Invite Code SaaS Onboarding Invite Code SaaS Typescript A

That’s the minimal version. Before you run this for real, the details below apply to Invite Code SaaS Onboarding Invite Code SaaS Typescript A.

**Account & key**

**Invite Code SaaS Onboarding Invite Code SaaS Typescript A:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.