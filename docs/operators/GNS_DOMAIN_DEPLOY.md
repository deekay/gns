# Global Name System Domain Deployment

This runbook moves the product-facing site onto [globalnamesystem.org](https://globalnamesystem.org) while keeping the underlying GNS protocol identifiers unchanged for compatibility.

## Goal

Serve the Global Name System website directly from the VPS at:

- `https://globalnamesystem.org`
- `https://www.globalnamesystem.org`

while preserving the existing compatibility alias at:

- a legacy shared-host path, if you still use one

The dedicated domain deployment serves the app at the root path `/`.

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

In your DNS provider:

1. remove any old apex `A` records that still point at a previous host
2. remove any old `www` CNAME that still points at a previous provider
3. add a new apex `A` record:
   - host: `@`
   - value: `<your-vps-ip>`
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
- Any shared-host compatibility route is optional and deployment-specific.
- The dedicated `globalnamesystem.org` deployment serves the app at the root path `/`.
