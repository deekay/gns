# Global Name System Domain Deployment

This runbook moves the product-facing site onto [globalnamesystem.org](https://globalnamesystem.org) while keeping the underlying GNS protocol identifiers unchanged for compatibility.

## Goal

Serve the Global Name System website directly from the VPS at:

- `https://globalnamesystem.org`
- `https://www.globalnamesystem.org`

while preserving the existing compatibility alias at:

- `https://trainhappy.coach/gns`

The canonical path-based deployment is now:

- `https://trainhappy.coach/gns`

## 1. Prepare The VPS

From the repo root:

```bash
npm run deploy:vps -- root@<server-ip> ~/.ssh/<your-key>
npm run bootstrap:gns-domain:vps -- root@<server-ip> ~/.ssh/<your-key> globalnamesystem.org
```

That will:

- deploy the latest app code
- create `/etc/gns/gns-domain.env`
- create `gns-domain-web.service` on port `3002`
- install and configure Caddy
- open ports `80` and `443`

## 2. Update DNS

Your domain is currently still pointed at Squarespace. In your DNS provider:

1. remove the Squarespace apex `A` records:
   - `198.185.159.144`
   - `198.185.159.145`
   - `198.49.23.144`
   - `198.49.23.145`
2. remove the Squarespace `www` CNAME:
   - `ext-sq.squarespace.com`
3. add a new apex `A` record:
   - host: `@`
   - value: `146.190.130.124`
4. add a new `www` CNAME:
   - host: `www`
   - value: `globalnamesystem.org`

After DNS propagates, Caddy will automatically obtain HTTPS certificates.

## 3. Verify

On the VPS:

```bash
systemctl status gns-domain-web.service
systemctl status caddy.service
curl -s http://127.0.0.1:3002/api/health | jq
```

From your machine after DNS propagation:

```bash
curl -I https://globalnamesystem.org
curl -s https://globalnamesystem.org/api/health | jq
```

## 4. Rollback

If you need to pause the root-domain deployment:

```bash
ssh -i ~/.ssh/<your-key> root@<server-ip>
systemctl stop gns-domain-web.service
systemctl stop caddy.service
```

Then point DNS back to the previous provider.

## Notes

- The product branding is now `Global Name System`.
- The protocol identifier remains `GNS`.
- Existing protocol identifiers, JSON `kind` strings, and on-chain magic bytes remain unchanged.
- The shared-host compatibility route remains `https://trainhappy.coach/gns`.
- The dedicated `globalnamesystem.org` deployment serves the app at the root path `/`.
