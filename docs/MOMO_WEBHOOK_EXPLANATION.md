# How the MoMo Webhook Works (Simple English Guide)

This guide explains the "behind-the-scenes" logic of how Falaa Deals (or any other site) automatically updates a user's wallet when they send Mobile Money to a personal number.

## 1. The Challenge
Personal MoMo accounts (like a regular SIM card) do not have a built-in "API" that talks to websites. When someone sends you money, only your phone knows about it via an SMS message.

## 2. The Bridge (The Android Phone)
To make this work on a website, you need a "Bridge":
1.  **A dedicated Android Phone:** This phone holds the SIM card that receives the money.
2.  **An SMS Forwarder App:** You install an app (like "SMS to Webhook") that watches for incoming SMS messages from "MobileMoney".

## 3. The Webhook (The Logic)
When an SMS arrives (e.g., *"You have received GHS 10.00 from... Reference: F5"*), the Android app instantly sends that text to your website's **Webhook URL**.

### The Secret Key
To prevent random people from "faking" deposits, we use a secret key in the URL.
**Your Secret URL would look like this:**
`https://your-website.com/api/momo?secret=26bbd7a9ebac65ae4c2e56d04f38986de8b580e67317654652cf9445a6f9cc17`

If the secret in the URL doesn't match the one in your code, the website ignores the request.

## 4. How to Implement This in Any System

If you want to build this in a new website, follow these 5 steps:

### Step 1: Database Setup
Make sure your "Users" table has a column called `reference_code` (like F1, F2, P1, etc.) and a `wallet_balance`.

### Step 2: Create the API Endpoint
Create a page on your server (a Webhook) that can receive data. This page must:
1.  **Verify the Secret:** Check if the URL contains your secret key.
2.  **Read the Message:** Take the SMS text sent by the Android phone.
3.  **Find the Reference:** Use a "Regex" (a text searcher) to find the word after "Reference:".
4.  **Find the Amount:** Search the text for the "GHS" value.

### Step 3: Update the Wallet
1.  Look up the user in your database who matches that **Reference**.
2.  Add the **Amount** to their current balance.
3.  Save the **Transaction ID** so you don't process the same SMS twice.

### Step 4: Real-time Notification
Use a tool like **Supabase Realtime** or **Pusher**. When the database balance changes, the website should instantly show a "Success" message to the user without them having to refresh the page.

### Step 5: Setup the Phone
1.  Open the SMS Forwarder app on your Android phone.
2.  Set the "Filter" to only forward messages from "MobileMoney".
3.  Set the "Target URL" to your website's API URL (including the secret key).

---

## Summary of the Flow
**User sends MoMo** -> **Phone receives SMS** -> **App forwards SMS to Website** -> **Website checks Secret Key** -> **Website reads Reference & Amount** -> **Website updates Database** -> **User sees Green Checkmark**.

This system works for any wallet system as long as you give each user a unique reference code to type in when they are sending the money!