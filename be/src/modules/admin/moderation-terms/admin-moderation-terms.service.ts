import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RequestContext } from '../../../common/request-context';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import {
  builtInTermsByCategory,
  ModerationLexiconService,
  normalizeTerm,
} from '../../reviews/moderation-lexicon.service';
import { SAFE_PHRASES } from '../../reviews/review-moderation.lexicon';
import {
  compileLexicon,
  moderateReviewWithRules,
} from '../../reviews/review-moderation.rules';
import {
  AddModerationTermDto,
  ToggleBuiltInTermDto,
} from './dto/moderation-terms.dto';

const MIN_LETTERS = 3;

@Injectable()
export class AdminModerationTermsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly lexicon: ModerationLexiconService,
  ) {}

  async list() {
    const rows = await this.prisma.moderationTerm.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const disabled = new Set(
      rows.filter((row) => row.disabled).map((row) => normalizeTerm(row.term)),
    );
    return {
      custom: rows
        .filter((row) => !row.disabled)
        .map(({ id, term, category, createdAt }) => ({
          id,
          term,
          category,
          createdAt,
        })),
      builtIn: builtInTermsByCategory().map(({ term, category }) => ({
        term,
        category,
        disabled: disabled.has(normalizeTerm(term)),
      })),
    };
  }

  async add(dto: AddModerationTermDto, ctx: RequestContext) {
    const term = this.validatedTerm(dto.term);
    const existing = await this.prisma.moderationTerm.findUnique({
      where: { term },
    });
    if (existing?.disabled)
      throw new ConflictException({
        code: 'TERM_BUILT_IN_DISABLED',
        message: 'Đây là từ có sẵn đang bị tắt. Hãy bật lại thay vì thêm mới.',
      });
    const effective = await this.lexicon.effectiveTerms();
    const taken = [
      ...effective.profanity,
      ...effective.insults,
      ...effective.threats,
    ].some((known) => normalizeTerm(known) === term);
    if (existing || taken)
      throw new ConflictException({
        code: 'TERM_EXISTS',
        message: 'Từ này đã có trong từ điển.',
      });
    this.assertNotMatchingSafePhrase(term);

    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.moderationTerm.create({
        data: { term, category: dto.category, createdById: ctx.actorId },
      });
      await this.audit.log(tx, ctx, {
        action: 'MODERATION_TERM_ADDED',
        entityType: 'ModerationTerm',
        entityId: row.id,
        after: { term, category: dto.category },
      });
      return row;
    });
    this.lexicon.invalidate();
    return {
      id: created.id,
      term: created.term,
      category: created.category,
      createdAt: created.createdAt,
    };
  }

  async remove(id: string, ctx: RequestContext) {
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.moderationTerm.findUnique({ where: { id } });
      if (!row || row.disabled)
        throw new NotFoundException('Không tìm thấy từ do admin thêm');
      await tx.moderationTerm.delete({ where: { id } });
      await this.audit.log(tx, ctx, {
        action: 'MODERATION_TERM_REMOVED',
        entityType: 'ModerationTerm',
        entityId: id,
        before: { term: row.term, category: row.category },
      });
    });
    this.lexicon.invalidate();
    return { id };
  }

  async setBuiltInDisabled(dto: ToggleBuiltInTermDto, ctx: RequestContext) {
    const term = normalizeTerm(dto.term);
    const builtIn = builtInTermsByCategory().find(
      (entry) =>
        normalizeTerm(entry.term) === term && entry.category === dto.category,
    );
    if (!builtIn)
      throw new NotFoundException('Không có từ có sẵn này trong từ điển');
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.moderationTerm.findUnique({ where: { term } });
      const isDisabled = current?.disabled === true;
      if (isDisabled === dto.disabled) return;
      if (dto.disabled)
        await tx.moderationTerm.upsert({
          where: { term },
          create: {
            term,
            category: dto.category,
            disabled: true,
            createdById: ctx.actorId,
          },
          update: { disabled: true },
        });
      else await tx.moderationTerm.delete({ where: { term } });
      await this.audit.log(tx, ctx, {
        action: dto.disabled
          ? 'MODERATION_TERM_DISABLED'
          : 'MODERATION_TERM_ENABLED',
        entityType: 'ModerationTerm',
        entityId: term,
        after: { term, category: dto.category },
      });
    });
    this.lexicon.invalidate();
    return { term, category: dto.category, disabled: dto.disabled };
  }

  /** Dry run against the live dictionary; stores nothing. */
  async test(text: string) {
    return moderateReviewWithRules(text, await this.lexicon.current());
  }

  private validatedTerm(raw: string) {
    const term = normalizeTerm(raw);
    const letters = [...term].filter((char) => /[\p{L}\p{N}]/u.test(char));
    if (letters.length < MIN_LETTERS)
      throw new BadRequestException({
        code: 'TERM_TOO_SHORT',
        message: `Từ phải có ít nhất ${MIN_LETTERS} chữ cái hoặc chữ số.`,
      });
    if (/[^\p{L}\p{N}\s]/u.test(term))
      throw new BadRequestException({
        code: 'TERM_INVALID_CHARACTERS',
        message: 'Từ chỉ được gồm chữ, số và khoảng trắng.',
      });
    return term;
  }

  private assertNotMatchingSafePhrase(term: string) {
    const only = compileLexicon({
      profanity: [term],
      insults: [],
      threats: [],
    });
    const phrase = SAFE_PHRASES.find(
      (candidate) => moderateReviewWithRules(candidate, only).flagged,
    );
    if (phrase)
      throw new BadRequestException({
        code: 'TERM_MATCHES_SAFE_PHRASE',
        message: `Từ này sẽ chặn nhầm câu bình thường: "${phrase}"`,
      });
  }
}
