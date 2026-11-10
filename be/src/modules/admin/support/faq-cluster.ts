import { TicketCategory } from '@prisma/client';
import { normalizeVi } from '../../../common/text.util';

export interface ClusterTicket {
  id: string;
  subject: string;
  category: TicketCategory;
}

export interface TicketCluster {
  category: TicketCategory;
  seed: string;
  tickets: ClusterTicket[];
}

const STOPWORDS = new Set([
  'toi', 'minh', 'khong', 'cua', 'cho', 'the', 'nao', 'sao', 'khi', 'duoc', 'bi', 'va', 'la', 'co', 'voi',
  'nay', 'khac', 'can', 'muon', 'xin', 'hoi', 'giup', 'ban', 'em', 'anh', 'chi', 'dang', 'da', 'se', 'tai',
]);

export function subjectTokens(subject: string): Set<string> {
  const words = normalizeVi(subject).split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  return new Set(words);
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  return shared / (a.size + b.size - shared);
}

/** Greedy single-pass grouping: a ticket joins the first same-category cluster whose seed it resembles. */
export function clusterTickets(tickets: ClusterTicket[], opts: { threshold: number; minSize: number }): TicketCluster[] {
  const clusters: (TicketCluster & { seedTokens: Set<string> })[] = [];
  for (const t of tickets) {
    const tokens = subjectTokens(t.subject);
    if (!tokens.size) continue;
    const home = clusters.find((c) => c.category === t.category && jaccard(c.seedTokens, tokens) >= opts.threshold);
    if (home) home.tickets.push(t);
    else clusters.push({ category: t.category, seed: t.subject, seedTokens: tokens, tickets: [t] });
  }
  return clusters
    .filter((c) => c.tickets.length >= opts.minSize)
    .sort((a, b) => b.tickets.length - a.tickets.length)
    .map((c) => ({ category: c.category, seed: c.seed, tickets: c.tickets }));
}

export function isCoveredByFaq(seed: string, faqQuestions: string[], threshold: number): boolean {
  const tokens = subjectTokens(seed);
  return faqQuestions.some((q) => jaccard(tokens, subjectTokens(q)) >= threshold);
}
