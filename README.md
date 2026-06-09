# Arcane Survival
[![Ask DeepWiki](https://devin.ai/assets/askdeepwiki.png)](https://deepwiki.com/kimmartelolives/arcane_survival)

*Arcane Survival* is a fantasy co-op survival game where arcane wizards fight endless waves of magic and chaos. Forge covenants, survive the last stand, and rise in the Council of Fallen. Built with React and Supabase, this game features real-time multiplayer, a persistent leaderboard, and a dynamic skill system.

## Features

-   **Live Co-op & Solo Modes**: Play alone or team up with a friend in real-time. Create a lobby, share a room code, and face the chaos together.
-   **Dynamic RPG Progression**: Defeat enemies to gain experience, level up, and choose from a random selection of powerful upgrades to enhance your wizard's abilities.
-   **Extensive Skill System**: Unlock a deep skill tree with over 10 unique abilities. Toggle passive auras, auto-cast offensive spells, and unleash devastating Ultimate skills like `Arcane Collapse` and the reality-bending `Arcane Instinct`.
-   **Real-time Backend**: Powered by Supabase for:
    -   WebSocket-based multiplayer for seamless co-op synchronization.
    -   A persistent online leaderboard to immortalize the most legendary wizards.
    -   An in-game "Council Chronicles" system for announcements and patch notes.
-   **Arcane Hotbar**: Manage your unlocked skills with an MMO-style hotbar, complete with cooldown timers and status indicators.
-   **Integrated Party Chat**: Coordinate with your ally using the built-in chat system in co-op mode.
-   **Secret Admin Portal**: A hidden `/scribe-portal` allows administrators to manage game announcements and patch notes directly into the Supabase database.

## How to Play

The goal is to survive for as long as possible against increasingly difficult waves of enemies while leveling up your wizard.

-   **Movement**: `WASD` or `Arrow Keys`
-   **Pause Game**: `Escape` or `P`
-   **Level Up Choice**: `1`, `2`, or `3`
-   **Skill Hotkeys**: `1` through `6`
-   **Toggle Skill Panel**: `K`

## Tech Stack

-   **Frontend**: React (with Hooks), Vite
-   **Backend & Realtime**: Supabase
-   **Game Engine**: HTML5 Canvas with a Web Worker for the game loop.
-   **Styling**: Custom CSS with a "magical neon" theme.
