# Multiplayer

Online multiplayer runs on **Photon Realtime** (free plan: 20 players online at once).

- App ID: set in `js/sdk.js` (`photonAppId`). Region: `photonRegion` (currently `us`, so everyone meets on the same server).
- Library: `lib/Photon-Javascript_SDK.min.js` (Photon Realtime JS SDK 4.4.0, loaded only when a player opens a room).

## How to play together
1. Click **FRIENDS**, then **Create a room**. Share the room code (or, on CrazyGames, the invite link).
2. Friends click **FRIENDS**, type the code and press **Join**.

## How it works
- **Host authority:** the room's host (Photon "master client") orders every hay removal, so everyone's haystack stays identical.
- **Players:** position, facing, tool, vacuum and swing animations are sent 10 times a second. Each player's character, hat, glasses and tool paint are shared when they join.
- **Needle:** one needle per room; the host decides who grabbed it first. Multiplayer levels need one needle.
- **Late joiners** receive a compressed snapshot of the haystack.
- **CrazyGames invites** auto-join through `getInviteParam("roomId")`.

To move to a paid Photon plan or another region, change the App ID or `photonRegion` in `js/sdk.js`.
