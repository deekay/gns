# Hosted Demo Script

Use this when you want to show GNS quickly to someone new without sending them through the whole repository first.

## Goal

In one short walkthrough, the person should see all three layers:

1. connect a wallet to the hosted private demo
2. claim a name
3. publish key/value pairs for that name

## Best Audience

This is the right script for:

- Flint reviewers
- technically capable friends
- first-time product testers
- anyone who wants to understand the product before reading the deeper docs

## What To Send Them

Send exactly these two links first:

- [https://globalnamesystem.org/setup](https://globalnamesystem.org/setup)
- [https://globalnamesystem.org/claim](https://globalnamesystem.org/claim)

If you want one sentence of framing, use:

> GNS lets you claim a human-readable name, then point it at ordered key/value pairs you control.

## What They Need

- Sparrow Wallet
- a few minutes
- no SSH access
- no Bitcoin balance

For the hosted demo, the supported wallet path is Sparrow in `signet` mode using the server string shown on the setup page.

## Fastest Walkthrough

### 1. Connect Sparrow

Open [setup](https://globalnamesystem.org/setup).

In Sparrow:

- run in `signet` mode
- turn `Public Server` off
- use the hosted demo server string from the setup page

Then request demo coins into that same Sparrow wallet.

Success looks like:

- Sparrow shows a confirmed demo balance
- the setup page reports successful funding

### 2. Claim A Name

Open [claim](https://globalnamesystem.org/claim).

Use:

- the same funded Sparrow wallet from setup
- a fresh test name that is likely unclaimed
- a saved owner key and backup package

Then:

- prepare the draft
- build the signer files
- sign and broadcast commit and reveal in Sparrow

Success looks like:

- the name appears in [explore](https://globalnamesystem.org/explore)
- or the detail page resolves at `/names/<your-name>`

### 3. Publish A Value Bundle

Open [values](https://globalnamesystem.org/values?name=bundledemo) or replace the name with the one just claimed.

Load the claimed name, then publish a few key/value pairs such as:

- `website` → `https://example.com`
- `btc` → `bitcoin:bc1...`
- `chat` → `https://t.me/example`

Success looks like:

- the name detail page shows the published key/value pairs
- sequence increments
- future updates require the owner key, not the funding wallet key

## Canonical Examples

If they want to inspect the product before claiming, point them at:

- [simpledemo](https://globalnamesystem.org/names/simpledemo): claimed name with no value yet
- [bundledemo](https://globalnamesystem.org/names/bundledemo): claimed name with repeatable key/value pairs
- [transferdemo](https://globalnamesystem.org/names/transferdemo): transferred name with new-owner authority

## What To Say If They Ask “What Works Today?”

Use this short answer:

- hosted private demo with Sparrow: yes
- claim flow: yes
- browser value publishing: yes
- transfers: prototype
- self-hosting: yes
- mainnet-ready: not yet

## Known Boundaries

Keep these clear:

- this is a private signet demo, not mainnet
- the hosted wallet path is Sparrow-first today
- the official Electrum app is not the right wallet for this hosted demo
- the website prepares flows, but the wallet still signs and broadcasts transactions

## If You Only Have 60 Seconds

Use this order:

1. homepage: explain the product in one sentence
2. setup: show that the wallet can connect and get demo coins
3. claim: show the commit/reveal flow exists
4. bundledemo: show what a claimed name can point to

