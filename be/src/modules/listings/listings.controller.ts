import {
  Body, Controller, Delete, Get, HttpCode, Param, Patch, Post,
  Query, Req, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import * as XLSX from 'xlsx';
import { ListingsService } from './listings.service';
import {
  CreateListingDto, UpdateListingDto, FlagListingDto,
  AiSuggestDto, AiDescriptionDto, AiOptimizeDto, AiQualityDto,
} from './listings.dto';
import { AccessTokenGuard, AuthenticatedRequest } from '../auth/guards/access-token.guard';

@ApiTags('listings')
@Controller('listings')
export class ListingsController {
  constructor(private readonly svc: ListingsService) {}

  // ─── Public ───────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Public: list active listings' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'keyword', required: false })
  @ApiQuery({ name: 'location', required: false })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('keyword') keyword?: string,
    @Query('location') location?: string,
  ) {
    return this.svc.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      category,
      keyword,
      location,
    });
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Provider: my listings' })
  findMine(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.findMyListings(req.authUserId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Public: single listing detail' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  // ─── Provider CRUD ────────────────────────────────────────────────────────

  @Post()
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'LIST-01: Create listing' })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateListingDto) {
    return this.svc.create(req.authUserId, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'LIST-01: Update listing' })
  update(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateListingDto,
  ) {
    return this.svc.update(id, req.authUserId, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'LIST-01: Delete listing' })
  async remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    await this.svc.remove(id, req.authUserId);
  }

  @Post(':id/flags')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'ADMIN-03: Người dùng báo cáo vi phạm tin đăng' })
  flag(@Param('id') id: string, @Body() dto: FlagListingDto, @Req() req: AuthenticatedRequest) {
    return this.svc.flag(id, req.authUserId, dto);
  }

  @Patch(':id/publish')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'LIST-01: Publish draft → ACTIVE' })
  publish(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.svc.publish(id, req.authUserId);
  }

  @Patch(':id/pause')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'LIST-06: Pause listing (ACTIVE → INACTIVE)' })
  pause(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.svc.pause(id, req.authUserId);
  }

  @Patch(':id/resume')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'LIST-06: Resume listing (INACTIVE → ACTIVE)' })
  resume(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.svc.resume(id, req.authUserId);
  }

  // ─── Image Upload ─────────────────────────────────────────────────────────

  @Post('upload-image')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload một ảnh lên Supabase, trả về URL' })
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('No file uploaded');
    return this.svc.uploadImage(file);
  }

  @Delete('delete-image')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Xoá ảnh khỏi Supabase' })
  deleteImage(@Body('url') url: string) {
    return this.svc.deleteImage(url);
  }

  // ─── Bulk Upload LIST-02 ──────────────────────────────────────────────────

  @Post('bulk-upload')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'LIST-02: Bulk upload via CSV/Excel' })
  async bulkUpload(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new Error('No file uploaded');
    const wb = XLSX.read(file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

    const dtos: CreateListingDto[] = rows
      .filter((r) => r['title'] && r['price'] && r['location'] && r['category'])
      .map((r) => ({
        title: String(r['title']),
        description: String(r['description'] ?? r['title']),
        price: Number(r['price']),
        currency: String(r['currency'] ?? 'VND'),
        location: String(r['location']),
        category: String(r['category']) as any,
        amenities: r['amenities'] ? String(r['amenities']).split('|').map((s) => s.trim()) : [],
        imageUrls: r['imageUrls'] ? String(r['imageUrls']).split('|').map((s) => s.trim()) : ['https://placehold.co/800x600?text=No+Image'],
      }));

    return this.svc.bulkCreate(req.authUserId, dtos);
  }

  // ─── AI Features ─────────────────────────────────────────────────────────

  @Post('ai/suggest-category')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'LIST-03: AI auto-tag & category suggestion' })
  aiSuggest(@Body() dto: AiSuggestDto) {
    return this.svc.aiSuggestCategory(dto);
  }

  @Post('ai/generate-description')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'LIST-04: AI generate product description' })
  aiGenerate(@Body() dto: AiDescriptionDto) {
    return this.svc.aiGenerateDescription(dto);
  }

  @Post('ai/optimize-description')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'LIST-07: AI copywriting optimization' })
  aiOptimize(@Body() dto: AiOptimizeDto) {
    return this.svc.aiOptimizeDescription(dto);
  }

  @Post('ai/quality-score')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'LIST-05: AI listing quality score' })
  aiQuality(@Body() dto: AiQualityDto) {
    return this.svc.aiQualityScore(dto);
  }
}
