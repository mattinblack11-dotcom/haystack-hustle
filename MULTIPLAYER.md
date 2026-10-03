# Multiplayer setup

## Test right now (no account needed)
1. Open `index.html` in **two Chrome tabs**.
2. Tab 1: click **FRIENDS**, then **Create a room**. Note the room code.
3. Tab 2: click **FRIENDS**, type the code and press **Join**.

Both tabs now share one haystack, one needle and one level.

## Go online with Photon (free tier)
1. Make an account at https://www.photonengine.com and click **Create a new app**. Pick **Realtime** as the type.
2. Copy the **App ID** into `js/sdk.js`:
   ```js
   photonAppId: "your-app-id-here",
   photonRegion: "us",
   ```
3. On the Photon dashboard, download the **Realtime JavaScript SDK**. Copy `Photon-Javascript_SDK.min.js` into the `lib/` folder.

The game then uses Photon Cloud automatically. If either the App ID or the SDK file is missing, it falls back to local mode.

## How it works
- **Host authority:** the room's host (Photon's "master client") orders every hay removal, so everyone's haystack stays identical. Only dig events are sent, never individual hay blocks.
- **Players:** positions, facing direction, tool, vacuum and swing animations are sent 10 times a second.
- **Needle:** there is one needle per room, and the host decides who grabbed it first. The carrier must walk it to Wizzo. If the carrier leaves, the needle drops where they were.
- **Level progress:** when the needle is delivered, the whole room completes the level, everyone gets rewards, and everyone loads the next map in the same room.
- **Late joiners:** a player who joins mid-level receives a compressed snapshot of the haystack (2–30 KB).
- **CrazyGames invites:** on CrazyGames, creating a room shows the invite button. Invite links auto-join the room through `getInviteParam("roomId")`.
