import type { FeedbackRating } from '../types.js';

// ─── Constants ─────────────────────────────────────────────────────────────

const FEEDBACK_THRESHOLD_FOR_RULE_CREATION = 5;
const CONFIRMING_EVENTS_FOR_AUTO_ENABLE = 10;

// ─── Record feedback ───────────────────────────────────────────────────────

/**
 * Record user feedback (thumbs up/down) for an interaction.
 */
export async function recordFeedback(
  db: D1Database,
  interactionId: string,
  rating: FeedbackRating,
): Promise<{ id: string; createdAt: string }> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO feedback (id, interaction_id, rating, critique, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(id, interactionId, rating.rating, rating.critique ?? null, now)
    .run();

  // Update the interaction row with latest feedback
  await db
    .prepare(
      `UPDATE interactions SET feedback = ?, critique = ? WHERE id = ?`,
    )
    .bind(rating.rating, rating.critique ?? null, interactionId)
    .run();

  // If positive feedback, increment confirming_events on the matched rule
  if (rating.rating === 'up') {
    // Find the interaction to get the classification
    const interaction = await db
      .prepare('SELECT route_action, route_reason FROM interactions WHERE id = ?')
      .bind(interactionId)
      .first<{ route_action: string; route_reason: string | null }>();

    if (interaction?.route_reason) {
      // Extract rule name from reason string ("Static rule: code_generation")
      const ruleNameMatch = interaction.route_reason.match(/Static rule: (\w+)/);
      if (ruleNameMatch) {
        await db
          .prepare(
            `UPDATE routing_rules
             SET hit_count = hit_count + 1, confirming_events = confirming_events + 1
             WHERE name = ? AND source = 'static'`,
          )
          .bind(ruleNameMatch[1])
          .run();
      }
    }
  }

  return { id, createdAt: now };
}

// ─── Check if enough feedback to suggest a rule update ─────────────────────

/**
 * Check if there is enough feedback to warrant creating/updating a learned rule.
 */
export function shouldUpdateRule(feedbackCount: number): boolean {
  return feedbackCount >= FEEDBACK_THRESHOLD_FOR_RULE_CREATION;
}

/**
 * Check if a learned rule should auto-enable based on confirming events.
 */
export function shouldAutoEnable(confirmingEvents: number): boolean {
  return confirmingEvents >= CONFIRMING_EVENTS_FOR_AUTO_ENABLE;
}

// ─── Generate rule suggestion from feedback ────────────────────────────────

/**
 * Analyze feedback for a session and suggest routing rule changes.
 * Returns a candidate rule if there are enough positive signals.
 */
export async function generateRuleFromFeedback(
  db: D1Database,
  sessionId: string,
): Promise<{
  suggested: boolean;
  rule?: {
    name: string;
    pattern: string;
    action: string;
    confidence: number;
    positiveCount: number;
  };
  reason?: string;
}> {
  // Get interactions with positive feedback for this session
  const results = await db
    .prepare(
      `SELECT i.id, i.route_action, i.user_input, i.feedback
       FROM interactions i
       WHERE i.session_id = ? AND i.feedback = 'up'
       ORDER BY i.created_at DESC`,
    )
    .bind(sessionId)
    .all<{ id: string; route_action: string; user_input: string; feedback: string }>();

  const positiveInteractions = results.results ?? [];

  if (positiveInteractions.length < FEEDBACK_THRESHOLD_FOR_RULE_CREATION) {
    return {
      suggested: false,
      reason: `Only ${positiveInteractions.length} positive feedback events. Need ${FEEDBACK_THRESHOLD_FOR_RULE_CREATION}.`,
    };
  }

  // Find the most common route action among positive interactions
  const actionCounts: Record<string, number> = {};
  for (const interaction of positiveInteractions) {
    actionCounts[interaction.route_action] = (actionCounts[interaction.route_action] || 0) + 1;
  }

  // Find the dominant action
  let dominantAction = '';
  let maxCount = 0;
  for (const [action, count] of Object.entries(actionCounts)) {
    if (count > maxCount) {
      dominantAction = action;
      maxCount = count;
    }
  }

  if (!dominantAction) {
    return { suggested: false, reason: 'No dominant action found in feedback.' };
  }

  // Extract common words/patterns from positively-rated inputs
  const words: Record<string, number> = {};
  for (const interaction of positiveInteractions) {
    const tokens = interaction.user_input.toLowerCase().split(/\s+/);
    for (const token of tokens) {
      if (token.length > 3) {
        words[token] = (words[token] || 0) + 1;
      }
    }
  }

  // Find the top 3 most common meaningful words
  const sortedWords = Object.entries(words)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word]) => word);

  if (sortedWords.length === 0) {
    return { suggested: false, reason: 'Could not extract meaningful patterns from feedback.' };
  }

  const pattern = `(?i)\\b(${sortedWords.join('|')})\\b`;

  return {
    suggested: true,
    rule: {
      name: `learned_session_${sessionId.substring(0, 8)}`,
      pattern,
      action: dominantAction,
      confidence: Math.min(0.9, 0.5 + maxCount * 0.05),
      positiveCount: positiveInteractions.length,
    },
  };
}
