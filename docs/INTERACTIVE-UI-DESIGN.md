# Interactive UI Design — DMlog.ai & StudyLog.ai

> Preact-based frontend architecture for live TTRPG sessions and interactive study sessions.
> Builds on the UX-DESIGN.md theme system and COMPONENT-SPEC.md patterns.
> Informed by OpenMAIC's Roundtable component analysis.

---

## Table of Contents

1. [Overview](#1-overview)
2. [TTRPG Game Interface](#2-ttrpg-game-interface)
3. [Study Session Interface](#3-study-session-interface)
4. [Preact Component Architecture](#4-preact-component-architecture)
5. [Animation System](#5-animation-system)
6. [Real-Time Updates](#6-real-time-updates)
7. [Performance Budget](#7-performance-budget)
8. [CSS Architecture](#8-css-architecture)
9. [TTS Integration](#9-tts-integration)
10. [Devil's Advocate](#10-devils-advocate)
11. [Wireframes](#11-wireframes)
12. [Component Specs](#12-component-specs)
13. [State Management](#13-state-management)
14. [Open Questions](#14-open-questions)

---

## 1. Overview

### 1.1 Design Goals

| Goal | Rationale |
|------|-----------|
| **Single shell, two domains** | One `SessionShell` component adapts to TTRPG or Study context |
| **Action stream rendering** | Backend pushes typed actions; frontend renders them reactively |
| **Progressive enhancement** | Works without JS for static content; JS adds animations, real-time |
| **30KB gzipped target** | Preact (4KB) + preact-signals (2KB) + components (~24KB) |
| **No build step** | HTM tagged templates, like existing log-origin architecture |
| **Offline-first** | IndexedDB caches session state; reconnects seamlessly |

### 1.2 Technology Stack

| Layer | Technology | Size |
|-------|-----------|------|
| Framework | Preact 10.26 | 4KB |
| State | preact-signals | 2KB |
| Templating | HTM (tagged template literals) | 1KB |
| Styling | CSS custom properties + data attributes | 0KB |
| Canvas | Native Canvas API (maps, whiteboards) | 0KB |
| Icons | Inline SVG | ~2KB |
| TTS | Web Speech API (browser native) | 0KB |
| Real-time | SSE + WebSocket | 0KB |
| Offline | IndexedDB via idb shim | 1KB |
| **Total** | | **~10KB** |

### 1.3 Domain Separation

The frontend detects the domain from the hostname and loads domain-specific CSS + components:

```
dmlog.ai   → TTRPG theme (dark fantasy, parchment accents)
studylog.ai → Study theme (clean, academic, focus-friendly)
```

Components are shared where possible; domain-specific components are lazy-loaded.

---

## 2. TTRPG Game Interface

### 2.1 Three View Modes

The TTRPG interface has three view modes, determined by the user's role in the session:

| Mode | Who | Interactivity |
|------|-----|--------------|
| **Game Console** | DM (game master) | Full control: narrate, spawn NPCs, control combat, manage scenes |
| **Player Interface** | Player character | Limited: view story, roll dice, take actions, chat OOC |
| **Spectator Mode** | Observer | Read-only: watch narration, dice rolls, combat unfold |

### 2.2 Game Console (DM's View)

The DM console is a power-user interface optimized for running a game session.

**Layout:** Three-column with collapsible panels.

**Scene Canvas (center):**
- Main display area for location art, maps, and animations
- Renders `scene_change` actions as background transitions
- Supports map overlay (grid-based tactical view for combat)
- Accepts drawing annotations (DM can sketch on the map)
- Shows ambient weather/atmosphere effects (rain overlay, fog, darkness gradient)

**NPC Panel (right sidebar):**
- Lists all active NPCs with portrait thumbnails
- Each NPC card shows: name, race/class icon, HP bar, status conditions
- Click NPC → quick actions: speak as NPC, attack NPC, toggle condition
- Drag to reorder initiative order
- "+ Add NPC" button opens NPC creation form
- NPC portraits sourced from Stable Diffusion via backend or user uploads

**Combat Tracker (toggleable overlay):**
- Initiative order list with drag-to-reorder
- Each entry: character portrait, name, AC, HP bar (current/max), active conditions
- "Next Turn" button advances the tracker
- Turn indicator highlights current character
- Auto-roll initiative on combat start (or manual entry)
- Conditions applied: poisoned, stunned, charmed, frightened, etc.
- Death saves tracker for downed characters

**Player Status (bottom-left or toggleable panel):**
- Connected players list with online/offline indicators
- Character names, classes, levels
- Quick glance at HP, AC, notable conditions
- Click to view full character sheet

**Quick Actions (contextual toolbar):**
```
[/describe] [/npc] [/roll] [/attack] [/scene] [/combat] [/ambient] [/branch]
```
- Buttons change based on current game phase
- Exploration phase: describe, npc, scene, ambient
- Combat phase: attack, roll, spell, heal, end turn
- Social phase: npc, branch, insight check

**Scene Library (drawer):**
- Saved scenes organized by campaign/act
- Thumbnail previews
- Click to load → triggers `scene_change` action
- Tags for filtering (tavern, dungeon, wilderness, town)

**Dice Tray (overlay):**
- Visual d20, d12, d10, d8, d6, d4 dice
- 3D CSS transform animation on roll
- Modifier input (+3, -2, etc.)
- Roll reason field ("Attack roll for longsword")
- Roll history (last 20 rolls)
- Quick-roll buttons: d20, advantage, disadvantage

**Music/Atmosphere Controls (mini panel):**
- Background music player (YouTube embeds, mp3 uploads, or ambient generators)
- Volume control
- Fade in/out transitions between tracks
- Sound effects library (sword clash, door creak, thunder)
- Per-scene audio presets

### 2.3 Player Interface

**Story View (main area):**
- Narrative text from DM appears word-by-word (typewriter effect)
- DM narration styled differently from NPC dialogue
- Speech bubbles for NPC conversations (colored by NPC)
- Dice roll results animate inline: "You rolled a **17** on your Perception check! ✨"
- Action descriptions appear as narrative blocks with scene-appropriate styling
- Scene transition animations (fade, cross-dissolve) when location changes
- Image embeds from DM's descriptions (location art, item illustrations)

**Character Sheet (sidebar, collapsible):**
- Tabbed sections: Overview, Combat, Spells, Inventory, Notes
- Overview: Name, race, class, level, XP, background, alignment
- Combat: HP bar (editable), AC, speed, stats (STR/DEX/CON/INT/WIS/CHA), saving throws, skills
- Spells: Known/prepared spells, spell slots (with decrement on cast)
- Inventory: Items grid with weight tracking, equipped items highlighted
- Notes: Freeform text area for session notes
- Editable fields (local state, synced to backend on change)

**Dice Roller (floating panel):**
- Quick buttons: d20, d12, d10, d8, d6, d4
- Custom expression input: "2d6+3"
- Roll animation with physics-based bouncing
- Result displayed prominently with context
- Roll automatically sent to DM and logged

**Action Menu (contextual, bottom):**
- Changes based on game phase:
  - **Exploration**: "Look around", "Move to...", "Talk to...", "Investigate", "Rest"
  - **Combat**: "Attack", "Cast Spell", "Dash", "Dodge", "Help", "Hide", "Use Item", "Disengage"
  - **Social**: Available NPC conversation options from DM
  - **Branch**: When DM presents choices via `branch_choice` action, show as clickable cards

**Chat (OOC channel):**
- Separate from narrative flow
- Collapsible bottom drawer
- Messages from all players and DM
- Timestamps and sender names
- Used for questions, jokes, meta-discussion

**Map View (toggle):**
- Battle grid or exploration map
- Token for player character (draggable in combat)
- Fog of war (DM-controlled visibility)
- Zoom/pan controls
- Canvas-based rendering for performance

### 2.4 Spectator Mode

Spectator mode is like watching a live D&D stream with interactive elements:

- Read-only view of the narrative and combat
- See all dice rolls as they happen
- Follow a specific character's perspective (dropdown to switch)
- Character sheets viewable but not editable
- No input area, no action menu
- Optional: "raise hand" button to request joining as player
- Replays: spectator can scrub back through the action stream
- Count indicator showing live viewers

### 2.5 Game Phase State Machine

```
idle → setup → exploration ↔ social → combat ↔ exploration → wrap-up → idle
                      ↑_______________|           ↑_______________|
```

Each phase changes the available UI elements:

| Phase | DM Tools | Player Tools | Spectator |
|-------|----------|-------------|-----------|
| idle | Create session, invite players | Join session | Browse sessions |
| setup | Load scene, configure NPCs | Create character | - |
| exploration | /describe, /npc, /scene | Look, move, interact | Watch |
| social | /npc, /branch, /insight | Talk, persuade, intimidate | Watch |
| combat | /attack, /roll, /npc | Attack, cast, dodge, item | Watch |
| wrap-up | XP award, loot distribution | Review loot, level up | Watch |

---

## 3. Study Session Interface

### 3.1 Study Session Views

StudyLog.ai sessions have four interaction modes:

| Mode | Purpose | Input |
|------|---------|-------|
| **Lesson** | AI tutor presents material | Listen, read, take notes |
| **Quiz** | Practice questions | Answer questions |
| **Flashcards** | Spaced repetition review | Rate difficulty |
| **Interactive** | Hands-on exercises | Code, draw, manipulate |

### 3.2 Lesson View

**Slide Viewer (center):**
- Presentation-style content area
- Supports text, images, code blocks, diagrams, tables, LaTeX
- Slide transitions: fade, slide-left, slide-up, zoom
- Progress bar showing position in lesson
- Previous/Next navigation (also arrow keys)
- Auto-advance option with configurable speed
- Fullscreen presentation mode

**Whiteboard (overlay, toggleable):**
- Transparent drawing layer on top of slide content
- Drawing tools: pen, highlighter, eraser, shapes, text
- Color palette
- Clear / undo / redo
- AI tutor can draw on whiteboard (via whiteboard actions from backend)
- Coordinate system matches OpenMAIC's 0-1000 × 0-562 range

**Note-Taking Panel (right sidebar):**
- Rich text area for taking notes during lesson
- Auto-saved to IndexedDB
- Timestamps on notes (linked to slide position)
- Export notes as markdown or plain text
- Search within notes
- AI-generated summary at lesson end

**Progress Bar:**
- Shows current slide / total slides
- Estimated time remaining
- Completed sections highlighted
- Clickable to jump to any section

**Speed Control:**
- Slow (0.5x), Normal (1x), Fast (1.5x), Skim (2x)
- Affects TTS narration speed and auto-advance timing
- Per-session preference, remembered

### 3.3 Quiz Mode

**Question Card (center):**
- Question text with optional image/code block
- Answer input area (varies by question type):
  - Multiple choice: clickable option buttons (A/B/C/D)
  - Multiple select: checkboxes
  - Short answer: text input
  - Code input: code editor with syntax highlighting
- Timer bar (configurable per question)
- Submit button (or auto-submit on timer expiry)

**Feedback Display:**
- Correct/incorrect indicator (green ✓ / red ✗)
- Correct answer revealed (if wrong)
- AI-generated explanation
- "Next Question" button or auto-advance
- Difficulty-adjusted next question (adaptive difficulty)

**Score Tracker (top bar):**
- Points earned this session
- Percentage correct
- Streak counter (consecutive correct answers)
- Best streak record
- Leaderboard (if group study session)

**Gamification:**
- XP earned for correct answers (scaled by difficulty)
- Streak bonuses (×2 after 5, ×3 after 10)
- Level-up notifications
- Achievement badges (first perfect score, speed demon, etc.)

### 3.4 Flashcard Mode

**Card Display (center):**
- Large card with front/back
- Click or press Space to flip
- 3D CSS perspective flip animation
- Front: question/prompt
- Back: answer/explanation

**Spaced Repetition:**
- Cards scheduled using SM-2 algorithm (like Anki)
- Due cards shown first
- New cards introduced at configurable rate (5-20/day)
- Review count shown: "12 due · 5 new"

**Difficulty Rating (after flip):**
```
[Again]  [Hard]  [Good]  [Easy]
   1m      10m    1d      4d
```
- Button colors: red, orange, green, blue
- Shows next review interval on hover
- Auto-advances to next card after rating

**Deck Management:**
- Progress: "23/50 cards reviewed"
- Filter: due only, new only, all, by tag
- Statistics: retention rate, average ease, total reviews
- Import/export cards (CSV, Anki format)

### 3.5 Interactive Mode

**Code Playground:**
- Monaco-lite code editor (syntax highlighting only, ~5KB)
- Language detection (Python, JavaScript, etc.)
- Run button sends code to sandbox backend
- Output displayed below editor
- Test cases shown alongside (for guided exercises)

**Interactive Simulations:**
- Physics: adjustable parameters, live visualization (Canvas)
- Math: function graphing, geometry construction
- Chemistry: molecule builder, reaction simulator
- Embedded via iframe from external tools or custom Canvas

**Drag-and-Drop Exercises:**
- Draggable items, drop zones
- Visual feedback on correct/incorrect placement
- Snap-to-grid option
- Score tracking

**Fill-in-the-Blank:**
- Inline text inputs within sentences
- Instant validation on input (green/red border)
- Hint system (progressive reveal)

---

## 4. Preact Component Architecture

### 4.1 Component Tree

```
<SessionShell>
  <TopBar>
    <SessionTitle>
    <PhaseIndicator>
    <Timer>
    <SettingsButton>
    <TTSControls>
  </TopBar>

  <MainContent>
    <ActionRenderer>
      <!-- TTRPG actions -->
      <NarrationBlock>
      <SpeechBubble>
      <DiceRollAnimation>
      <MapCanvas>
      <CombatTracker>
      <BranchChoice>
      <SceneTransition>

      <!-- Study actions -->
      <SlideViewer>
      <WhiteboardCanvas>
      <QuizCard>
      <FlashCard>
      <CodePlayground>
    </ActionRenderer>
  </MainContent>

  <Sidebar>
    <!-- TTRPG -->
    <CharacterSheet>
    <NPCList>
    <InventoryPanel>
    <SpellBook>
    <SceneLibrary>

    <!-- Study -->
    <NotePanel>
    <OutlinePanel>
    <DeckBrowser>
    <Leaderboard>
  </Sidebar>

  <BottomBar>
    <InputArea>
      <TextInput>
      <VoiceInput>
      <ActionButtons>
    <AgentIndicators>
    <PlayerPresence>
  </BottomBar>
</SessionShell>
```

### 4.2 SessionShell

Root component that adapts layout based on domain and view mode.

```javascript
function SessionShell({ domain, viewMode }) {
  return html`
    <div class="session-shell" data-domain=${domain} data-view=${viewMode}>
      <${TopBar} />
      <div class="session-body">
        <${MainContent} domain=${domain} viewMode=${viewMode} />
        <${Sidebar} domain=${domain} viewMode=${viewMode} />
      </div>
      <${BottomBar} domain=${domain} viewMode=${viewMode} />
    </div>
  `;
}
```

### 4.3 ActionRenderer

The core component that maps backend actions to visual components.

```javascript
function ActionRenderer({ actions }) {
  return html`
    <div class="action-stream" role="log" aria-live="polite">
      ${actions.value.map(action => {
        switch (action.type) {
          case 'narration':    return html`<${NarrationBlock} ...${action.params} />`;
          case 'speech':       return html`<${SpeechBubble} ...${action.params} />`;
          case 'dice_roll':    return html`<${DiceRollAnimation} ...${action.params} />`;
          case 'scene_change': return html`<${SceneTransition} ...${action.params} />`;
          case 'slide':        return html`<${SlideViewer} ...${action.params} />`;
          case 'quiz':         return html`<${QuizCard} ...${action.params} />`;
          case 'wb_draw':      return html`<${WhiteboardCanvas} ...${action.params} />`;
          case 'branch_choice':return html`<${BranchChoice} ...${action.params} />`;
          case 'flashcard':    return html`<${FlashCard} ...${action.params} />`;
          case 'combat_start': return html`<${CombatTracker} ...${action.params} />`;
          default:             return null;
        }
      })}
    </div>
  `;
}
```

### 4.4 Domain-Adaptive Sidebar

The sidebar content swaps based on domain:

```javascript
function Sidebar({ domain, viewMode }) {
  if (viewMode === 'spectator') return null;

  return html`
    <aside class="sidebar" data-domain=${domain}>
      ${domain === 'ttrpg'
        ? html`<${TTRPGSidebar} />`
        : html`<${StudySidebar} />`
      }
    </aside>
  `;
}

function TTRPGSidebar() {
  const [activeTab, setActiveTab] = useState('character');
  return html`
    <nav class="sidebar-tabs">
      <button class=${activeTab === 'character' ? 'active' : ''} onclick=${() => setActiveTab('character')}>Character</button>
      <button class=${activeTab === 'npcs' ? 'active' : ''} onclick=${() => setActiveTab('npcs')}>NPCs</button>
      <button class=${activeTab === 'inventory' ? 'active' : ''} onclick=${() => setActiveTab('inventory')}>Items</button>
      <button class=${activeTab === 'spells' ? 'active' : ''} onclick=${() => setActiveTab('spells')}>Spells</button>
    </nav>
    <div class="sidebar-content">
      ${activeTab === 'character' && html`<${CharacterSheet} />`}
      ${activeTab === 'npcs' && html`<${NPCList} />`}
      ${activeTab === 'inventory' && html`<${InventoryPanel} />`}
      ${activeTab === 'spells' && html`<${SpellBook} />`}
    </div>
  `;
}
```

---

## 5. Animation System

### 5.1 Animation Philosophy

- CSS-first: All animations use CSS transitions/keyframes where possible
- JS only for: dice physics, canvas animations, complex sequencing
- Respect `prefers-reduced-motion`: Disable animations when user prefers reduced motion
- Duration: Fast and snappy (200-500ms for UI, 500-1000ms for narrative moments)

### 5.2 Animation Catalog

**Scene Transition (CSS):**
```css
@keyframes scene-fade-in {
  from { opacity: 0; transform: scale(1.02); }
  to   { opacity: 1; transform: scale(1); }
}
[data-action="scene-change"] {
  animation: scene-fade-in 800ms ease-out;
}
```

**Dice Roll Physics (CSS 3D):**
```css
@keyframes dice-roll {
  0%   { transform: rotateX(0deg) rotateY(0deg) scale(1); }
  25%  { transform: rotateX(360deg) rotateY(180deg) scale(1.2) translateY(-30px); }
  50%  { transform: rotateX(720deg) rotateY(360deg) scale(1.1) translateY(-10px); }
  75%  { transform: rotateX(900deg) rotateY(450deg) scale(1.05) translateY(-5px); }
  100% { transform: rotateX(var(--final-x)) rotateY(var(--final-y)) scale(1) translateY(0); }
}
.dice-rolling {
  animation: dice-roll 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
  perspective: 500px;
}
```

**Typewriter Effect (JS + CSS):**
```javascript
function Typewriter({ text, speed = 30 }) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.substring(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text]);
  return html`<span>${displayed}<span class="cursor">|</span></span>`;
}
```

**Card Flip (CSS Perspective):**
```css
.flashcard {
  perspective: 1000px;
}
.flashcard-inner {
  transition: transform 0.6s;
  transform-style: preserve-3d;
}
.flashcard.flipped .flashcard-inner {
  transform: rotateY(180deg);
}
.flashcard-front, .flashcard-back {
  backface-visibility: hidden;
}
.flashcard-back {
  transform: rotateY(180deg);
}
```

**Slide Transitions:**
```css
@keyframes slide-in-right {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0); opacity: 1; }
}
@keyframes slide-fade-in {
  from { transform: scale(0.95); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}
@keyframes slide-zoom-in {
  from { transform: scale(0.8); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}
```

**Floating Damage Numbers:**
```css
@keyframes float-up {
  0%   { transform: translateY(0); opacity: 1; }
  100% { transform: translateY(-60px); opacity: 0; }
}
.damage-number {
  animation: float-up 1.5s ease-out forwards;
  font-weight: bold;
  color: var(--damage-color);
}
```

**Fog of War Reveal:**
```css
@keyframes fog-clear {
  from { filter: blur(8px) brightness(0.3); }
  to   { filter: blur(0) brightness(1); }
}
.map-cell-revealed {
  animation: fog-clear 800ms ease-out forwards;
}
```

### 5.3 Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 6. Real-Time Updates

### 6.1 Transport Strategy

```
Server → Client:  SSE (Server-Sent Events)
Client → Server:  WebSocket (for player actions)
                  or HTTP POST (for DM actions, simpler)
```

**Why SSE for server→client:**
- One-way is sufficient for action stream
- Auto-reconnect built-in
- No WebSocket infrastructure needed for spectators
- Works through most proxies and CDNs
- Simpler than WebSocket for streaming

**Why WebSocket for multiplayer:**
- Players need to send dice rolls, chat messages, actions to all
- Low latency matters for combat turns
- Bidirectional: server pushes to all clients, any client can initiate

### 6.2 SSE Connection

```javascript
class ActionStream {
  constructor(sessionId, since = 0) {
    this.eventSource = new EventSource(`/api/sessions/${sessionId}/stream?since=${since}`);
    this.handlers = new Map();

    this.eventSource.addEventListener('action', (e) => {
      const action = JSON.parse(e.data);
      this.dispatch(action);
    });

    this.eventSource.addEventListener('ping', () => {
      this.lastPing = Date.now();
    });

    this.eventSource.onerror = () => {
      // Auto-reconnect handled by EventSource
      // On reconnect, replay missed actions via since parameter
    };
  }

  on(actionType, handler) {
    if (!this.handlers.has(actionType)) this.handlers.set(actionType, []);
    this.handlers.get(actionType).push(handler);
  }

  dispatch(action) {
    const handlers = this.handlers.get(action.type) || [];
    handlers.forEach(h => h(action));
  }

  close() {
    this.eventSource.close();
  }
}
```

### 6.3 WebSocket Connection

```javascript
class GameSocket {
  constructor(sessionId, token) {
    this.ws = new WebSocket(`wss://${location.host}/ws/${sessionId}`, ['game']);
    this.token = token;
    this.reconnectDelay = 1000;
    this.maxDelay = 30000;

    this.ws.onopen = () => {
      this.ws.send(JSON.stringify({ type: 'auth', token }));
      this.reconnectDelay = 1000;
    };

    this.ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      this.handleMessage(msg);
    };

    this.ws.onclose = () => {
      this.scheduleReconnect();
    };

    this.pendingActions = []; // Queue during disconnect
  }

  send(action) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(action));
    } else {
      this.pendingActions.push(action);
    }
  }

  scheduleReconnect() {
    setTimeout(() => {
      // Reconnect with last known action ID
      this.connect(this.lastActionId);
    }, this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay);
  }
}
```

### 6.4 Reconnection Strategy

1. **SSE reconnect** (automatic): Browser's `EventSource` auto-reconnects with exponential backoff. On reconnect, use `?since=<lastActionId>` to replay missed actions.

2. **WebSocket reconnect**: Manual reconnect with exponential backoff (1s, 2s, 4s, 8s, max 30s). On reconnect:
   - Re-authenticate with token
   - Server sends state snapshot (current phase, combat state, etc.)
   - Replay any pending actions from queue
   - Show "Reconnecting..." toast to user

3. **Offline detection**: `navigator.onLine` events trigger UI state changes:
   - Offline: Show "You're offline" banner, queue actions locally
   - Online: Flush queue, hide banner

### 6.5 Latency Masking (Predictive Rendering)

For actions with predictable outcomes (dice rolls on client's own turn):

```javascript
// Optimistic dice roll
function rollDice(dice, modifier = 0) {
  const result = Math.floor(Math.random() * dice) + 1 + modifier;

  // Show result immediately (optimistic)
  actions.value = [...actions.value, {
    type: 'dice_roll', params: { dice, modifier, result },
    _optimistic: true, _pending: true
  }];

  // Send to server for confirmation
  gameSocket.send({
    type: 'dice_roll', params: { dice, modifier, clientResult: result }
  });

  // Server confirms or overrides
  // If server result differs, animate correction
}
```

For non-predictable actions (DM narration, NPC actions), show a brief "thinking" indicator rather than blocking.

---

## 7. Performance Budget

### 7.1 Bundle Size Budget

| Component | Estimated Size (gzipped) |
|-----------|-------------------------|
| Preact | 4KB |
| preact-signals | 2KB |
| HTM | 1KB |
| SessionShell + TopBar + BottomBar | 2KB |
| ActionRenderer (dispatch) | 1KB |
| NarrationBlock | 0.5KB |
| SpeechBubble | 0.5KB |
| DiceRollAnimation | 1KB |
| SceneTransition | 0.5KB |
| CombatTracker | 2KB |
| CharacterSheet | 1.5KB |
| NPCList | 1KB |
| Sidebar + tabs | 1.5KB |
| InputArea | 1KB |
| ActionStream (SSE) | 0.5KB |
| GameSocket (WebSocket) | 0.5KB |
| IndexedDB cache | 1KB |
| CSS (core + themes) | 3KB |
| Inline SVG icons | 2KB |
| **TTRPG total** | **~27KB** |

Lazy-loaded (not in initial bundle):
| Component | Size | Trigger |
|-----------|------|---------|
| MapCanvas | 3KB | Combat mode starts |
| WhiteboardCanvas | 2KB | Whiteboard toggled on |
| CodePlayground | 5KB | Interactive mode |
| SlideViewer | 2KB | Lesson mode |
| QuizCard | 1.5KB | Quiz mode |
| FlashCard | 1KB | Flashcard mode |

### 7.2 Rendering Performance

**Canvas for heavy rendering:**
- Maps: Canvas 2D (not WebGL — simpler, sufficient for grid-based maps)
- Whiteboards: Canvas 2D
- Dice physics: CSS 3D transforms (no Canvas needed)

**Virtual scrolling:**
- Action stream: Render only visible actions (virtual list)
- Chat history: Virtual list for messages > 100
- NPC list: Not needed (typically < 20 NPCs)
- Flashcard deck: Not needed (one card at a time)

```javascript
function VirtualList({ items, renderItem, itemHeight = 80, overscan = 5 }) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const visibleCount = Math.ceil(containerHeight / itemHeight);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(items.length, startIndex + visibleCount + 2 * overscan);
  const visibleItems = items.slice(startIndex, endIndex);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return html`
    <div class="virtual-list" ref=${containerRef} onscroll=${handleScroll} style="height:100%;overflow-y:auto">
      <div style="height:${totalHeight}px;position:relative">
        <div style="transform:translateY(${offsetY}px)">
          ${visibleItems.map(renderItem)}
        </div>
      </div>
    </div>
  `;
}
```

### 7.3 Lazy Loading Strategy

```javascript
// Dynamic import for heavy components
async function loadMapCanvas() {
  const { MapCanvas } = await import('./components/map-canvas.js');
  return MapCanvas;
}

// Trigger-based loading
function ActionRenderer({ actions }) {
  const [MapCanvas, setMapCanvas] = useState(null);
  const [needsMap, setNeedsMap] = useState(false);

  // Detect when combat starts
  useEffect(() => {
    const hasCombat = actions.value.some(a => a.type === 'combat_start');
    if (hasCombat && !MapCanvas) {
      loadMapCanvas().then(comp => setMapCanvas(() => comp));
      setNeedsMap(true);
    }
  }, [actions.value]);

  // ... render MapCanvas only when loaded and needed
}
```

### 7.4 Offline-First with IndexedDB

```javascript
const dbPromise = idb.openDB('dmlog-session', 1, {
  upgrade(db) {
    db.createObjectStore('actions', { keyPath: 'id' });
    db.createObjectStore('state', { keyPath: 'key' });
  }
});

async function cacheAction(action) {
  const db = await dbPromise;
  await db.put('actions', action);
}

async function getSessionState(sessionId) {
  const db = await dbPromise;
  return db.get('state', sessionId);
}

async function syncSession(sessionId) {
  const db = await dbPromise;
  const cached = await db.getAll('actions');
  // Send cached actions that haven't been confirmed
  const unconfirmed = cached.filter(a => a._pending);
  for (const action of unconfirmed) {
    gameSocket.send(action);
  }
}
```

---

## 8. CSS Architecture

### 8.1 Theme System Extension

Extends the existing `--lo-*` custom properties from UX-DESIGN.md with domain-specific tokens:

```css
/* Base theme (shared, from UX-DESIGN.md) */
:root {
  --lo-bg-primary: #0d1117;
  --lo-bg-secondary: #161b22;
  --lo-bg-tertiary: #21262d;
  --lo-text-primary: #e6edf3;
  --lo-text-secondary: #8b949e;
  --lo-text-muted: #484f58;
  --lo-accent: #58a6ff;
  --lo-accent-hover: #79c0ff;
  --lo-success: #3fb950;
  --lo-error: #f85149;
  --lo-warning: #d29922;
  --lo-border: #30363d;
}

/* TTRPG domain overrides */
[data-domain="ttrpg"] {
  --domain-accent: #c9a227;       /* Gold */
  --domain-accent-hover: #dfc04e;
  --domain-bg-scene: #1a1510;     /* Dark parchment */
  --domain-bg-combat: #1a0a0a;    /* Dark red tint */
  --domain-text-narration: #d4c5a0; /* Warm parchment */
  --domain-text-npc: #a8d8ea;     /* Cool blue for NPC speech */
  --domain-text-dm: #e8d5a3;      /* DM narration */
  --domain-text-combat: #ff6b6b;  /* Combat text */
  --domain-text-loot: #ffd700;    /* Loot highlights */
  --domain-border-panel: #3d3224;
}

/* Study domain overrides */
[data-domain="study"] {
  --domain-accent: #4f8cff;
  --domain-accent-hover: #6ba3ff;
  --domain-bg-slide: #ffffff;
  --domain-text-question: #1f2328;
  --domain-text-explanation: #656d76;
  --domain-border-card: #d0d7de;
}

/* TTRPG light theme */
[data-domain="ttrpg"][data-theme="light"] {
  --domain-bg-scene: #f5f0e6;
  --domain-text-narration: #3d3224;
  --domain-text-npc: #1a5276;
  --domain-text-dm: #4a3f2f;
}
```

### 8.2 Component-Scoped CSS

Use data attributes instead of CSS modules (no build step):

```css
/* Narration block */
[data-action="narration"] {
  padding: var(--lo-space-lg);
  margin-bottom: var(--lo-space-md);
  border-left: 3px solid var(--domain-text-dm);
  background: rgba(232, 213, 163, 0.05);
  font-style: italic;
  line-height: 1.7;
  color: var(--domain-text-narration);
}

/* NPC speech bubble */
[data-action="speech"] {
  display: flex;
  gap: var(--lo-space-sm);
  margin-bottom: var(--lo-space-md);
}

[data-action="speech"] [data-role="npc-portrait"] {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid var(--npc-color, var(--lo-border));
  flex-shrink: 0;
}

[data-action="speech"] [data-role="bubble"] {
  background: var(--lo-bg-tertiary);
  border: 1px solid var(--npc-color, var(--lo-border));
  border-radius: var(--lo-border-radius) var(--lo-border-radius) var(--lo-border-radius) 0;
  padding: var(--lo-space-sm) var(--lo-space-md);
  max-width: 80%;
}

[data-action="speech"] [data-role="speaker-name"] {
  font-size: var(--lo-font-size-sm);
  font-weight: 600;
  color: var(--npc-color, var(--lo-text-secondary));
  margin-bottom: 2px;
}
```

### 8.3 Animation Keyframes File

Separate file for all animation keyframes to keep main CSS clean:

```css
/* animations.css */
@keyframes scene-fade-in { ... }
@keyframes dice-roll { ... }
@keyframes float-up { ... }
@keyframes fog-clear { ... }
@keyframes card-flip { ... }
@keyframes slide-in-right { ... }
@keyframes slide-fade-in { ... }
@keyframes slide-zoom-in { ... }
@keyframes typing-cursor { ... }
@keyframes pulse { ... }
@keyframes spin { ... }
@keyframes shake { ... }  /* For critical hits / failures */
@keyframes glow { ... }   /* For magic effects */

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 8.4 Layout System

```css
.session-shell {
  display: grid;
  grid-template-rows: auto 1fr auto;
  grid-template-columns: 1fr var(--sidebar-width, 320px);
  height: 100vh;
  overflow: hidden;
}

.session-body {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 1fr var(--sidebar-width, 320px);
  overflow: hidden;
}

.top-bar {
  grid-column: 1 / -1;
}

.main-content {
  overflow-y: auto;
  padding: var(--lo-space-lg);
}

.sidebar {
  border-left: 1px solid var(--lo-border);
  background: var(--lo-bg-secondary);
  overflow-y: auto;
}

.bottom-bar {
  grid-column: 1 / -1;
  border-top: 1px solid var(--lo-border);
  background: var(--lo-bg-secondary);
}

/* Sidebar collapsed */
.session-shell[data-sidebar-collapsed] .session-body {
  grid-template-columns: 1fr;
}
.session-shell[data-sidebar-collapsed] .sidebar {
  display: none;
}

/* Mobile: stack vertically */
@media (max-width: 768px) {
  .session-body {
    grid-template-columns: 1fr;
  }
  .sidebar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 50vh;
    border-left: none;
    border-top: 1px solid var(--lo-border);
    z-index: 100;
    transform: translateY(100%);
    transition: transform var(--lo-transition);
  }
  .sidebar.open {
    transform: translateY(0);
  }
}
```

---

## 9. TTS Integration

### 9.1 Web Speech API Usage

```javascript
class NarrationTTS {
  constructor() {
    this.synth = window.speechSynthesis;
    this.available = !!this.synth;
    this.voices = this.synth?.getVoices() || [];
    this.speaking = signal(false);
    this.currentVoice = signal(null);
    this.rate = signal(1.0);
    this.pitch = signal(1.0);
  }

  speak(text, options = {}) {
    if (!this.available) return;
    this.synth.cancel(); // Stop current

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = options.voice || this.currentVoice.value;
    utterance.rate = options.rate || this.rate.value;
    utterance.pitch = options.pitch || this.pitch.value;

    utterance.onstart = () => { this.speaking.value = true; };
    utterance.onend = () => { this.speaking.value = false; };
    utterance.onerror = () => { this.speaking.value = false; };

    this.synth.speak(utterance);
  }

  pause() { this.synth?.pause(); }
  resume() { this.synth?.resume(); }
  stop() { this.synth?.cancel(); this.speaking.value = false; }
}
```

### 9.2 Per-Character Voice Selection

```javascript
// NPC voice assignments stored in session config
const npcVoices = {
  'npc-guard':    { voice: 'Daniel', pitch: 0.8, rate: 0.9 },   // Deep, gruff
  'npc-merchant': { voice: 'Samantha', pitch: 1.2, rate: 1.1 }, // Bright, friendly
  'npc-stranger': { voice: 'Alex', pitch: 0.6, rate: 0.8 },     // Low, mysterious
  'dm-narrator':  { voice: 'Karen', pitch: 1.0, rate: 0.95 },   // Neutral, clear
};

function speakNPC(npcId, text) {
  const voiceConfig = npcVoices[npcId] || npcVoices['dm-narrator'];
  tts.speak(text, voiceConfig);
}
```

### 9.3 TTS Controls Component

```javascript
function TTSControls() {
  const [enabled, setEnabled] = useState(true);
  const [muted, setMuted] = useState(false);

  return html`
    <div class="tts-controls">
      <button onclick=${() => setEnabled(!enabled)} title="Toggle TTS">
        ${enabled ? '🔊' : '🔇'}
      </button>
      ${enabled && html`
        <button onclick=${() => setMuted(!muted)}>
          ${muted ? '🔇' : '🔈'}
        </button>
        <button onclick=${() => muted ? tts.resume() : tts.pause()}>
          ${tts.speaking.value ? '⏸' : '▶'}
        </button>
        <input
          type="range"
          min="0.5" max="2" step="0.1"
          value=${tts.rate.value}
          oninput=${(e) => tts.rate.value = parseFloat(e.target.value)}
          title="Speed"
        />
      `}
      ${tts.speaking.value && html`
        <span class="tts-indicator">Speaking...</span>
      `}
    </div>
  `;
}
```

### 9.4 Visual Speaking Indicator

```css
.tts-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: rgba(88, 166, 255, 0.1);
  border-radius: 12px;
  font-size: 0.75rem;
  color: var(--lo-accent);
}

.tts-indicator::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--lo-accent);
  animation: pulse 1s infinite;
}

/* Highlight narration block being spoken */
[data-action="narration"][data-speaking="true"] {
  border-left-color: var(--lo-accent);
  background: rgba(88, 166, 255, 0.05);
}
```

### 9.5 Fallback

If `window.speechSynthesis` is unavailable:

1. Hide TTS controls
2. Show all text immediately (no typewriter delay)
3. Add small info tooltip: "Text-to-speech not available in this browser"

---

## 10. Devil's Advocate

### 10.1 "Preact + HTM is too limiting for canvas-heavy features"

**Counterargument:** HTM's tagged templates are hard to debug for complex components. No TypeScript in templates. No HMR during development. React with JSX and a Vite build step would be more maintainable.

**Rebuttal:** The canvas-heavy components (MapCanvas, WhiteboardCanvas) don't use JSX at all — they're imperative Canvas API calls wrapped in a thin Preact component. The HTML templating is only for the DOM-based UI (sidebar, inputs, cards). For those, HTM is perfectly adequate. The existing log-origin codebase already proves this pattern works. If we ever need TypeScript support, we can add a Vite build step — the components don't need to change, just the import mechanism.

### 10.2 "Canvas API is too slow for complex maps; need WebGL"

**Counterargument:** Grid-based battle maps with 50+ tokens, fog of war, and animation need WebGL for 60fps. Canvas 2D will stutter.

**Rebuttal:** D&D-style battle maps are typically 20×20 to 40×40 grids — that's 400-1600 cells. Canvas 2D handles this at 60fps trivially on modern hardware. The bottleneck is never rendering speed, but network latency for multiplayer token positions. WebGL would add 50KB+ to the bundle (via PixiJS or similar) and complexity for minimal gain. If we need GPU acceleration later, OffscreenCanvas + Web Worker is the upgrade path, not WebGL.

### 10.3 "Single-page app is wrong; need native mobile app"

**Counterargument:** Spectator mode and quick dice rolls are perfect for mobile, but a web app can't access vibration, push notifications, or camera for AR map features.

**Rebuttal:** For Phase 1, the web app covers 90% of use cases. PWA with `manifest.json` + service worker gives us: home screen icon, offline support, background sync, vibration API (for dice rolls), and push notifications. Native app (React Native or Capacitor) is a Phase 3 consideration, not Phase 1. The PWA approach also avoids App Store review for rapid iteration.

### 10.4 "Desktop game night vs. phone spectator are too different to share one UI"

**Counterargument:** A DM console needs a 1920px layout with multiple panels. A phone spectator needs a single-column story view. Trying to make one responsive UI for both will create a mediocre experience for both.

**Rebuttal:** This is a valid concern. The solution is **view modes**, not separate apps. The `SessionShell` detects viewport and role:
- `viewMode="dm"` + viewport > 1024px → Full three-column console
- `viewMode="dm"` + viewport < 1024px → Collapsible panels, simplified controls
- `viewMode="player"` + viewport > 768px → Two-column (content + sidebar)
- `viewMode="player"` + viewport < 768px → Single column, drawer sidebar
- `viewMode="spectator"` → Read-only, single column always

The DM console on mobile is intentionally limited — DMs should use desktop. The CSS Grid layout system handles this cleanly with breakpoints, no separate codebase needed.

### 10.5 "SSE + WebSocket is overly complex; just use WebSocket for everything"

**Counterargument:** Running two transport protocols doubles the connection management complexity. WebSocket alone handles both directions.

**Rebuttal:** Spectators don't need WebSocket — they only receive data. SSE is simpler (no handshake, auto-reconnect, works through proxies). The complexity of two transports is minimal (~50 lines each) and the benefit is significant: spectators use SSE only, players use WebSocket, and the server handles both. If we wanted to simplify, we could use WebSocket for everyone, but SSE is better for the 80% case (spectators).

### 10.6 "30KB budget is unrealistic with all these features"

**Counterargument:** CombatTracker alone with HP bars, conditions, initiative ordering, drag-and-drop will be 5KB+. Add MapCanvas, Whiteboard, and the rest, we're looking at 60KB+.

**Rebuttal:** The 30KB budget is for the **initial load** — the core experience of joining a game, viewing narration, and rolling dice. Everything else (maps, whiteboards, combat tracker) is lazy-loaded only when needed. A player who just joined an exploration-phase game loads ~20KB. A DM loads ~25KB (plus combat tracker when combat starts). The total application code may be 60KB, but only 30KB loads upfront.

---

## 11. Wireframes

### 11.1 DM Console (Desktop, 1920px)

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ ⚔ The Lost Mine    [⏱ 2h 14m]   Phase: EXPLORATION    🔊 TTS  🎵 Music  ⚙ Settings│
├───────────┬──────────────────────────────────────────────┬───────────────────────────┤
│           │                                              │ NPCs  Combat  Scenes      │
│  SCENE    │         MAIN CANVAS                         │ ──────────────────────    │
│  LIBRARY  │                                              │ ┌─────────────────────┐  │
│           │   ╔══════════════════════════════════╗       │ │ 🧙 Eldrin (Wizard)  │  │
│ 🏰 Tavern │   ║                              ║       │ │ HP: ████████░░ 32/45│  │
│ 🌲 Forest │   ║   You enter the dimly lit     ║       │ │ Conditions: none     │  │
│ ⛰ Mountain│   ║   tavern. The smell of pipe   ║       │ └─────────────────────┘  │
│ 🕳 Dungeon│   ║   smoke and ale fills the     ║       │ ┌─────────────────────┐  │
│ 🏙 Town   │   ║   air. A gruff-looking        ║       │ │ 🛡 Brom (Fighter)    │  │
│ 🏠 Inn    │   ║   guard eyes you from the     ║       │ │ HP: █████████░ 58/60│  │
│           │   ║   corner booth...             ║       │ │ 🗡️ Ready             │  │
│ ────────  │   ║                              ║       │ └─────────────────────┘  │
│           │   ║  [Tavern illustration]        ║       │ ┌─────────────────────┐  │
│ PLAYERS   │   ║                              ║       │ │ 🗣 Mira (Merchant)   │  │
│           │   ╚══════════════════════════════════╝       │ │ Friendly · Greedy    │  │
│ 🟢 Aria   │                                              │ └─────────────────────┘  │
│ 🟢 Thorin │   🧙 Eldrin: "Welcome, travelers.     │       │                         │
│ 🟢 Lyra   │   I've been expecting you..."              │ [+ Add NPC]              │
│ 🟡 DM     │                                              │                         │
│           │   [Scene: tavern_v2.jpg]                     │                         │
│           │                                              │                         │
├───────────┴──────────────────────────────────────────────┼───────────────────────────┤
│ Quick: [/describe] [/npc] [/roll] [/scene] [/ambient]   │ DICE TRAY                │
│ ┌────────────────────────────────────────────────────┐  │ [d4][d6][d8][d10][d12]  │
│ │ Type a command or description...              [▶] │  │ [d20]  [Adv] [Disadv]   │
│ └────────────────────────────────────────────────────┘  │ Modifier: [___]          │
│                                                         │ Last: d20+5 = 17 ✨     │
└─────────────────────────────────────────────────────────┴──────────────────────────┘
```

### 11.2 Player Interface (Desktop, 1280px)

```
┌────────────────────────────────────────────────────────────────────┐
│ 🎲 The Lost Mine  │  Exploration  │  ⏱ 2h 14m  │  🔊  ⚙          │
├────────────────────────────────────────────┬───────────────────────┤
│                                            │ CHARACTER            │
│  The tavern is dimly lit, smelling of     │ ─────────────────    │
│  pipe smoke and stale ale. A gruff guard  │ Aria · Elf Ranger · 5│
│  watches from the corner booth. The       │ HP ████████░░ 32/45  │
│  barkeep polishes a tankard behind the    │ AC 15 · Speed 30ft   │
│  counter, pretending not to notice the    │                      │
│  tension in the room.                     │ [Combat][Stats][Inv] │
│                                            │ [Spells][Notes]      │
│  🧙 Eldrin leans forward, his eyes       │                      │
│  twinkling in the candlelight:            │ STR 8  DEX 16       │
│                                            │ CON 14 INT 12       │
│  "Welcome, travelers. I've been expecting │ WIS 14 CHA 10       │
│  you. The road ahead is dangerous, but    │                      │
│  the reward... well, it's worth the       │ [Edit Character]     │
│  risk, wouldn't you say?"                  │                      │
│                                            │──────────────────────│
│                                            │ OOC Chat             │
│  ─────────────────────────────────────    │ Thorin: lol nice     │
│                                            │ Lyra: I inspect the  │
│  🎲 You rolled Perception (d20+7): 17 ✨  │        guard         │
│  ─────────────────────────────────────    │ Aria: *rolls dice*   │
│                                            │                      │
│  ┌──────────────────────────────────┐     │                      │
│  │ [Look around] [Talk to NPC]     │     │                      │
│  │ [Investigate] [Move to...]      │     │                      │
│  │ [Rest]           [Roll dice]    │     │                      │
│  └──────────────────────────────────┘     │                      │
├────────────────────────────────────────────┴───────────────────────┤
│ ┌──────────────────────────────────────────────────────────────┐  │
│ │ What do you want to do?                               [🎲]  │  │
│ └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

### 11.3 Player Interface (Mobile, 375px)

```
┌─────────────────────┐
│ 🎲 The Lost Mine  ⚙│
├─────────────────────┤
│                     │
│ The tavern is dimly │
│ lit, smelling of    │
│ pipe smoke...       │
│                     │
│ 🧙 Eldrin:         │
│ "Welcome, travelers.│
│ I've been expecting │
│ you..."             │
│                     │
│ ┌─────────────────┐ │
│ │ 🎲 d20+7 = 17  │ │
│ │   Perception ✓  │ │
│ └─────────────────┘ │
│                     │
│ [Look] [Talk] [🔍] │
│ [Move] [Rest] [🎲] │
│                     │
│     [▼ OOC Chat]   │
│                     │
│ ───────────────────│
│ HP: ████████░ 32/45│
│ [Character Sheet]  │
├─────────────────────┤
│ Type action...  [▶]│
└─────────────────────┘
```

### 11.4 Spectator Mode (Desktop)

```
┌──────────────────────────────────────────────────────────────────────┐
│ 👁 SPECTATING  │ The Lost Mine  │  ⏱ 2h 14m  │  Viewers: 12  │  ⚙│
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ Following: [Aria ▼]   [🧙 Eldrin] [🛡 Brom] [🗡 Mira]              │
│                                                                      │
│  The tavern is dimly lit, smelling of pipe smoke and stale ale.     │
│                                                                      │
│  🧙 Eldrin leans forward: "Welcome, travelers. I've been           │
│  expecting you..."                                                  │
│                                                                      │
│  ──────────────────────────────────────────────────────────────     │
│                                                                      │
│  🎲 Aria rolled Perception (d20+7): 17 ✨                           │
│  🎲 Thorin rolled Insight (d20+2): 8                                │
│                                                                      │
│  ──────────────────────────────────────────────────────────────     │
│                                                                      │
│  🛡 Brom draws his sword. "Nobody move."                             │
│                                                                      │
│  🗣 Mira: "Now, now, let's not be hasty..."                         │
│                                                                      │
│                                                                      │
│                                                                      │
│                                                                      │
│                                                                      │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│  ┌─ Game Log ──────────────────────────────────────────────────────┐│
│  │ 2:14 - Eldrin narrated scene                                  ││
│  │ 2:15 - Aria rolled Perception: 17                             ││
│  │ 2:16 - Thorin rolled Insight: 8                               ││
│  │ 2:17 - Brom initiated combat                                  ││
│  └────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────┘
```

### 11.5 Study Session View (Desktop)

```
┌──────────────────────────────────────────────────────────────────────┐
│ 📚 Data Structures  │  Lesson 3: Trees  │  Slide 5/12  │  🔊 1x  ⚙│
├──────────────────────────────────────────────┬───────────────────────┤
│                                              │ NOTES                │
│  ╔════════════════════════════════════╗      │ ─────────────────    │
│  ║  Binary Search Trees                ║      │ • BST: left < root  │
│  ║                                     ║      │   < right           │
│  ║       8                             ║      │ • Search: O(log n)   │
│  ║      / \                            ║      │ • Worst case: O(n)  │
│  ║     3   10                          ║      │   (skewed tree)     │
│  ║    / \   \                          ║      │                      │
│  ║   1   6   14                        ║      │ [AI teacher drawing  │
│  ║                                     ║      │  the tree on the    │
│  ║  Properties:                        ║      │  whiteboard...]     │
│  ║  • Left subtree < node              ║      │                      │
│  ║  • Right subtree > node             ║      │                      │
│  ║  • Both subtrees are BSTs           ║      │                      │
│  ║                                     ║      │                      │
│  ╚════════════════════════════════════╝      │                      │
│                                              │──────────────────────│
│  ●●●●●○○○○○○○  (5/12)                      │ OUTLINE              │
│  [← Previous]              [Next →]          │ 1. Intro             │
│                                              │ 2. Trees basics      │
│  ────────────────────────────────────       │ 3. BST ◄             │
│                                              │ 4. AVL trees         │
│  🤖 AI Tutor is speaking...                  │ 5. Red-black trees   │
│                                              │ 6. Practice quiz     │
│                                              │                      │
├──────────────────────────────────────────────┴───────────────────────┤
│ ┌──────────────────────────────────────────────────────────────────┐│
│ │ Ask a question...                                           [▶] ││
│ └──────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────┘
```

### 11.6 Quiz Mode (Mobile, 375px)

```
┌─────────────────────┐
│ 📝 Quiz   ⚡ Streak 3│
│ Score: 85/100       │
│ ████████░░░ 8/10    │
├─────────────────────┤
│                     │
│ ⏱ 0:25             │
│ ████████████░░░░░░  │
│                     │
│ What is the time    │
│ complexity of       │
│ searching in a      │
│ balanced BST?       │
│                     │
│ ┌─────────────────┐ │
│ │ ○ O(n)          │ │
│ │ ○ O(n log n)    │ │
│ │ ● O(log n)      │ │
│ │ ○ O(1)          │ │
│ └─────────────────┘ │
│                     │
│                     │
│    [Submit Answer]  │
│                     │
│                     │
│                     │
│                     │
│                     │
├─────────────────────┤
│ [Skip] [Hint?] [📚]│
└─────────────────────┘
```

### 11.7 Combat Tracker (DM, Desktop Overlay)

```
┌─ COMBAT ─────────────────────────────────────────────────┐
│ Round 3 Initiative                                        │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ ▶ 🛡 Brom     Init: 16   HP ██████████ 58/60  —    │ │
│ │   🗡️ Goblin-1 Init: 14   HP ██████░░░░ 18/30  🗡️  │ │
│ │   🧙 Eldrin   Init: 12   HP ████████░░ 32/45  —    │ │
│ │ ▷ 🏹 Aria      Init: 11   HP ████████░░ 32/45  —    │ │
│ │   🗡️ Goblin-2 Init:  9   HP █████░░░░░ 12/30  😵   │ │
│ │   ⚔ Thorin    Init:  7   HP ████████░░ 42/50  🛡️  │ │
│ │   🗣 Mira     Init:  5   HP █████████░ 25/25  —    │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ Quick: [Attack] [Cast Spell] [Heal] [Condition] [End]   │
└──────────────────────────────────────────────────────────┘
```

### 11.8 Flashcard Mode (Desktop)

```
┌──────────────────────────────────────────────────────────────────────┐
│ 🃏 Flashcards  │  Data Structures  │  12 due · 3 new  │  ⚙          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                    ┌────────────────────────────┐                     │
│                    │                            │                     │
│                    │    What is the worst-case  │                     │
│                    │    time complexity of      │                     │
│                    │    QuickSort?              │                     │
│                    │                            │                     │
│                    │                            │                     │
│                    │                            │                     │
│                    │         [Click to flip]     │                     │
│                    │                            │                     │
│                    │                            │                     │
│                    │                            │                     │
│                    └────────────────────────────┘                     │
│                                                                      │
│                                                                      │
│    Progress: ████████░░░░░░░░░░░░ 23/50 cards reviewed              │
│                                                                      │
│    Retention today: 91%  │  New cards: 2/3 learned                 │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
│ (After flip)                                                         │
│                    ┌────────────────────────────┐                     │
│                    │                            │                     │
│                    │    O(n²) — occurs when     │                     │
│                    │    the pivot is always     │                     │
│                    │    the min or max element  │                     │
│                    │                            │                     │
│                    └────────────────────────────┘                     │
│                                                                      │
│    [🔴 Again]  [🟠 Hard]  [🟢 Good]  [🔵 Easy]                    │
│      1m          10m         1d          4d                          │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 12. Component Specs

### 12.1 NarrationBlock

| Property | Value |
|----------|-------|
| **Renders** | DM narrative text from `narration` actions |
| **State** | `{ text, speaking: bool }` |
| **Behavior** | Typewriter effect, TTS auto-play, highlight when speaking |
| **CSS** | Left border, italic, warm parchment color, TTS highlight state |

### 12.2 SpeechBubble

| Property | Value |
|----------|-------|
| **Renders** | NPC or player dialogue from `speech` actions |
| **Props** | `{ speakerName, speakerColor, portraitUrl, text }` |
| **State** | `{ speaking: bool }` |
| **Behavior** | TTS with NPC voice, animated entrance, typewriter for text |
| **CSS** | Bubble with colored border, portrait circle, name label |

### 12.3 DiceRollAnimation

| Property | Value |
|----------|-------|
| **Renders** | Dice roll results from `dice_roll` actions |
| **Props** | `{ dice, modifier, result, reason, roller }` |
| **State** | `{ rolling: bool, showResult: bool }` |
| **Behavior** | 3D CSS animation → result reveal → float up if damage |
| **Duration** | 1.2s animation, 2s display |

### 12.4 MapCanvas

| Property | Value |
|----------|-------|
| **Renders** | Battle grid / exploration map |
| **Tech** | Canvas 2D API |
| **Props** | `{ gridWidth, gridHeight, tileSize, tokens[], fogOfWar[] }` |
| **Features** | Pan/zoom, token drag, fog reveal animation |
| **Lazy** | Yes — loaded on combat_start |
| **Size** | ~3KB gzipped |

### 12.5 CombatTracker

| Property | Value |
|----------|-------|
| **Renders** | Initiative order, HP bars, conditions |
| **Props** | `{ combatants[], currentTurnIndex, round }` |
| **Features** | Drag-to-reorder, condition toggles, HP edit |
| **Modes** | DM: full edit, Player: view own entry, Spectator: read-only |

### 12.6 SlideViewer

| Property | Value |
|----------|-------|
| **Renders** | Presentation slides from `slide` actions |
| **Props** | `{ slides[], currentSlide, transition }` |
| **Features** | Transition animations, fullscreen, progress bar, keyboard nav |

### 12.7 QuizCard

| Property | Value |
|----------|-------|
| **Renders** | Quiz question from `quiz` actions |
| **Props** | `{ question, options, type, timer, points }` |
| **State** | `{ selectedAnswer, submitted, isCorrect }` |
| **Features** | Timer bar, immediate feedback, score update, streak counter |

### 12.8 FlashCard

| Property | Value |
|----------|-------|
| **Renders** | Flashcard from `flashcard` actions |
| **Props** | `{ front, back, deckId, cardId, ease }` |
| **State** | `{ flipped: bool }` |
| **Features** | 3D flip animation, difficulty rating, SM-2 scheduling |

### 12.9 WhiteboardCanvas

| Property | Value |
|----------|-------|
| **Renders** | Drawing overlay for study sessions |
| **Tech** | Canvas 2D API |
| **Props** | `{ isOpen, tool, color, strokeWidth }` |
| **Features** | Pen, highlighter, eraser, shapes, undo/redo |
| **Lazy** | Yes — loaded on toggle |
| **Size** | ~2KB gzipped |

### 12.10 SceneTransition

| Property | Value |
|----------|-------|
| **Renders** | Full-canvas scene change effect |
| **Props** | `{ from, to, imageUrl, description }` |
| **Behavior** | Background crossfade, optional ken-burns on image, narration sync |

### 12.11 BranchChoice

| Property | Value |
|----------|-------|
| **Renders** | Player choice cards from `branch_choice` actions |
| **Props** | `{ choices[], prompt }` |
| **State** | `{ selected: string \| null }` |
| **Behavior** | Cards animate in, hover effects, click to select, send to server |

### 12.12 CodePlayground

| Property | Value |
|----------|-------|
| **Renders** | Code editor + output for interactive mode |
| **Props** | `{ language, starterCode, testCases }` |
| **Features** | Syntax highlighting (regex-based, no Monaco), run button, output display |
| **Lazy** | Yes — loaded on interactive mode |
| **Size** | ~5KB gzipped |

### 12.13 CharacterSheet

| Property | Value |
|----------|-------|
| **Renders** | Player character stats (TTRPG sidebar tab) |
| **Tabs** | Overview, Combat, Spells, Inventory, Notes |
| **State** | Local edits synced on blur to backend |
| **Modes** | Player: editable own sheet, Spectator: read-only |

### 12.14 NPCList

| Property | Value |
|----------|-------|
| **Renders** | Active NPCs with portraits and status (DM sidebar tab) |
| **Props** | `{ npcs[] }` |
| **Features** | Portrait, name, HP bar, condition badges, click for actions |

---

## 13. State Management

### 13.1 Global Signals

```javascript
import { signal, computed, effect } from 'preact/signals';

// Session
export const sessionId = signal(null);
export const domain = signal('ttrpg');       // 'ttrpg' | 'study'
export const viewMode = signal('player');    // 'dm' | 'player' | 'spectator'
export const gamePhase = signal('exploration'); // 'idle'|'setup'|'exploration'|'social'|'combat'|'wrap-up'

// Real-time
export const actions = signal([]);           // Action stream (append-only)
export const connectionState = signal('connected'); // 'connected'|'reconnecting'|'offline'

// UI state
export const sidebarOpen = signal(true);
export const sidebarTab = signal('character');
export const overlay = signal(null);         // 'combat'|'dice'|'settings'|null

// TTRPG state
export const combatState = signal(null);     // { combatants[], round, currentTurn }
export const scene = signal(null);           // { id, name, imageUrl, description }
export const activeNPCs = signal([]);

// Study state
export const currentSlide = signal(0);
export const quizState = signal(null);       // { question, selected, submitted, score, streak }
export const flashcardState = signal(null);  // { front, back, flipped, deckProgress }

// TTS
export const ttsEnabled = signal(true);
export const ttsMuted = signal(false);
export const ttsSpeaking = signal(false);
export const ttsRate = signal(1.0);
```

### 13.2 Derived State

```javascript
// Auto-collapse sidebar on mobile
effect(() => {
  if (window.innerWidth < 768) {
    sidebarOpen.value = false;
  }
});

// Phase-dependent quick actions
const quickActions = computed(() => {
  if (domain.value !== 'ttrpg') return [];
  switch (gamePhase.value) {
    case 'exploration': return ['/describe', '/npc', '/scene', '/ambient'];
    case 'combat': return ['/attack', '/roll', '/spell', '/heal', '/endturn'];
    case 'social': return ['/npc', '/branch', '/insight'];
    default: return ['/describe', '/npc', '/roll'];
  }
});

// Connection status indicator
const connectionStatus = computed(() => {
  switch (connectionState.value) {
    case 'connected': return { icon: '🟢', text: 'Connected' };
    case 'reconnecting': return { icon: '🟡', text: 'Reconnecting...' };
    case 'offline': return { icon: '🔴', text: 'Offline — actions queued' };
  }
});
```

---

## 14. Open Questions

1. **Map grid size limits**: What's the max grid size we need to support? 40×40 seems reasonable, but some DMs might want 100×100 for overland maps. Canvas 2D handles both, but token count and fog data size grow linearly.

2. **Dice roll fairness**: Client-side dice rolls are trivially spoofable. Should we implement server-side rolling for combat (trust is needed), or is honor system sufficient for a casual game? Hybrid: player rolls are client-side (fun), DM can request server-verified rolls.

3. **Spectator replay**: Should spectators be able to scrub back through the action stream? This requires storing the full action history server-side and a seekable replay UI. Worth it for "watch past sessions" feature.

4. **Spaced repetition persistence**: Flashcard SM-2 state needs to persist across devices. IndexedDB is local-only; need a sync endpoint for cross-device progress.

5. **Code playground sandbox**: Running user-submitted code requires a sandboxed environment. Options: WebAssembly (Pyodide for Python), server-side Docker containers, or restricted subset (no file I/O, no network). Phase 1 could skip actual execution and just validate syntax.

6. **Ambient audio licensing**: DM's music/atmosphere feature needs legal audio sources. Options: user uploads (copyright risk), integration with licensed libraries (epidemicsound, artlist), or AI-generated ambient audio.

7. **Whiteboard collaboration**: Should multiple participants draw on the same whiteboard simultaneously (study sessions)? This requires conflict resolution (last-write-wins, operational transforms, or CRDT). For Phase 1, whiteboard is DM/teacher-only.

8. **Mobile DM experience**: The wireframes assume DM uses desktop. Should we support a "quick DM" mode on mobile for running simple encounters? Or is this a desktop-only feature? Recommendation: Desktop-only for Phase 1, with a mobile companion app for dice rolls and character sheet viewing.

---

## Appendix A: Action Type Reference

### TTRPG Actions

| Action | Params | Component | Blocking? |
|--------|--------|-----------|-----------|
| `narration` | `{ text, speaker? }` | NarrationBlock | Yes (TTS) |
| `speech` | `{ speakerId, speakerName, speakerColor, portraitUrl, text }` | SpeechBubble | Yes (TTS) |
| `dice_roll` | `{ dice, modifier, result, reason, roller }` | DiceRollAnimation | No |
| `scene_change` | `{ sceneId, name, imageUrl, description }` | SceneTransition | Yes (transition) |
| `npc_appear` | `{ npcId, name, portraitUrl, hp, conditions }` | NPCList | No |
| `npc_leave` | `{ npcId }` | NPCList | No |
| `combat_start` | `{ combatants[], mapConfig? }` | CombatTracker + MapCanvas | Yes |
| `combat_end` | `{ reason }` | CombatTracker (hide) | No |
| `turn_next` | `{ turnIndex }` | CombatTracker | No |
| `stat_change` | `{ targetId, stat, oldValue, newValue }` | CharacterSheet | No |
| `inventory_update` | `{ targetId, item, action }` | InventoryPanel | No |
| `ambient_play` | `{ trackUrl, volume, fadeMs? }` | AmbientPlayer | No |
| `branch_choice` | `{ prompt, choices[] }` | BranchChoice | Yes (wait for pick) |

### Study Actions

| Action | Params | Component | Blocking? |
|--------|--------|-----------|-----------|
| `slide` | `{ slides[], currentIndex, transition? }` | SlideViewer | No |
| `slide_next` | `{ index }` | SlideViewer | No |
| `quiz` | `{ question, options, type, timer?, points? }` | QuizCard | Yes (wait for answer) |
| `flashcard` | `{ front, back, cardId, deckId, ease? }` | FlashCard | Yes (wait for rate) |
| `wb_open` | `{}` | WhiteboardCanvas | No |
| `wb_draw` | `{ tool, x, y, ... }` | WhiteboardCanvas | No |
| `wb_close` | `{}` | WhiteboardCanvas | No |
| `code_exercise` | `{ language, starterCode, testCases }` | CodePlayground | Yes (wait for submit) |
| `discussion` | `{ agentIds, prompt }` | (roundtable) | Yes |

---

## Appendix B: File Structure

```
web/
├── index.html
├── app.js                    # Root, routing, global signals
├── style.css                 # Core styles + theme variables
├── animations.css            # All keyframe animations
├── components/
│   ├── session-shell.js      # Root layout adapter
│   ├── top-bar.js            # Title, phase, timer, TTS, settings
│   ├── bottom-bar.js         # Input area, action buttons
│   ├── action-renderer.js    # Action dispatch → component mapping
│   ├── sidebar.js            # Generic sidebar with tab system
│   │
│   ├── ttrpg/
│   │   ├── narration-block.js
│   │   ├── speech-bubble.js
│   │   ├── dice-roll.js
│   │   ├── scene-transition.js
│   │   ├── combat-tracker.js
│   │   ├── branch-choice.js
│   │   ├── character-sheet.js
│   │   ├── npc-list.js
│   │   ├── inventory-panel.js
│   │   ├── spell-book.js
│   │   ├── scene-library.js
│   │   ├── map-canvas.js         # Lazy-loaded
│   │   └── ambient-player.js
│   │
│   └── study/
│       ├── slide-viewer.js
│       ├── quiz-card.js
│       ├── flash-card.js
│       ├── whiteboard-canvas.js  # Lazy-loaded
│       ├── code-playground.js    # Lazy-loaded
│       ├── note-panel.js
│       ├── outline-panel.js
│       └── leaderboard.js
│
├── services/
│   ├── action-stream.js       # SSE connection
│   ├── game-socket.js         # WebSocket connection
│   ├── tts.js                 # Web Speech API wrapper
│   ├── cache.js               # IndexedDB session cache
│   └── virtual-list.js        # Virtual scrolling utility
│
└── themes/
    ├── ttrpg-dark.css
    ├── ttrpg-light.css
    ├── study-dark.css
    └── study-light.css
```

---

## Appendix C: Keyboard Shortcuts

### Global

| Shortcut | Action |
|----------|--------|
| `Esc` | Close overlay / exit combat view |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+/` | Toggle settings |

### TTRPG

| Shortcut | Action | Context |
|----------|--------|---------|
| `Ctrl+D` | Quick dice roll (d20) | Anywhere |
| `Ctrl+Shift+D` | Roll with advantage | Anywhere |
| `Space` | Pause/resume TTS | Anywhere |
| `1-6` | Roll d4/d6/d8/d10/d12/d20 | Dice tray open |
| `N` | Next turn (combat) | Combat mode, DM |
| `M` | Toggle map view | Anywhere |
| `C` | Toggle combat tracker | Combat mode |
| `T` | Toggle OOC chat | Player mode |

### Study

| Shortcut | Action | Context |
|----------|--------|---------|
| `←` / `→` | Previous/next slide | Lesson view |
| `Space` | Flip flashcard | Flashcard mode |
| `1-4` | Rate flashcard (again/hard/good/easy) | After flip |
| `Tab` | Toggle whiteboard | Lesson view |
| `W` | Toggle whiteboard | Lesson view |
