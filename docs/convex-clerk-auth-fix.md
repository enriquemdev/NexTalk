# Fixing Convex-Clerk Authentication Issues

## Overview
This document provides step-by-step instructions to fix the "Failed to authenticate: No auth provider found matching the given token" error when connecting Clerk authentication with Convex.

## Common Issues

1. **Missing JWT Template**: Clerk requires a custom JWT template named "convex" to work with Convex.
2. **Incorrect Auth Configuration**: The Convex auth.js file must be properly formatted and match your Clerk configuration.
3. **Convex Project Configuration**: The convex.json file must be properly set up.
4. **Deployment Configuration**: Environment variables must be correctly set.

## Step 1: Create a Clerk JWT Template

1. Go to your [Clerk Dashboard](https://dashboard.clerk.dev/)
2. Select your application
3. In the sidebar, navigate to "JWT Templates"
4. Click "Add new template"
5. Configure the template with:
   - **Name**: `convex` (this exact name is required)
   - **Signing algorithm**: `RS256`
   - **Custom claims**: Add the following JSON:
     ```json
     {
       "sub": "{{user.id}}",
       "userId": "{{user.id}}"
     }
     ```
6. Click "Create"

## Step 2: Configure Convex Authentication

Create or update `convex/auth.js` with the following content:

```js
// convex/auth.js
module.exports = {
  providers: [
    {
      name: "clerk",
      // Domain of your Clerk instance (from the JWT template URL)
      domain: "https://awaited-shrimp-97.clerk.accounts.dev",
      // The JWT template name
      applicationID: "convex",
    },
  ],
};
```

## Step 3: Set Up Convex Project Configuration

Update your `convex.json` file in the root directory:

```json
{
  "project": "nextalk",
  "team": "arturo-mejia",
  "functions": "./convex/",
  "authInfo": ["./convex/auth.js"]
}
```

## Step 4: Run the Convex Development Server

Open a new terminal window and run:

```bash
npx convex dev
```

Keep this terminal open while you run your Next.js app in another terminal with:

```bash
npm run dev
```

## Step 5: Verify Environment Variables

Make sure these environment variables are correctly set in your `.env.local` file:

```
NEXT_PUBLIC_CONVEX_URL=https://posh-viper-397.convex.cloud
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YXdhaXRlZC1zaHJpbXAtOTcuY2xlcmsuYWNjb3VudHMuZGV2JA
CLERK_SECRET_KEY=sk_test_vAjnZ8z3qlLjxInS121M8pLiVcu01NG2n9bg2vJLD7
```

## Step 6: Debug Using the Debug Component

We've added a debug component to the home page that will show authentication status and error messages. Use this component to see if authentication is working properly.

## Troubleshooting

1. **JWT Token Mismatch**: If you still get authentication errors, check that the JWT template name in Clerk matches the `applicationID` in auth.js.

2. **Schema Issues**: Make sure your Convex schema.ts has proper authentication fields. The users table should have a `tokenIdentifier` field to match Clerk IDs.

3. **Auth Function**: Make sure your Convex query and mutation functions use the proper auth context.

4. **Domain URL Format**: Ensure the domain URL in auth.js is correct and includes the https:// prefix.

5. **Restart Servers**: Sometimes, you need to restart both the Convex and Next.js development servers to apply configuration changes. 