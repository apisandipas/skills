---
name: my-network
description: Bryan's Tailscale tailnet - the devices on it, their tailnet IPs and MagicDNS names, which services run where (immich, jellyfin, navidrome behind caddy on galactus), how SSH and DNS work, and how the NixOS hosts are wired into it. Use when asked to reach, SSH into, deploy to, or debug connectivity to any of these machines, or when a *.galactus or *.ts.net name comes up.
---

# my-network

One personal Tailscale tailnet. Everything private runs behind it; nothing is
exposed to the public internet. All devices are logged in as the same user, so
every node can reach every other node.

| Fact | Value |
|---|---|
| Tailnet | `apisandipas.github` |
| MagicDNS suffix | `tail3c19ba.ts.net` |
| Owner / admin | `apisandipas@` (Bryan) |
| Exit nodes | none advertised |
| Subnet routes | none advertised |
| Tailnet ACL tags | none; all nodes are user-owned |

## Devices

Tailnet IPs are stable for the life of the node key. Short names resolve over
MagicDNS from any device on the tailnet (`ssh galactus`, `http://galactus`).

| Name | Tailnet IPv4 | OS | What it is | Managed by |
|---|---|---|---|---|
| `galactus` | `100.115.16.56` | NixOS (x86_64) | Ryzen 5 5600X desktop, AMD GPU. The always-on homelab server and main workstation. Builds and deploys the other NixOS hosts. | `~/.config/nixos-config`, `hosts/galactus` |
| `norrin` | `100.75.202.21` | NixOS (x86_64) | Laptop. Often offline or asleep. | `~/.config/nixos-config`, `hosts/norrin` |
| `pi` | `100.125.65.108` | NixOS (aarch64) | Raspberry Pi 5 under the TV. Sway + Kodi + Firefox kiosk pointed at the galactus landing page. Does not build itself. | `~/.config/nixos-config`, `hosts/pi` |
| `morpheus` | `100.91.136.77` | macOS | Mac. Not managed by the nix repo. | Tailscale app, by hand |
| `iphone-13` | `100.102.156.1` | iOS | Phone. Not managed by the nix repo. | Tailscale app, by hand |

Full DNS names follow `<name>.tail3c19ba.ts.net` (for example
`galactus.tail3c19ba.ts.net`). IPv6 addresses exist in `fd7a:115c:a1e0::/48`
but nothing depends on them.

## Services on galactus

Every self-hosted service lives on galactus. Caddy on port 80 fronts them by
hostname, and each service also keeps its own port open so it is reachable by
`galactus:<port>` from any tailnet device. The single source of truth for this
list is `modules/nixos/homelab/services.nix` in the nix repo.

| Name | App | Direct port | URL from a NixOS host | URL from Mac / phone |
|---|---|---|---|---|
| landing page | caddy | 80 | `http://galactus` | `http://galactus` |
| `photos` | Immich | 2283 | `http://photos.galactus` | `http://galactus:2283` |
| `tv` | Jellyfin | 8096 | `http://tv.galactus` | `http://galactus:8096` |
| `music` | Navidrome (Subsonic API) | 4533 | `http://music.galactus` | `http://galactus:4533` |

Why the two URL columns differ: MagicDNS only knows node names, so
`photos.galactus` is not a real DNS name anywhere. The NixOS hosts get it from
an `/etc/hosts` entry that `modules/nixos/networking/default.nix` writes,
mapping every `<service>.galactus` to `100.115.16.56` (or `127.0.0.1` on
galactus itself). The Mac and the phone have no such entry and use the direct
ports. This is deliberate; adding real subdomains would need a DNS server on
galactus plus a split-DNS rule in the admin console, and the ports are fine.

Everything is plain HTTP. The tailnet is already a WireGuard tunnel, and Caddy
vhosts are written with an explicit `http://` prefix so it does not try to
fetch a public certificate for names that do not exist in public DNS.

## SSH

All NixOS hosts run sshd, but only on the tailnet:

- Port 22 is opened on the `tailscale0` interface only, never globally. The
  same interface-name firewall rule pattern is used for every service port
  (80, 2283, 8096, 4533), so nothing is reachable from a coffee-shop LAN.
- Tailscale SSH is enabled (`RunSSH = true`). Authentication is tailnet
  identity plus the ACL policy, not keys or passwords on the machine.
- Password and keyboard-interactive auth are disabled in sshd on every host.

So `ssh bryan@galactus`, `ssh bryan@norrin`, `ssh bryan@pi` work from any
tailnet device without key setup. `./deploy-it pi` in the nix repo relies on
this.

## DNS

- MagicDNS is enabled tailnet-wide and every NixOS host accepts it
  (`CorpDNS = true`).
- On the NixOS hosts `services.resolved` is enabled specifically so that
  tailscaled registers `ts.net` as a split-DNS domain with resolved instead of
  fighting NetworkManager over `/etc/resolv.conf`. Without resolved the
  symptom is `*.ts.net` names that work, then stop after a DHCP renew, then
  work again after `tailscale up`, while raw tailnet IPs never fail.
- No custom tailnet-wide resolvers or split-DNS routes are configured in the
  admin console.

## How the NixOS hosts join

`modules/nixos/networking/default.nix` is shared by all three hosts:

- `services.tailscale.enable = true` with `useRoutingFeatures = "client"`
  (can use an exit node or subnet router; cannot advertise one without
  changing this to `"server"` or `"both"`).
- The node key persists in `/var/lib/tailscale`, so a rebuild or reboot does
  not need re-authentication. A fresh install needs one interactive
  `sudo tailscale up`.
- The galactus tailnet IP is hard-coded in that file as
  `galactusTailnetAddress`. If galactus is ever re-added to the tailnet and
  gets a new address, update that constant or the `*.galactus` names break on
  norrin and pi.

## Useful commands

```sh
tailscale status                  # who is online, direct vs relayed
tailscale ip -4 <name>            # tailnet IPv4 of a node
tailscale ping <name>             # confirm a direct path, not DERP
tailscale dns status              # MagicDNS state on this host
tailscale status --json | jq '.Peer[] | {HostName, TailscaleIPs, Online}'
```

## Gotchas

- `norrin` and `morpheus` are frequently offline. "offline, last seen" in
  `tailscale status` is normal for them, not a fault.
- galactus and pi are on the same LAN, so the tailnet path between them is
  direct peer-to-peer at LAN speed. That is why Jellyfin on the TV does not
  go through a relay.
- `sudo tailscale ...` cannot be run by an agent on these machines (sudo
  prompts for a password with no TTY). Read-only `tailscale status` and
  `tailscale ip` work without root; anything that changes prefs needs Bryan
  to run it.
- The pi is aarch64 and is built on galactus under binfmt emulation, then
  pushed over Tailscale SSH with `./deploy-it pi`. Verify a deploy landed with
  `ssh pi readlink /run/current-system`, not from the script output.
