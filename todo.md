Config and env
Settings 1: DISCORD_BOT_TOKEN, DISCORD_PUBLIC_KEY, and optional MATCHMAKER_FRONTEND_URL.
.env.example: Documented bot token, public key, interactions URL, invite scope, register_discord_commands, and optional MATCHMAKER_FRONTEND_URL.
2. Shared LFG creation
New matchmaker-backend/api/discord/lfg/service.py: create_lfg_group(discord_id, start_time, duration, max_party_size=None, description="") creates LFGGroup and the creator LFGMember; raises ValidationError on invalid input.
Serializer 2: LFGGroupCreateSerializer.create() calls create_lfg_group(...) instead of creating the group and member in the serializer.
View 3: lfg_create no longer creates the member itself; the service does it.
3. Discord interactions endpoint
New matchmaker-backend/api/discord/interactions.py:
Verifies request using X-Signature-Ed25519 and X-Signature-Timestamp with PyNaCl and DISCORD_PUBLIC_KEY.
PING (type 1): responds with {"type": 1}.
APPLICATION_COMMAND (type 2) for lfg: reads member.user.id (or user.id in DMs), parses options duration, start_time, max_party_size, description; default start is 5 minutes from now; calls create_lfg_group(...); responds with type 4 and a message (and optional MATCHMAKER_FRONTEND_URL link).
CSRF: View is wrapped with @csrf_exempt and @require_POST.
4. URL and dependencies
URLs 4: path("interactions/", interactions.DiscordInteractionsView.as_view()) so the endpoint is /api/v1/discord/interactions/.
Requirements 5: PyNaCl>=1.5,<2 added.
5. Slash command registration
New matchmaker-backend/api/management/commands/register_discord_commands.py: Management command that POSTs to Discord’s Create Global Application Command API to register /lfg with options: duration (number, required), start_time (string, optional), max_party_size (integer, optional), description (string, optional).
What you need to do
Add DISCORD_BOT_TOKEN and DISCORD_PUBLIC_KEY to .env (Bot token from Bot tab, Public Key from General Information).
In the Discord Developer Portal, set Interactions Endpoint URL to https://<your-backend>/api/v1/discord/interactions/ (HTTPS in production).
Invite the bot with scopes bot and applications.commands.
Run once: python manage.py register_discord_commands (from the matchmaker-backend context or container).
After that, /lfg will be available in Discord; using it creates an LFG group and adds the user as the first member.