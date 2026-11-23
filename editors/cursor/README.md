# Cursor

## Route: documentation only

Cursor is closed source. Its model settings (Cursor Settings > Models: OpenAI API Key, Override OpenAI Base URL, custom model names) are kept in Cursor's internal state database, not in a settings file, so no adapter writes them. There is no import file, deep link or provider registry for outsiders.

Steps for a user:

1. Cursor Settings > Models > API Keys: paste the `vk-` key into the OpenAI API Key field.
2. Turn on Override OpenAI Base URL and enter `https://uncensoredllm.xyz/v1`.
3. Add a custom model named `uncensoredllm-1` and select it in chat.
4. Turn the override off again when you want Cursor's own models.

Known limits, from Cursor's docs and forum (not tested here):

- Cursor's API-keys page says custom keys only work with chat models; Tab completion keeps Cursor's own models.
- Requests go from Cursor's servers, not from the editor, so the endpoint must be public (it is).
- Forum reports from 2026 say that while the override is on, Cursor's own models are routed to the custom URL too, and that Agent mode can send Responses-style bodies to `/chat/completions`. If Agent mode fails, use Ask mode.

Sources: https://cursor.com/docs/settings/api-keys (read 2026-11-23); forum threads "Cursor-managed models are routed through Override OpenAI Base URL" and "Cursor cannot connect to a custom URL compatible with the OpenAI protocol" on forum.cursor.com. Cursor also acquired Continue in June 2026 (secondary sources; not confirmed from a primary one).
