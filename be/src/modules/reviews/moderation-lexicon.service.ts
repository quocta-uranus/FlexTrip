import { Injectable, Logger } from '@nestjs/common';
import { ModerationTermCategory } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BUILT_IN_TERMS, type LexiconTerms } from './review-moderation.lexicon';
import {
  BUILT_IN_LEXICON,
  compileLexicon,
  type CompiledLexicon,
} from './review-moderation.rules';

const REFRESH_AFTER_MS = 60_000;

const CATEGORY_KEY: Record<ModerationTermCategory, keyof LexiconTerms> = {
  PROFANITY: 'profanity',
  INSULT: 'insults',
  THREAT: 'threats',
};

export function normalizeTerm(term: string) {
  return term
    .normalize('NFKC')
    .toLocaleLowerCase('vi-VN')
    .replace(/\s+/gu, ' ')
    .trim();
}

export function builtInTermsByCategory() {
  const seen = new Set<string>();
  return (
    Object.entries(CATEGORY_KEY) as [
      ModerationTermCategory,
      keyof LexiconTerms,
    ][]
  )
    .flatMap(([category, key]) =>
      BUILT_IN_TERMS[key].map((term) => ({ term, category })),
    )
    .filter(({ term, category }) => {
      const id = `${category}:${normalizeTerm(term)}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
}

/**
 * The review filter dictionary: built-in terms, minus those an admin switched off,
 * plus those an admin added. Compiled once and kept in memory; an admin change
 * invalidates it at once and other instances pick it up within a minute.
 */
@Injectable()
export class ModerationLexiconService {
  private readonly logger = new Logger(ModerationLexiconService.name);
  private cache: { lexicon: CompiledLexicon; loadedAt: number } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  invalidate() {
    this.cache = null;
  }

  async current(): Promise<CompiledLexicon> {
    if (this.cache && Date.now() - this.cache.loadedAt < REFRESH_AFTER_MS)
      return this.cache.lexicon;
    try {
      const lexicon = compileLexicon(await this.effectiveTerms());
      this.cache = { lexicon, loadedAt: Date.now() };
      return lexicon;
    } catch {
      // A dictionary read must never block posting a review; fall back to the built-in list.
      this.logger.error('Could not load the moderation dictionary');
      return this.cache?.lexicon ?? BUILT_IN_LEXICON;
    }
  }

  async effectiveTerms(): Promise<LexiconTerms> {
    const rows = await this.prisma.moderationTerm.findMany({
      select: { term: true, category: true, disabled: true },
    });
    const disabled = new Set(
      rows.filter((row) => row.disabled).map((row) => normalizeTerm(row.term)),
    );
    const terms: LexiconTerms = {
      profanity: [],
      insults: [],
      threats: [],
    };
    for (const { term, category } of builtInTermsByCategory())
      if (!disabled.has(normalizeTerm(term)))
        terms[CATEGORY_KEY[category]].push(term);
    for (const row of rows)
      if (!row.disabled) terms[CATEGORY_KEY[row.category]].push(row.term);
    return terms;
  }
}
