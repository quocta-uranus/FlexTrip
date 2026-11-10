import { Body, Controller, HttpCode, HttpException, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ParseSearchDto } from './ai-search.dto';
import { AiSearchService } from './ai-search.service';

@ApiTags('AI search')
@Controller('ai-search')
export class AiSearchController {
  constructor(private readonly svc: AiSearchService) {}

  @Post('parse')
  @HttpCode(200)
  @ApiOperation({ summary: 'Chuyển câu tìm kiếm tự nhiên thành bộ lọc listing' })
  parse(@Body() dto: ParseSearchDto, @Req() req: Request) {
    // Behind the VPS reverse proxy req.ip is the proxy itself, so key on the forwarded client IP
    const forwarded = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
    if (!this.svc.allow(forwarded || req.ip || req.socket.remoteAddress || 'unknown')) {
      throw new HttpException('Bạn tìm kiếm AI quá nhanh, vui lòng thử lại sau ít phút.', HttpStatus.TOO_MANY_REQUESTS);
    }
    return this.svc.parse(dto.query);
  }
}
